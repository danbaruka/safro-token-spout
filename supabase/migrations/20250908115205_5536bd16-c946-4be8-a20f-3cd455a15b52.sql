-- Fix the search path for the existing function
ALTER FUNCTION public.set_updated_at() SET search_path = public;