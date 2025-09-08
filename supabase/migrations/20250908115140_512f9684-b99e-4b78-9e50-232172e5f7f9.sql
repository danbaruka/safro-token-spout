-- Enable RLS on user_requests table for security
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts from the edge function (no restrictions for logging)
CREATE POLICY "Allow inserts for request logging" 
ON public.user_requests 
FOR INSERT 
WITH CHECK (true);

-- Optionally, restrict read access if needed (currently allowing all reads for analytics)
CREATE POLICY "Allow all reads for analytics" 
ON public.user_requests 
FOR SELECT 
USING (true);