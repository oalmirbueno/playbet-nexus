UPDATE public.platform_accounts
SET account_external_id = '397052',
    notes = COALESCE(notes || E'\n', '') || 'Label Smartico/TAP compartilhado: 397052. Atribuição via postback (URL segmenta por plataforma). Pull desativado — sem API key.',
    updated_at = now()
WHERE id IN (
  '20d529c1-0ee4-48fa-abaa-7b47f18de1c3', -- Estrela Bet · Principal
  'f2845ac8-3c1c-4d50-830b-ff5e98b7ebbd'  -- VUPI · Principal
);