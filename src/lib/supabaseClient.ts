import { createClient } from '@supabase/supabase-js';

// These are PUBLIC values by design - the anon key is intentionally exposed to browsers.
// Using them directly as reliable fallbacks ensures the app always works,
// even if the build environment variables are not properly injected.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? 'https://ifdlaesktiljzuvqeaoj.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGxhZXNrdGlsanp1dnFlYW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDA2MjAsImV4cCI6MjA5MTIxNjYyMH0.FlNNPt0ety4Sdsqr5Wbdl8IGjUqfT2rABl4xHdIMIeo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage
    }
});
