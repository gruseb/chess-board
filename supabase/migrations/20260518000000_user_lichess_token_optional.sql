-- Make api_token optional so users can sync public games with only a username.
alter table public.user_lichess
	alter column api_token drop not null;
