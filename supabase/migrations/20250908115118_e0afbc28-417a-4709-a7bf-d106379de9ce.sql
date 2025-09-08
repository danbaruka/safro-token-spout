-- Optimize user_requests lookups for rate limiting
CREATE INDEX IF NOT EXISTS idx_user_requests_ip_ts ON public.user_requests (ip_address, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_requests_receiver_ts ON public.user_requests (receiver_address, request_timestamp DESC);