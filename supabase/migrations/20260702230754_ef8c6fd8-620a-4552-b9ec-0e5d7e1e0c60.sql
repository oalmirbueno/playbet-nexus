
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
  v_title_slug text;
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

  v_title_slug := public.lp_opp_slugify(coalesce(new.event_name, new.title));

  if new.is_active is true then
    update public.lp_opportunities
       set is_active = false,
           updated_at = now()
     where id <> new.id
       and is_active = true
       and landing_page_id is not distinct from new.landing_page_id
       and (
         (new.destination_url is not null and destination_url = new.destination_url)
         or (v_title_slug <> '' and public.lp_opp_slugify(coalesce(event_name, title)) = v_title_slug)
       );
  end if;

  return new;
end;
$$;

-- Consolida duplicatas atuais por slug do jogo.
with ranked as (
  select id,
         row_number() over (
           partition by coalesce(landing_page_id::text,'__null__'),
                        public.lp_opp_slugify(coalesce(event_name, title))
           order by created_at desc
         ) as rn
    from public.lp_opportunities
   where is_active = true
     and coalesce(event_name, title) is not null
)
update public.lp_opportunities
   set is_active = false,
       updated_at = now()
 where id in (select id from ranked where rn > 1);
