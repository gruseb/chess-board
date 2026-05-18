alter table public.partie
	add column if not exists user_id uuid references auth.users(id);

alter table public.position
	add column if not exists user_id uuid references auth.users(id);

alter table public.wrong_tactics
	add column if not exists user_id uuid references auth.users(id);

alter table public.partie
	alter column user_id set default auth.uid();

alter table public.position
	alter column user_id set default auth.uid();

alter table public.wrong_tactics
	alter column user_id set default auth.uid();

alter table public.position drop constraint if exists position_fen_key;
alter table public.wrong_tactics drop constraint if exists wrong_tactics_puzzle_id_key;
alter table public.partie drop constraint if exists partie_external_id_key;

alter table public.position
	add constraint position_user_fen_key unique (user_id, fen);

alter table public.wrong_tactics
	add constraint wrong_tactics_user_puzzle_key unique (user_id, puzzle_id);

alter table public.partie
	add constraint partie_user_external_key unique (user_id, external_id);

create index if not exists partie_user_id_idx on public.partie(user_id);
create index if not exists position_user_id_idx on public.position(user_id);
create index if not exists wrong_tactics_user_id_idx on public.wrong_tactics(user_id);

drop policy if exists "Jeder kann Partien speichern" on public.partie;
drop policy if exists "Jeder kann Partien aktualisieren" on public.partie;
drop policy if exists "Jeder kann Partien löschen" on public.partie;
drop policy if exists "Jeder kann Partien lesen" on public.partie;

drop policy if exists "Jeder kann Positionen speichern" on public.position;
drop policy if exists "Jeder kann Positionen aktualisieren" on public.position;
drop policy if exists "Jeder kann Positionen löschen" on public.position;
drop policy if exists "Jeder kann Positionen lesen" on public.position;

drop policy if exists "Jeder kann falsche Taktiken lesen" on public.wrong_tactics;
drop policy if exists "Jeder kann falsche Taktiken speichern" on public.wrong_tactics;
drop policy if exists "Jeder kann falsche Taktiken aktualisieren" on public.wrong_tactics;
drop policy if exists "Jeder kann falsche Taktiken loeschen" on public.wrong_tactics;

create policy "Users can read own partie"
	on public.partie
	for select
	using (auth.uid() = user_id);

create policy "Users can insert own partie"
	on public.partie
	for insert
	with check (auth.uid() = user_id);

create policy "Users can update own partie"
	on public.partie
	for update
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);

create policy "Users can delete own partie"
	on public.partie
	for delete
	using (auth.uid() = user_id);

create policy "Users can read own position"
	on public.position
	for select
	using (auth.uid() = user_id);

create policy "Users can insert own position"
	on public.position
	for insert
	with check (auth.uid() = user_id);

create policy "Users can update own position"
	on public.position
	for update
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);

create policy "Users can delete own position"
	on public.position
	for delete
	using (auth.uid() = user_id);

create policy "Users can read own wrong tactics"
	on public.wrong_tactics
	for select
	using (auth.uid() = user_id);

create policy "Users can insert own wrong tactics"
	on public.wrong_tactics
	for insert
	with check (auth.uid() = user_id);

create policy "Users can update own wrong tactics"
	on public.wrong_tactics
	for update
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);

create policy "Users can delete own wrong tactics"
	on public.wrong_tactics
	for delete
	using (auth.uid() = user_id);