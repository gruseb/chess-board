<script lang="ts">
	import { base } from '$app/paths';
	import { game } from '$lib/game.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	let positions = $state<any[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	function viewPosition(pos: any) {
		if (pos.partie?.pgn) {
			game.loadPgn(pos.partie.pgn, 'view');
		} else {
			game.loadFen(pos.fen, 'view');
		}
		goto(`${base}/`);
	}

	function continuePlaying(pos: any) {
		if (pos.partie?.pgn) {
			game.loadPgn(pos.partie.pgn, 'engine');
		} else {
			game.loadFen(pos.fen, 'engine');
		}
		goto(`${base}/`);
	}

	function startAnalysis(pos: any) {
		if (pos.partie?.pgn) {
			game.loadPgn(pos.partie.pgn, 'analysis', true);
		} else {
			game.loadFen(pos.fen, 'analysis', true);
		}
		goto(`${base}/analysis`);
	}

	onMount(async () => {
		const { data: userData, error: userError } = await supabase.auth.getUser();
		if (userError || !userData.user) {
			loadError = 'Bitte einloggen, um Positionen zu sehen.';
			isLoading = false;
			return;
		}

		const { data, error } = await supabase
			.from('position')
			.select('*, partie(pgn)')
			.order('created_at', { ascending: false });

		if (error) {
			loadError = error.message;
		} else {
			positions = data ?? [];
		}

		isLoading = false;
	});
</script>

<div class="mx-auto max-w-4xl p-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="font-headline text-3xl font-bold text-primary">Gespeicherte Positionen</h1>
		<a
			href="{base}/history/"
			class="flex items-center gap-1 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
		>
			<span class="material-symbols-outlined text-sm">history</span>
			Zur Partie-Historie
		</a>
	</div>

	<div
		class="overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-low shadow-xl"
	>
		<table class="w-full text-left">
			<thead class="border-b border-outline-variant/10 bg-surface-container">
				<tr>
					<th class="p-4 font-semibold text-on-surface-variant">Datum</th>
					<th class="p-4 font-semibold text-on-surface-variant">Titel</th>
					<th class="p-4 font-semibold text-on-surface-variant">Am Zug</th>
					<th class="p-4 font-semibold text-on-surface-variant">Aktionen</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-outline-variant/5">
				{#if loadError}
					<tr>
						<td colspan="4" class="p-8 text-center text-error">{loadError}</td>
					</tr>
				{:else if isLoading}
					<tr>
						<td colspan="4" class="p-8 text-center text-on-surface-variant">Lade Positionen...</td>
					</tr>
				{:else}
					{#each positions as pos (pos.id)}
						<tr class="transition-colors hover:bg-white/5">
							<td class="p-4 text-sm text-on-surface"
								>{new Date(pos.created_at).toLocaleString()}</td
							>
							<td class="p-4 font-medium text-on-surface">{pos.title || 'Ohne Titel'}</td>
							<td class="p-4">
								<span
									class="rounded px-2 py-1 text-xs font-bold tracking-wider uppercase
                                {pos.color_to_move === 'white'
										? 'bg-primary/20 text-primary'
										: 'bg-surface-container-highest text-on-surface-variant'}"
								>
									{pos.color_to_move === 'white' ? 'Weiß' : 'Schwarz'}
								</span>
							</td>
							<td class="p-4">
								<div class="flex flex-wrap gap-3">
									<button
										onclick={() => viewPosition(pos)}
										class="flex items-center gap-1 font-semibold text-on-surface transition-colors hover:text-primary"
										title="Stellung ansehen"
									>
										<span class="material-symbols-outlined text-sm">visibility</span>
										Ansehen
									</button>
									<button
										onclick={() => continuePlaying(pos)}
										class="flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary-container"
										title="Gegen Stockfish weiterspielen"
									>
										<span class="material-symbols-outlined text-sm">psychology</span>
										Weiterspielen
									</button>
									<button
										onclick={() => startAnalysis(pos)}
										class="flex items-center gap-1 font-semibold text-secondary transition-colors hover:text-secondary-container"
										title="Stellung mit Stockfish analysieren"
									>
										<span class="material-symbols-outlined text-sm">analytics</span>
										Analyse
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="4" class="p-8 text-center text-on-surface-variant">
								Noch keine Positionen gespeichert. Nutze den "Position speichern" Button während
								einer Partie!
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
