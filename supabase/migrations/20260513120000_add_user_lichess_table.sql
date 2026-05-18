create table if not exists public.user_lichess (
	user_id uuid primary key references auth.users(id) on delete cascade,
	created_at timestamptz not null default timezone('utc'::text, now()),
	lichess_username text not null,
	api_token text not null
);

alter table public.user_lichess enable row level security;

create policy "Users can read own lichess config"
	on public.user_lichess
	for select
	using (auth.uid() = user_id);

create policy "Users can insert own lichess config"
	on public.user_lichess
	for insert
	with check (auth.uid() = user_id);

create policy "Users can update own lichess config"
	on public.user_lichess
	for update
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);

create policy "Users can delete own lichess config"
	on public.user_lichess
	for delete
	using (auth.uid() = user_id);