# Supabase Security & Database Rules
- **Row Level Security (RLS)**: Every new table MUST have RLS enabled.
- **Policies**: Define policies so users can only `SELECT`, `INSERT`, `UPDATE`, or `DELETE` their own data (using `auth.uid()`).
- **Migrations**: Always use the `apply_migration` tool for schema changes.
- **Client Side**: Use the helper `supabaseClient.ts` for all database interactions.
