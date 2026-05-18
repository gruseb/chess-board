-- Migration: Add Lichess study columns to public.position table
ALTER TABLE public.position
ADD COLUMN IF NOT EXISTS study_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS study_title text DEFAULT NULL;
