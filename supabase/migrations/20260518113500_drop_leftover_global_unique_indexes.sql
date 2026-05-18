-- Drop legacy global unique constraints that conflict with user-scoped composite constraints
ALTER TABLE public.partie DROP CONSTRAINT IF EXISTS partie_external_id_unique;
ALTER TABLE public.position DROP CONSTRAINT IF EXISTS position_fen_unique;
