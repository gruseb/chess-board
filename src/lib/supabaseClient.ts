import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Always create a client instance to avoid null reference errors (e.g., "Cannot read properties of null (reading 'from')")
// If keys are missing, the requests will simply fail instead of crashing the whole application.
export const supabase = createClient(
    PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co', 
    PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);
