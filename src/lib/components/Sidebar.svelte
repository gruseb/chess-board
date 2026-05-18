<script lang="ts">
	import { Chess } from 'chess.js';
	import { game } from '$lib/game.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import MoveTree from '$lib/components/MoveTree.svelte';

	// Group history into pairs of [whiteMove, blackMove]
	let movePairs = $derived.by(() => {
		// Use viewPgn if in view mode to show full history
		let history = game.history;
		if (game.mode === 'view' && game.viewPgn) {
			const temp = new Chess();
			temp.loadPgn(game.viewPgn);
			history = temp.history({ verbose: true });
		}

		const pairs = [];
		for (let i = 0; i < history.length; i += 2) {
			pairs.push({
				white: { ...history[i], index: i },
				black: history[i + 1] ? { ...history[i + 1], index: i + 1 } : null,
				moveNumber: Math.floor(i / 2) + 1
			});
		}
		return pairs;
	});

	function handleMoveClick(index: number) {
		if (game.mode === 'view') {
			game.jumpToHistoryIndex(index);
		}
	}

	function navigate(direction: 'start' | 'prev' | 'next' | 'end') {
		const temp = new Chess();
		temp.loadPgn(game.viewPgn || '');
		const history = temp.history();
		const currentIdx = game.history.length - 1;

		if (direction === 'start') game.jumpToHistoryIndex(-1);
		else if (direction === 'prev') game.jumpToHistoryIndex(currentIdx - 1);
		else if (direction === 'next') game.jumpToHistoryIndex(currentIdx + 1);
		else if (direction === 'end') game.jumpToHistoryIndex(history.length - 1);
	}
</script>

<aside class="w-full lg:w-[400px] bg-surface-container-low p-6 flex flex-col gap-6 border-l border-outline-variant/10 lg:h-screen lg:overflow-y-auto">
	<!-- Mode Toggle -->
	<div class="space-y-3">
		{#if game.mode === 'view'}
			<div class="flex items-center justify-between">
				<h3 class="font-headline text-lg font-semibold text-secondary flex items-center gap-2">
					<span class="material-symbols-outlined">visibility</span>
					Ansehen
				</h3>
				<button 
					onclick={() => game.setMode('local')}
					class="text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
				>
					<span class="material-symbols-outlined text-sm">play_arrow</span>
					Selbst spielen
				</button>
			</div>
		{:else}
			<h3 class="font-headline text-lg font-semibold text-primary">Sacrificial Rites</h3>
			<div class="flex bg-surface-container-lowest p-1 rounded-xl gap-1">
				<button 
					class="flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors {game.mode === 'local' && page.url.pathname === '/' ? 'bg-surface-container-highest text-on-surface shadow-sm' : 'text-on-surface-variant hover:bg-white/5'} {game.mode === 'analysis' ? 'opacity-30 cursor-not-allowed' : ''}"
					onclick={() => {
						if (game.mode === 'analysis') return;
						game.setMode('local');
						if ((page.url.pathname as string) !== '/') goto('/');
					}}
					disabled={game.mode === 'analysis'}
				>
					Local PvP
				</button>
				<button 
					class="flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors {game.mode === 'engine' && page.url.pathname === '/' ? 'bg-surface-container-highest text-on-surface shadow-sm' : 'text-on-surface-variant hover:bg-white/5'} {game.mode === 'analysis' ? 'opacity-30 cursor-not-allowed' : ''}"
					onclick={() => {
						if (game.mode === 'analysis') return;
						game.setMode('engine');
						if ((page.url.pathname as string) !== '/') goto('/');
					}}
					disabled={game.mode === 'analysis'}
				>
					vs Engine
				</button>
				<button 
					class="flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors {game.mode === 'analysis' ? 'bg-surface-container-highest text-on-surface shadow-sm' : 'text-on-surface-variant hover:bg-white/5'}"
					onclick={() => {
						game.setMode('analysis');
						if ((page.url.pathname as string) !== '/analysis') goto('/analysis');
					}}
				>
					Analyse
				</button>
			</div>
		{/if}

		{#if game.mode === 'engine'}
			<div class="space-y-2 pt-2 animate-in fade-in">
				<div class="flex justify-between items-center text-sm">
					<span class="text-on-surface-variant">Difficulty</span>
					<span class="text-primary font-bold">{game.engineDifficulty}</span>
				</div>
				<input 
					type="range" 
					min="1" 
					max="10" 
					bind:value={game.engineDifficulty}
					class="w-full accent-primary bg-surface-container-highest rounded-lg h-2 appearance-none cursor-pointer"
				/>
			</div>
		{/if}

		{#if game.mode === 'analysis'}
			<div class="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
				<span class="text-sm font-medium text-on-surface">Stockfish Analyse</span>
				<button 
					class="w-12 h-6 rounded-full transition-colors relative {game.isAnalyzing ? 'bg-primary' : 'bg-surface-container-highest'} {!game.engineAnalysisAllowed ? 'opacity-30 cursor-not-allowed' : ''}"
					onclick={() => {
						if (!game.engineAnalysisAllowed) return;
						game.toggleAnalysis();
					}}
					disabled={!game.engineAnalysisAllowed}
					aria-label="Stockfish Analyse umschalten"
					title={game.engineAnalysisAllowed ? 'Stockfish Analyse umschalten' : 'In der Selbstanalyse deaktiviert'}
				>
					<div class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform {game.isAnalyzing ? 'translate-x-6' : ''}"></div>
				</button>
			</div>
		{/if}
	</div>

	<!-- Move History / Tree -->
	<div class="flex-1 flex flex-col min-h-[300px] bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/5">
		<div class="p-3 bg-surface-container-highest/50 border-b border-outline-variant/10 flex items-center justify-between">
			<span class="text-sm font-bold uppercase tracking-widest text-primary/70">
				{game.mode === 'analysis' ? 'Variation Tree' : 'Move History'}
			</span>
			<span class="text-xs text-on-surface-variant">
				{game.mode === 'analysis' ? 'Exploration' : `Zug ${Math.ceil(game.history.length / 2)} (${game.history.length} Halbzüge)`}
			</span>
		</div>
		<div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
			{#if game.mode === 'analysis'}
				<div class="analysis-tree">
					<MoveTree />
				</div>
			{:else}
				<table class="w-full text-sm">
					<tbody class="divide-y divide-outline-variant/5">
						{#each movePairs as pair (pair.moveNumber)}
							<tr class="transition-colors">
								<td class="py-2 text-outline-variant font-mono w-12">{pair.moveNumber}.</td>
								<td 
									class="py-2 px-2 font-medium rounded cursor-pointer transition-all
										{game.mode === 'view' && game.history.length - 1 === pair.white.index ? 'bg-primary/20 text-primary shadow-[inset_0_0_10px_rgba(255,145,84,0.1)]' : 'text-on-surface hover:bg-white/5'}"
									onclick={() => handleMoveClick(pair.white.index)}
								>
									{pair.white.san}
								</td>
								{#if pair.black}
									<td 
										class="py-2 px-2 font-medium rounded cursor-pointer transition-all
											{game.mode === 'view' && game.history.length - 1 === pair.black.index ? 'bg-primary/20 text-primary shadow-[inset_0_0_10px_rgba(255,145,84,0.1)]' : 'text-on-surface-variant/80 hover:bg-white/5'}"
										onclick={() => handleMoveClick(pair.black!.index)}
									>
										{pair.black.san}
									</td>
								{:else}
									<td class="py-2 px-2"></td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

	</div>

	{#if game.mode !== 'view'}
		<!-- Save Actions -->
		<div class="space-y-3 pt-4 border-t border-outline-variant/10">
			<h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 px-1">Speicher-Optionen</h4>
			<div class="grid grid-cols-1 gap-2">
				<button 
					class="flex items-center gap-3 py-2.5 px-4 bg-surface-container-highest/50 rounded-xl text-on-surface text-sm font-medium hover:bg-surface-container-highest transition-all border border-outline-variant/10 active:scale-95 disabled:opacity-50"
					onclick={() => game.saveCurrentGame()}
					disabled={game.history.length === 0}
				>
					<span class="material-symbols-outlined text-primary text-xl">save</span>
					Partie speichern (PGN)
				</button>
				<button 
					class="flex items-center gap-3 py-2.5 px-4 bg-surface-container-highest/50 rounded-xl text-on-surface text-sm font-medium hover:bg-surface-container-highest transition-all border border-outline-variant/10 active:scale-95 disabled:opacity-50"
					onclick={() => game.saveCurrentPosition()}
					disabled={game.history.length === 0}
				>
					<span class="material-symbols-outlined text-secondary text-xl">location_on</span>
					Position speichern (FEN)
				</button>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="grid grid-cols-2 gap-3 mt-auto pt-4">
			<button 
				class="flex items-center justify-center gap-2 py-3 bg-surface-container-highest rounded-xl text-on-surface font-semibold hover:bg-surface-bright transition-all border border-outline-variant/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
				onclick={() => game.undo()}
				disabled={game.mode !== 'analysis' && game.history.length === 0}
			>
				<span class="material-symbols-outlined text-primary">undo</span>
				Undo
			</button>
			<button class="flex items-center justify-center gap-2 py-3 bg-surface-container-highest rounded-xl text-on-surface font-semibold hover:bg-surface-bright transition-all border border-outline-variant/20 active:scale-95">
				<span class="material-symbols-outlined text-primary">flag</span>
				Draw
			</button>
			<button 
				class="col-span-2 flex items-center justify-center gap-2 py-4 bg-primary text-on-primary-container rounded-xl font-bold hover:bg-primary-container transition-all shadow-[0_4px_20_rgba(255,145,84,0.3)] active:scale-[0.98]"
				onclick={() => game.reset()}
			>
				<span class="material-symbols-outlined">restart_alt</span>
				{game.mode === 'analysis' ? 'Analyse zurücksetzen' : 'Initiate New Séance'}
			</button>
		</div>
	{/if}
</aside>

