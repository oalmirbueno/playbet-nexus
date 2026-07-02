
create or replace function public.lp_opp_slugify(txt text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
           regexp_replace(
             lower(translate(coalesce(txt,''),
               'áàâãäåÁÀÂÃÄÅéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
               'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN')),
             '[^a-z0-9]+', '-', 'g'
           ),
           '(^-+|-+$)', '', 'g'
         );
$$;

create or replace function public.lp_opportunities_autofill()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_icon text;
  v_name text;
  v_media jsonb;
begin
  v_media := coalesce(new.metadata, '{}'::jsonb) -> 'media';
  if (v_media is null) or coalesce(v_media->>'image_url','') = '' then
    v_slug := public.lp_opp_slugify(coalesce(new.event_name, new.title));
    if v_slug <> '' then
      select icon_url, game_name
        into v_icon, v_name
        from public.platform_hyped_games
       where icon_url is not null
         and (game_slug = v_slug or public.lp_opp_slugify(game_name) = v_slug)
       order by (case when new.platform_id is not null and platform_id = new.platform_id then 0 else 1 end),
                updated_at desc nulls last
       limit 1;

      if v_icon is not null then
        new.metadata := jsonb_set(
          coalesce(new.metadata, '{}'::jsonb),
          '{media}',
          jsonb_build_object(
            'image_url', v_icon,
            'image_alt', coalesce(v_name, new.title),
            'media_type', 'image',
            'source_label', 'Catálogo oficial',
            'source_url', null,
            'auto_filled', true
          ),
          true
        );
        if new.game_thumb_url is null then
          new.game_thumb_url := v_icon;
        end if;
      end if;
    end if;
  end if;

  if new.is_active is true and new.destination_url is not null then
    update public.lp_opportunities
       set is_active = false,
           updated_at = now()
     where id <> new.id
       and is_active = true
       and destination_url = new.destination_url
       and landing_page_id is not distinct from new.landing_page_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lp_opportunities_autofill on public.lp_opportunities;
create trigger trg_lp_opportunities_autofill
before insert or update on public.lp_opportunities
for each row execute function public.lp_opportunities_autofill();

-- Backfill: preenche arte faltante usando subquery correlacionada.
update public.lp_opportunities opp
   set metadata = jsonb_set(
                    coalesce(opp.metadata, '{}'::jsonb),
                    '{media}',
                    jsonb_build_object(
                      'image_url', (
                        select icon_url from public.platform_hyped_games
                         where icon_url is not null
                           and public.lp_opp_slugify(game_name) = public.lp_opp_slugify(coalesce(opp.event_name, opp.title))
                         order by updated_at desc nulls last limit 1
                      ),
                      'image_alt', coalesce((
                        select game_name from public.platform_hyped_games
                         where icon_url is not null
                           and public.lp_opp_slugify(game_name) = public.lp_opp_slugify(coalesce(opp.event_name, opp.title))
                         order by updated_at desc nulls last limit 1
                      ), opp.title),
                      'media_type', 'image',
                      'source_label', 'Catálogo oficial',
                      'source_url', null,
                      'auto_filled', true
                    ),
                    true
                  ),
       game_thumb_url = coalesce(opp.game_thumb_url, (
         select icon_url from public.platform_hyped_games
          where icon_url is not null
            and public.lp_opp_slugify(game_name) = public.lp_opp_slugify(coalesce(opp.event_name, opp.title))
          order by updated_at desc nulls last limit 1
       )),
       updated_at = now()
 where (opp.metadata is null
        or opp.metadata->'media' is null
        or coalesce(opp.metadata->'media'->>'image_url','') = '')
   and exists (
     select 1 from public.platform_hyped_games
      where icon_url is not null
        and public.lp_opp_slugify(game_name) = public.lp_opp_slugify(coalesce(opp.event_name, opp.title))
   );

-- Consolida duplicatas atuais: mantém a mais recente ativa por (landing_page_id, destination_url).
with ranked as (
  select id,
         row_number() over (
           partition by coalesce(landing_page_id::text,'__null__'), destination_url
           order by created_at desc
         ) as rn
    from public.lp_opportunities
   where is_active = true
     and destination_url is not null
)
update public.lp_opportunities
   set is_active = false,
       updated_at = now()
 where id in (select id from ranked where rn > 1);
