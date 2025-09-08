-- Update the faucet daily request limit to 3 on the latest config row
UPDATE public.safro_faucet_config
SET requests_limit_per_day = 3,
    updated_at = now()
WHERE id = (
  SELECT id FROM public.safro_faucet_config ORDER BY id DESC LIMIT 1
);

-- Verify (no-op select for logs)
-- SELECT id, requests_limit_per_day FROM public.safro_faucet_config ORDER BY id DESC LIMIT 1;