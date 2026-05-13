create table if not exists public.wrong_tactics (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default timezone('utc'::text, now()),
	last_failed_at timestamptz not null default timezone('utc'::text, now()),
	puzzle_id text not null unique,
	rating integer not null,
	topics text[] not null default '{}',
	fen text not null,
	moves text[] not null,
	color_to_move text not null check (color_to_move = any (array['white'::text, 'black'::text])),
	position_id uuid references public.position(id) on delete set null
);

alter table public.wrong_tactics enable row level security;

create policy "Jeder kann falsche Taktiken lesen"
	on public.wrong_tactics
	for select
	using (true);

create policy "Jeder kann falsche Taktiken speichern"
	on public.wrong_tactics
	for insert
	with check (true);

create policy "Jeder kann falsche Taktiken aktualisieren"
	on public.wrong_tactics
	for update
	using (true)
	with check (true);

create policy "Jeder kann falsche Taktiken loeschen"
	on public.wrong_tactics
	for delete
	using (true);

create index if not exists wrong_tactics_last_failed_at_idx
	on public.wrong_tactics (last_failed_at desc);

create index if not exists wrong_tactics_rating_idx
	on public.wrong_tactics (rating);