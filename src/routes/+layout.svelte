<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	let { children } = $props();
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { supabase } from '$lib/supabaseClient';
	import type { User } from '@supabase/supabase-js';

	type ThemeId = 'halloween' | 'plain';
	const themes: { id: ThemeId; label: string }[] = [
		{ id: 'halloween', label: 'Halloween' },
		{ id: 'plain', label: 'Schlicht' }
	];
	let activeTheme = $state<ThemeId>('halloween');
	let user = $state<User | null>(null);
	let lichessUsername = $state<string | null>(null);

	async function refreshUser() {
		const { data } = await supabase.auth.getSession();
		user = data.session?.user ?? null;
	}

	$effect(() => {
		// Subscribe to page transitions to reactively update the username
		const path = $page.url.pathname;
		
		if (user) {
			supabase
				.from('user_lichess')
				.select('lichess_username')
				.eq('user_id', user.id)
				.maybeSingle()
				.then(({ data }) => {
					lichessUsername = data?.lichess_username ?? null;
				});
		} else {
			lichessUsername = null;
		}
	});

	function applyTheme(theme: ThemeId) {
		activeTheme = theme;
		document.documentElement.dataset.theme = theme;
		localStorage.setItem('theme', theme);
	}

	onMount(() => {
		const saved = localStorage.getItem('theme');
		if (saved === 'plain' || saved === 'halloween') {
			applyTheme(saved);
		} else {
			applyTheme('halloween');
		}

		void refreshUser();
		const { data: authSubscription } = supabase.auth.onAuthStateChange(() => {
			void refreshUser();
		});

		return () => {
			authSubscription.subscription.unsubscribe();
		};
	});
</script>

<svelte:head>
	<title>Chessboard</title>
	<link
		href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Space+Grotesk:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- TopNavBar -->
<header
	class="app-header sticky top-0 z-50 flex w-full items-center justify-between px-6 py-4 font-['Epilogue'] tracking-tight backdrop-blur-xl"
>
	<div class="flex items-center gap-8">
		<a
			href="{base}/"
			class="text-2xl font-bold text-primary italic transition-colors hover:text-primary-container"
			>The Ethereal Grandmaster</a
		>
		<nav class="flex gap-6">
			<a
				href="{base}/"
				class="text-sm font-semibold {$page.url.pathname === `${base}/`
					? 'text-primary'
					: 'text-on-surface-variant hover:text-on-surface'} transition-colors">Play</a
			>
			<a
				href="{base}/analysis"
				class="text-sm font-semibold {$page.url.pathname.startsWith(`${base}/analysis`)
					? 'text-primary'
					: 'text-on-surface-variant hover:text-on-surface'} transition-colors">Analyse</a
			>
			<a
				href="{base}/tactics"
				class="text-sm font-semibold {$page.url.pathname.startsWith(`${base}/tactics`)
					? 'text-primary'
					: 'text-on-surface-variant hover:text-on-surface'} transition-colors">Tactics</a
			>
			<a
				href="{base}/history/"
				class="text-sm font-semibold {$page.url.pathname === `${base}/history/`
					? 'text-primary'
					: 'text-on-surface-variant hover:text-on-surface'} transition-colors">Game History</a
			>
			<a
				href="{base}/history/positions/"
				class="text-sm font-semibold {$page.url.pathname.startsWith(`${base}/history/positions/`)
					? 'text-primary'
					: 'text-on-surface-variant hover:text-on-surface'} transition-colors">Positions</a
			>
			<a
				href="{base}/account/"
				class="text-sm font-semibold {$page.url.pathname.startsWith(`${base}/account/`)
					? 'text-primary'
					: 'text-on-surface-variant hover:text-on-surface'} transition-colors">Account</a
			>
		</nav>
	</div>
	<div class="flex items-center gap-4">
		<label
			class="flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-highest px-3 py-1 text-xs font-semibold text-on-surface"
		>
			<span class="material-symbols-outlined text-base text-primary">palette</span>
			<select
				class="bg-transparent text-xs font-semibold text-on-surface focus:outline-none"
				bind:value={activeTheme}
				onchange={(event) =>
					applyTheme((event.currentTarget as HTMLSelectElement).value as ThemeId)}
			>
				{#each themes as theme}
					<option value={theme.id}>{theme.label}</option>
				{/each}
			</select>
		</label>
		<div
			class="flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-highest px-3 py-1"
		>
			<span class="material-symbols-outlined text-primary">account_circle</span>
			<span class="text-sm font-medium">{lichessUsername || 'Player 1'}</span>
		</div>
	</div>
</header>

{@render children()}
