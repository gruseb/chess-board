<script lang="ts">
	import { game } from '$lib/game.svelte';
	import ChessBoard from '$lib/components/ChessBoard.svelte';
	import { onMount } from 'svelte';

	let selectedRating = $state(1500);
	const ratings = [1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2500];

	onMount(() => {
		// Load a default puzzle if none is active
		if (game.mode !== 'tactics' || !game.tacticsPuzzle) {
			game.loadTactics(selectedRating);
		}
	});

	function nextPuzzle() {
		game.loadTactics(selectedRating);
	}
</script>

<svelte:head>
	<title>Tactics Training | The Ethereal Grandmaster</title>
</svelte:head>

<main class="min-h-[calc(100vh-80px)] p-6 lg:p-12 flex flex-col lg:flex-row gap-12 items-start justify-center animate-in fade-in duration-700">
	
	<!-- Board Section -->
	<section class="flex flex-col gap-8 w-full max-w-[600px] shrink-0">
		<div class="flex flex-col gap-2">
			<h1 class="text-4xl font-bold font-['Epilogue'] tracking-tighter text-on-surface">
				Tactics <span class="text-primary italic">Training</span>
			</h1>
			<p class="text-on-surface-variant/80 text-sm max-w-md">
				Schärfe deinen Blick für Kombinationen. Wähle ein Level und löse die Aufgaben von Lichess.
			</p>
		</div>

		<ChessBoard />
	</section>

	<!-- Controls & Info Section -->
	<section class="flex-1 w-full max-w-md flex flex-col gap-6">
		
		<!-- Level Selector Card -->
		<div class="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-xl space-y-4">
			<h2 class="text-lg font-bold flex items-center gap-2 text-secondary">
				<span class="material-symbols-outlined">psychology</span>
				Level wählen
			</h2>
			
			<div class="grid grid-cols-3 gap-2">
				{#each ratings as rating}
					<button 
						onclick={() => selectedRating = rating}
						class="py-2 px-3 rounded-xl text-sm font-semibold transition-all border {selectedRating === rating ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20 scale-105' : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/10 hover:bg-white/5'}"
					>
						{rating}
					</button>
				{/each}
			</div>

			<button 
				onclick={nextPuzzle}
				class="w-full py-4 mt-4 bg-primary text-on-primary-container rounded-2xl font-bold hover:bg-primary-container transition-all shadow-[0_8px_30_rgba(255,145,84,0.3)] flex items-center justify-center gap-2 active:scale-[0.98]"
			>
				<span class="material-symbols-outlined">refresh</span>
				Nächste Aufgabe
			</button>
		</div>

		<!-- Puzzle Info Card -->
		{#if game.tacticsPuzzle}
			<div class="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-xl space-y-6 animate-in slide-in-from-right duration-500">
				<div class="flex justify-between items-start">
					<div class="space-y-1">
						<span class="text-[10px] font-bold uppercase tracking-widest text-outline-variant">Puzzle ID</span>
						<p class="font-mono text-sm font-medium text-on-surface">#{game.tacticsPuzzle.puzzleid}</p>
					</div>
					<div class="text-right space-y-1">
						<span class="text-[10px] font-bold uppercase tracking-widest text-outline-variant">Rating</span>
						<p class="text-xl font-bold text-primary italic">{game.tacticsPuzzle.rating}</p>
					</div>
				</div>

				<div class="space-y-3">
					<span class="text-[10px] font-bold uppercase tracking-widest text-outline-variant">Themen</span>
					<div class="flex flex-wrap gap-2">
						{#each game.tacticsPuzzle.themes.split(' ') as theme}
							<span class="px-2 py-1 bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider rounded-md border border-secondary/20">
								{theme.replace(/([A-Z])/g, ' $1').trim()}
							</span>
						{/each}
					</div>
				</div>

				<!-- Status Feedback -->
				<div class="pt-4 border-t border-outline-variant/10">
					{#if game.tacticsStatus === 'correct'}
						<div class="flex items-center gap-3 text-success font-bold animate-bounce">
							<span class="material-symbols-outlined text-3xl">check_circle</span>
							Richtig! Weiter so...
						</div>
					{:else}
						<div class="flex items-center gap-3 {game.tacticsStatus === 'wrong' ? 'text-error animate-shake' : 'text-on-surface-variant'}">
							<span class="material-symbols-outlined text-3xl">
								{game.tacticsStatus === 'wrong' ? 'cancel' : 'help'}
							</span>
							<span class="font-medium">
								{game.tacticsStatus === 'wrong' ? 'Falscher Zug. Probier\'s nochmal!' : 
								 game.tacticsStatus === 'completed' ? 'Aufgabe gelöst! 🎉' : 
								 'Finde den besten Zug für ' + (game.playerColor === 'w' ? 'Weiß' : 'Schwarz')}
							</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}

	</section>
</main>

<style>
	.animate-shake {
		animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
	}

	@keyframes shake {
		10%, 90% { transform: translate3d(-1px, 0, 0); }
		20%, 80% { transform: translate3d(2px, 0, 0); }
		30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
		40%, 60% { transform: translate3d(4px, 0, 0); }
	}
</style>
