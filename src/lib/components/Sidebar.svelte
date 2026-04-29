<script lang="ts">
	import { game } from '$lib/game.svelte';

	// Group history into pairs of [whiteMove, blackMove]
	let movePairs = $derived(() => {
		const h = game.history;
		const pairs = [];
		for (let i = 0; i < h.length; i += 2) {
			pairs.push({
				white: h[i],
				black: h[i + 1] || null,
				moveNumber: Math.floor(i / 2) + 1
			});
		}
		return pairs;
	});
</script>

<aside class="w-full lg:w-[400px] bg-surface-container-low p-6 flex flex-col gap-6 border-l border-outline-variant/10 lg:h-screen lg:overflow-y-auto">
	<!-- Mode Toggle -->
	<div class="space-y-3">
		<h3 class="font-headline text-lg font-semibold text-primary">Sacrificial Rites</h3>
		<div class="flex bg-surface-container-lowest p-1 rounded-xl gap-1">
			<button class="flex-1 py-2 px-4 rounded-lg bg-surface-container-highest text-on-surface font-medium text-sm shadow-sm">Local PvP</button>
			<button class="flex-1 py-2 px-4 rounded-lg text-on-surface-variant font-medium text-sm hover:bg-white/5 transition-colors cursor-not-allowed opacity-50" title="Coming soon">vs Engine</button>
		</div>
	</div>

	<!-- Move History -->
	<div class="flex-1 flex flex-col min-h-[300px] bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/5">
		<div class="p-3 bg-surface-container-highest/50 border-b border-outline-variant/10 flex items-center justify-between">
			<span class="text-sm font-bold uppercase tracking-widest text-primary/70">Move History</span>
			<span class="text-xs text-on-surface-variant">{game.history.length} Plies</span>
		</div>
		<div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
			<table class="w-full text-sm">
				<tbody class="divide-y divide-outline-variant/5">
					{#each movePairs() as pair}
						<tr class="hover:bg-white/5 transition-colors">
							<td class="py-2 text-outline-variant font-mono w-12">{pair.moveNumber}.</td>
							<td class="py-2 font-medium text-on-surface">{pair.white.san}</td>
							<td class="py-2 font-medium text-on-surface-variant/80">{pair.black ? pair.black.san : '...'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="grid grid-cols-2 gap-3 mt-auto">
		<button 
			class="flex items-center justify-center gap-2 py-3 bg-surface-container-highest rounded-xl text-on-surface font-semibold hover:bg-surface-bright transition-all border border-outline-variant/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
			onclick={() => game.undo()}
			disabled={game.history.length === 0}
		>
			<span class="material-symbols-outlined text-primary">undo</span>
			Undo
		</button>
		<button class="flex items-center justify-center gap-2 py-3 bg-surface-container-highest rounded-xl text-on-surface font-semibold hover:bg-surface-bright transition-all border border-outline-variant/20 active:scale-95">
			<span class="material-symbols-outlined text-primary">flag</span>
			Draw
		</button>
		<button 
			class="col-span-2 flex items-center justify-center gap-2 py-4 bg-primary text-on-primary-container rounded-xl font-bold hover:bg-primary-container transition-all shadow-[0_4px_20px_rgba(255,145,84,0.3)] active:scale-[0.98]"
			onclick={() => game.reset()}
		>
			<span class="material-symbols-outlined">restart_alt</span>
			Initiate New Séance
		</button>
	</div>
</aside>
