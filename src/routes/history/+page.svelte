<script lang="ts">
	import { base } from '$app/paths';
	import { game } from '$lib/game.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	let games = $state<any[]>([]);
	let syncResult = $state<{ success: boolean; count: number; error: string | null }>({
		success: false,
		count: 0,
		error: null
	});
	let syncWarning = $state<string | null>(null);
	let isLoading = $state(true);
	let isSyncing = $state(false);
	let userEmail = $state<string | null>(null);
	let userId = $state<string | null>(null);

	async function runSync() {
		if (!userId) {
			syncResult = { success: false, count: 0, error: 'Bitte einloggen, um Partien zu sehen.' };
			return;
		}
		isSyncing = true;
		syncWarning = null;
		const { data: syncData, error: syncError } = await supabase.functions.invoke('lichess-sync', {
			body: { max: 50, perfType: 'rapid' }
		});
		isSyncing = false;
		if (syncError) {
			syncResult = { success: false, count: 0, error: syncError.message };
			return;
		}
		if (syncData?.warning) {
			syncWarning =
				syncData.warning === 'Lichess config missing'
					? 'Bitte hinterlege deinen Lichess-Token im Account-Bereich.'
					: syncData.warning;
		}
		syncResult = {
			success: true,
			count: syncData?.count ?? 0,
			error: null
		};
	}

	async function loadGames() {
		const { data, error } = await supabase
			.from('partie')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			syncResult = { success: false, count: 0, error: error.message };
			return;
		}

		games = data ?? [];
	}

	onMount(async () => {
		const { data: userData, error: userError } = await supabase.auth.getUser();
		if (userError || !userData.user) {
			syncResult = { success: false, count: 0, error: 'Bitte einloggen, um Partien zu sehen.' };
			isLoading = false;
			return;
		}

		userId = userData.user.id;
		userEmail = userData.user.email ?? null;
		await runSync();
		await loadGames();

		isLoading = false;
	});
</script>

<div class="mx-auto max-w-4xl p-8">
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<h1 class="font-headline text-3xl font-bold text-primary">Partien-Historie</h1>
		<button
			class="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-2 text-sm font-bold text-on-surface transition-all hover:border-primary/40 hover:text-primary disabled:opacity-50"
			onclick={async () => {
				await runSync();
				await loadGames();
			}}
			disabled={isSyncing || !userId}
		>
			<span class="material-symbols-outlined text-base {isSyncing ? 'animate-spin' : ''}">
				{isSyncing ? 'progress_activity' : 'sync'}
			</span>
			Jetzt synchronisieren
		</button>
	</div>

	{#if syncResult.error}
		<div
			class="mb-6 flex items-center gap-3 rounded-xl border border-error/20 bg-error/10 p-4 text-error"
		>
			<span class="material-symbols-outlined">warning</span>
			<p class="text-sm">{syncResult.error}</p>
		</div>
	{:else if syncWarning}
		<div
			class="mb-6 flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-highest p-4 text-on-surface-variant"
		>
			<span class="material-symbols-outlined">info</span>
			<p class="text-sm">{syncWarning}</p>
		</div>
	{:else if syncResult.success}
		<div
			class="mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 text-primary"
		>
			<span class="material-symbols-outlined">sync</span>
			<p class="text-sm">{syncResult.count} Partien synchronisiert.</p>
		</div>
	{/if}
	{#if userEmail}
		<p class="mb-4 text-xs text-on-surface-variant">Eingeloggt als {userEmail}</p>
	{/if}
	<div
		class="overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-low shadow-xl"
	>
		<table class="w-full text-left">
			<thead class="border-b border-outline-variant/10 bg-surface-container">
				<tr>
					<th class="p-4 font-semibold text-on-surface-variant">Datum</th>
					<th class="p-4 font-semibold text-on-surface-variant">Weiß</th>
					<th class="p-4 font-semibold text-on-surface-variant">Schwarz</th>
					<th class="p-4 font-semibold text-on-surface-variant">Ergebnis</th>
					<th class="p-4 font-semibold text-on-surface-variant">Aktion</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-outline-variant/5">
				{#if isLoading}
					<tr>
						<td colspan="5" class="p-8 text-center text-on-surface-variant">Lade Partien...</td>
					</tr>
				{:else}
					{#each games as match (match.id)}
						<tr class="transition-colors hover:bg-white/5">
							<td class="p-4 text-sm text-on-surface">
								<div class="flex items-center gap-2">
									{#if match.source === 'lichess'}
										<span class="h-2 w-2 rounded-full bg-[#f0d9b5]" title="Lichess.org"></span>
									{:else}
										<span class="h-2 w-2 rounded-full bg-primary" title="Lokal"></span>
									{/if}
									{new Date(match.created_at).toLocaleString()}
								</div>
							</td>
							<td class="p-4 text-on-surface">{match.white_player}</td>
							<td class="p-4 text-on-surface"
								>{match.black_player} {match.difficulty ? `(Lvl ${match.difficulty})` : ''}</td
							>
							<td class="p-4">
								{#if match.result === 'white_won'}
									<span class="font-bold text-primary">1 - 0</span>
								{:else if match.result === 'black_won'}
									<span class="font-bold text-error">0 - 1</span>
								{:else}
									<span class="font-bold text-on-surface-variant">½ - ½</span>
								{/if}
							</td>
							<td class="p-4">
								<div class="flex items-center gap-3">
									<a
										href="{base}/history/{match.id}"
										class="group rounded-lg p-2 text-on-surface-variant transition-all hover:bg-primary/10 hover:text-primary"
										title="Ansehen"
									>
										<span class="material-symbols-outlined text-xl">visibility</span>
									</a>

									<button
										onclick={() => {
											game.loadPgn(match.pgn, 'local');
											goto(`${base}/`);
										}}
										class="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-secondary/10 hover:text-secondary"
										title="Partie fortsetzen"
									>
										<span class="material-symbols-outlined text-xl">play_arrow</span>
									</button>

									<button
										onclick={() => {
											game.loadPgn(match.pgn, 'analysis');
											goto(`${base}/analysis`);
										}}
										class="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-primary/10 hover:text-primary"
										title="Selbst analysieren"
									>
										<span class="material-symbols-outlined text-xl">psychology</span>
									</button>

									<button
										onclick={() => {
											game.loadPgn(match.pgn, 'analysis', true);
											goto(`${base}/analysis`);
										}}
										disabled={match.source !== 'lichess' && !game.canAnalyze(match.created_at)}
										class="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-20"
										title={match.source === 'lichess' || game.canAnalyze(match.created_at)
											? 'Stockfish analysieren'
											: 'Analyse erst nach 24h verfügbar'}
									>
										<span class="material-symbols-outlined text-xl">precision_manufacturing</span>
									</button>

									<button
										onclick={async () => {
											if (confirm('Möchtest du diese Partie wirklich löschen?')) {
												const success = await game.deleteGame(match.id);
												if (success) {
													window.location.reload();
												}
											}
										}}
										class="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-error/10 hover:text-error"
										title="Löschen"
									>
										<span class="material-symbols-outlined text-xl">delete</span>
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="p-8 text-center text-on-surface-variant">
								Noch keine Partien gespeichert. Spiel erst eine Partie zu Ende!
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
