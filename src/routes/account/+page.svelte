<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { User } from '@supabase/supabase-js';

	let email = $state('');
	let password = $state('');
	let user = $state<User | null>(null);
	let authError = $state<string | null>(null);
	let authMessage = $state<string | null>(null);
	let isLoading = $state(false);

	let deleteConfirm = $state('');
	let deleteError = $state<string | null>(null);
	let deleteMessage = $state<string | null>(null);

	let lichessUsername = $state('');
	let lichessToken = $state('');
	let lichessMessage = $state<string | null>(null);
	let lichessError = $state<string | null>(null);
	let lastLoadedUserId = $state<string | null>(null);

	async function refreshSession() {
		const { data } = await supabase.auth.getSession();
		user = data.session?.user ?? null;
	}

	async function loadLichessConfig() {
		if (!user) return;
		const { data, error } = await supabase
			.from('user_lichess')
			.select('lichess_username')
			.eq('user_id', user.id)
			.maybeSingle();

		if (error) {
			return;
		}

		if (data?.lichess_username) {
			lichessUsername = data.lichess_username;
		}
	}

	onMount(() => {
		void refreshSession();
		const { data: subscription } = supabase.auth.onAuthStateChange(() => {
			void refreshSession();
		});
		return () => subscription.subscription.unsubscribe();
	});

	$effect(() => {
		if (!user || user.id === lastLoadedUserId) {
			return;
		}
		lastLoadedUserId = user.id;
		void loadLichessConfig();
	});

	async function signUp() {
		authError = null;
		authMessage = null;
		isLoading = true;
		const { data, error } = await supabase.auth.signUp({ email, password });
		isLoading = false;

		if (error) {
			authError = error.message;
			return;
		}

		if (!data.session) {
			authMessage = 'Registrierung erfolgreich. Bitte bestaetige deine E-Mail.';
		} else {
			authMessage = 'Registriert und eingeloggt.';
		}
		await refreshSession();
	}

	async function signIn() {
		authError = null;
		authMessage = null;
		isLoading = true;
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		isLoading = false;

		if (error) {
			authError = error.message;
			return;
		}

		authMessage = 'Erfolgreich eingeloggt.';
		await refreshSession();
	}

	async function signOut() {
		await supabase.auth.signOut();
		authMessage = 'Ausgeloggt.';
		await refreshSession();
	}

	async function deleteAccount() {
		deleteError = null;
		deleteMessage = null;

		if (deleteConfirm.trim().toUpperCase() !== 'DELETE') {
			deleteError = 'Bitte tippe DELETE, um dein Konto zu loeschen.';
			return;
		}

		const { error } = await supabase.functions.invoke('delete-account');
		if (error) {
			deleteError = error.message;
			return;
		}

		deleteMessage = 'Dein Account wurde geloescht.';
		deleteConfirm = '';
		await supabase.auth.signOut();
		await refreshSession();
	}

	async function saveLichessConfig() {
		lichessError = null;
		lichessMessage = null;
		if (!user) {
			lichessError = 'Bitte zuerst einloggen.';
			return;
		}
		if (!lichessUsername) {
			lichessError = 'Bitte Username angeben.';
			return;
		}

		const payload: { user_id: string; lichess_username: string; api_token?: string | null } = {
			user_id: user.id,
			lichess_username: lichessUsername.trim()
		};
		if (lichessToken.trim().length > 0) {
			payload.api_token = lichessToken.trim();
		} else {
			payload.api_token = null;
		}

		const { error } = await supabase.from('user_lichess').upsert(payload);

		if (error) {
			lichessError = error.message;
			return;
		}

		lichessMessage = 'Lichess-Verknuepfung gespeichert.';
		lichessToken = '';
	}
</script>

<svelte:head>
	<title>Account | The Ethereal Grandmaster</title>
</svelte:head>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6 lg:p-12">
	<section class="space-y-2">
		<h1 class="font-['Epilogue'] text-4xl font-bold tracking-tight text-on-surface">Account</h1>
		<p class="max-w-2xl text-sm text-on-surface-variant">
			Registriere dich oder logge dich ein. Du kannst deinen Account jederzeit loeschen.
		</p>
	</section>

	<section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
		{#if !user}
			<div
				class="space-y-6 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 shadow-xl"
			>
				<h2 class="text-lg font-bold text-secondary">Login & Registrierung</h2>
				<div class="grid gap-4">
					<label class="space-y-2 text-sm">
						<span class="font-semibold text-on-surface">E-Mail</span>
						<input
							class="w-full rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3 py-2 text-on-surface"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
						/>
					</label>
					<label class="space-y-2 text-sm">
						<span class="font-semibold text-on-surface">Passwort</span>
						<input
							class="w-full rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3 py-2 text-on-surface"
							type="password"
							placeholder="********"
							bind:value={password}
						/>
					</label>
				</div>

				<div class="flex flex-wrap gap-3">
					<button
						class="rounded-xl bg-primary px-4 py-2 font-bold text-on-primary-container shadow-lg shadow-primary/20 transition-all hover:bg-primary-container disabled:opacity-50"
						onclick={signIn}
						disabled={isLoading || !email || !password}
					>
						Einloggen
					</button>
					<button
						class="rounded-xl border border-outline-variant/30 px-4 py-2 font-bold text-on-surface transition-all hover:border-primary/40 hover:text-primary disabled:opacity-50"
						onclick={signUp}
						disabled={isLoading || !email || !password}
					>
						Registrieren
					</button>
				</div>

				{#if authError}
					<p class="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
						{authError}
					</p>
				{:else if authMessage}
					<p
						class="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
					>
						{authMessage}
					</p>
				{/if}
			</div>
		{:else}
			<div
				class="space-y-3 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 text-sm text-on-surface-variant shadow-xl"
			>
				<h2 class="text-lg font-bold text-secondary">Login & Registrierung</h2>
				<p>Du bist bereits eingeloggt. Login und Registrierung sind ausgeblendet.</p>
			</div>
		{/if}

		<div
			class="space-y-6 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 shadow-xl"
		>
			<h2 class="text-lg font-bold text-secondary">Dein Status</h2>
			{#if user}
				<div class="space-y-3 text-sm text-on-surface-variant">
					<p>Eingeloggt als <span class="font-semibold text-on-surface">{user.email}</span></p>
					<button
						class="rounded-xl border border-outline-variant/30 px-4 py-2 font-bold text-on-surface transition-all hover:border-secondary/40 hover:text-secondary"
						onclick={signOut}
					>
						Ausloggen
					</button>
				</div>
			{:else}
				<p class="text-sm text-on-surface-variant">Du bist aktuell nicht eingeloggt.</p>
			{/if}
		</div>
	</section>

	<section class="rounded-3xl border border-error/20 bg-surface-container-low p-6 shadow-xl">
		<h2 class="text-lg font-bold text-error">Account loeschen</h2>
		<p class="mt-2 text-sm text-on-surface-variant">
			Dieser Vorgang ist nicht rueckgaengig. Alle Auth-Daten werden entfernt.
		</p>
		<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
			<input
				class="w-full rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3 py-2 text-on-surface"
				type="text"
				placeholder="Tippe DELETE"
				bind:value={deleteConfirm}
			/>
			<button
				class="rounded-xl bg-error px-4 py-2 font-bold text-on-error-container shadow-lg shadow-error/20 transition-all disabled:opacity-50"
				onclick={deleteAccount}
				disabled={!user}
			>
				Account loeschen
			</button>
		</div>
		{#if deleteError}
			<p class="mt-3 rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
				{deleteError}
			</p>
		{:else if deleteMessage}
			<p
				class="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
			>
				{deleteMessage}
			</p>
		{/if}
	</section>

	<section
		class="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 shadow-xl"
	>
		<h2 class="text-lg font-bold text-secondary">Lichess verbinden</h2>
		<p class="mt-2 text-sm text-on-surface-variant">
			Lege deinen Lichess Username fest, damit deine oeffentlichen Partien synchronisiert werden. Der
			API-Token ist optional und nur fuer private Partien noetig.
		</p>
		<div class="mt-4 grid gap-4">
			<label class="space-y-2 text-sm">
				<span class="font-semibold text-on-surface">Lichess Username</span>
				<input
					class="w-full rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3 py-2 text-on-surface"
					placeholder="sebastianflorian2000"
					bind:value={lichessUsername}
					disabled={!user}
				/>
			</label>
			<label class="space-y-2 text-sm">
				<span class="font-semibold text-on-surface">API Token (optional)</span>
				<input
					class="w-full rounded-xl border border-outline-variant/20 bg-surface-container-highest px-3 py-2 text-on-surface"
					type="password"
					placeholder="lichess-api-token"
					bind:value={lichessToken}
					disabled={!user}
				/>
			</label>
			<button
				class="w-fit rounded-xl bg-secondary px-4 py-2 font-bold text-on-secondary-container shadow-lg shadow-secondary/20 transition-all disabled:opacity-50"
				onclick={saveLichessConfig}
				disabled={!user}
			>
				Speichern
			</button>
		</div>
		{#if lichessError}
			<p class="mt-3 rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
				{lichessError}
			</p>
		{:else if lichessMessage}
			<p
				class="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
			>
				{lichessMessage}
			</p>
		{/if}
	</section>
</main>
