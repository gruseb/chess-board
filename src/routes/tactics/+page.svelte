<script lang="ts">
	import { game } from '$lib/game.svelte';
	import ChessBoard from '$lib/components/ChessBoard.svelte';
	import { onMount } from 'svelte';

	let selectedRating = $state(1500);
	const ratings = [1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2500];

	onMount(() => {
		// Load a default puzzle if none is active
		if (game.mode !== 'tactics' || !game.tacticsPuzzle) {
			void game.loadTactics(selectedRating);
		}
	});

	function nextPuzzle() {
		void game.loadTactics(selectedRating);
	}

	function selectRating(rating: number) {
		selectedRating = rating;
		void game.loadTactics(selectedRating);
	}

	const isContinueDisabled = $derived(
		!game.tacticsPuzzle || game.tacticsStatus === 'loading' || !game.tacticsSolved
	);

	function getTacticsFeedback(status: typeof game.tacticsStatus) {
		switch (status) {
			case 'loading':
				return {
					icon: 'progress_activity',
					title: 'Aufgabe wird geladen',
					message: 'Eine neue Taktikstellung wird vorbereitet.',
					panelClass: 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant',
					iconClass:
						'animate-spin border-outline-variant/20 bg-surface-container-highest text-secondary'
				};
			case 'correct':
				return {
					icon: 'check_circle',
					title: 'Richtiger Zug',
					message: 'Stark. Genau dieser Zug war gesucht.',
					panelClass: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-100',
					iconClass: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
				};
			case 'wrong':
				return {
					icon: 'cancel',
					title: 'Falscher Zug',
					message: 'Das war nicht die Lösung. Die Stellung wird gleich zurückgesetzt.',
					panelClass: 'border-rose-500/30 bg-rose-500/12 text-rose-100',
					iconClass: 'border-rose-400/40 bg-rose-500/20 text-rose-300'
				};
			case 'completed':
				return {
					icon: 'emoji_events',
					title: 'Aufgabe gelöst',
					message: 'Sehr gut. Du kannst direkt die nächste Stellung laden.',
					panelClass: 'border-primary/30 bg-primary/12 text-on-surface',
					iconClass: 'border-primary/40 bg-primary/20 text-primary'
				};
			case 'error':
				return {
					icon: 'wifi_off',
					title: 'Laden fehlgeschlagen',
					message: game.tacticsError ?? 'Die Aufgabe konnte nicht geladen werden.',
					panelClass: 'border-rose-500/30 bg-rose-500/12 text-rose-100',
					iconClass: 'border-rose-400/40 bg-rose-500/20 text-rose-300'
				};
			case 'empty':
				return {
					icon: 'search_off',
					title: 'Keine Aufgabe gefunden',
					message: game.tacticsError ?? 'Fuer diese Elo-Stufe wurde gerade keine Aufgabe gefunden.',
					panelClass: 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant',
					iconClass: 'border-outline-variant/20 bg-surface-container-highest text-secondary'
				};
			default:
				return {
					icon: 'ads_click',
					title: 'Dein Zug',
					message: `Finde den besten Zug fuer ${game.playerColor === 'w' ? 'Weiss' : 'Schwarz'}.`,
					panelClass: 'border-secondary/20 bg-secondary/10 text-on-surface',
					iconClass: 'border-secondary/30 bg-secondary/15 text-secondary'
				};
		}
	}

	const feedback = $derived(getTacticsFeedback(game.tacticsStatus));
</script>

<svelte:head>
	<title>Tactics Training | The Ethereal Grandmaster</title>
</svelte:head>

<main
	class="animate-in fade-in flex min-h-[calc(100vh-80px)] flex-col items-start justify-center gap-12 p-6 duration-700 lg:flex-row lg:p-12"
>
	<!-- Board Section -->
	<section class="flex w-full max-w-150 shrink-0 flex-col gap-8">
		<div class="flex flex-col gap-2">
			<h1 class="font-['Epilogue'] text-4xl font-bold tracking-tighter text-on-surface">
				Tactics <span class="text-primary italic">Training</span>
			</h1>
			<p class="max-w-md text-sm text-on-surface-variant/80">
				Schärfe deinen Blick für Kombinationen. Wähle eine Elo-Stufe und trainiere lokale
				Taktikaufgaben in der App.
			</p>
		</div>

		<ChessBoard />

		<div
			class="flex items-center gap-4 rounded-3xl border px-5 py-4 shadow-xl transition-all duration-300 {feedback.panelClass}"
		>
			<div
				class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border text-center shadow-inner {feedback.iconClass}"
			>
				<span class="material-symbols-outlined text-4xl">{feedback.icon}</span>
			</div>
			<div class="space-y-1">
				<p class="text-xs font-bold tracking-[0.28em] uppercase opacity-75">Feedback</p>
				<h2 class="text-xl font-bold tracking-tight">{feedback.title}</h2>
				<p class="text-sm opacity-90">{feedback.message}</p>
			</div>
		</div>
	</section>

	<!-- Controls & Info Section -->
	<section class="flex w-full max-w-md flex-1 flex-col gap-6">
		<!-- Level Selector Card -->
		<div
			class="space-y-4 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 shadow-xl"
		>
			<h2 class="flex items-center gap-2 text-lg font-bold text-secondary">
				<span class="material-symbols-outlined">psychology</span>
				Level wählen
			</h2>
			<p class="text-xs text-on-surface-variant/80">
				Die Auswahl lädt Aufgaben im Bereich {selectedRating} bis {selectedRating + 100} Elo.
			</p>

			<div class="grid grid-cols-3 gap-2">
				{#each ratings as rating (rating)}
					<button
						onclick={() => selectRating(rating)}
						disabled={game.tacticsStatus === 'loading'}
						class="rounded-xl border px-3 py-2 text-sm font-semibold transition-all {selectedRating ===
						rating
							? 'scale-105 border-primary bg-primary text-on-primary shadow-lg shadow-primary/20'
							: 'border-outline-variant/10 bg-surface-container-highest text-on-surface-variant hover:bg-white/5'}"
					>
						{rating}
					</button>
				{/each}
			</div>

			<button
				onclick={nextPuzzle}
				disabled={game.tacticsStatus === 'loading'}
				class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-on-primary-container shadow-[0_8px_30_rgba(255,145,84,0.3)] transition-all hover:bg-primary-container active:scale-[0.98]"
			>
				<span class="material-symbols-outlined"
					>{game.tacticsStatus === 'loading' ? 'progress_activity' : 'refresh'}</span
				>
				{game.tacticsPuzzle ? 'Aufgabe überspringen' : 'Aufgabe laden'}
			</button>

			<div
				class="rounded-2xl border border-outline-variant/10 bg-surface-container-highest px-4 py-3 text-xs text-on-surface-variant/85"
			>
				Dieses Training läuft nur lokal in dieser App. Es gibt keine Lichess-Anbindung und kein
				externes Taktikrating wird verändert.
			</div>
		</div>

		<!-- Puzzle Info Card -->
		{#if game.tacticsPuzzle}
			<div
				class="animate-in slide-in-from-right space-y-6 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 shadow-xl duration-500"
			>
				<div class="flex items-start justify-between">
					<div class="space-y-1">
						<span class="text-[10px] font-bold tracking-widest text-outline-variant uppercase"
							>Puzzle ID</span
						>
						<p class="font-mono text-sm font-medium text-on-surface">
							#{game.tacticsPuzzle.puzzleid}
						</p>
					</div>
					<div class="space-y-1 text-right">
						<span class="text-[10px] font-bold tracking-widest text-outline-variant uppercase"
							>Rating</span
						>
						<p class="text-xl font-bold text-primary italic">{game.tacticsPuzzle.rating}</p>
					</div>
				</div>

				<div class="space-y-3">
					<span class="text-[10px] font-bold tracking-widest text-outline-variant uppercase"
						>Themen</span
					>
					<div class="flex flex-wrap gap-2">
						{#each game.tacticsPuzzle.themes.split(' ') as theme (`${game.tacticsPuzzle.puzzleid}-${theme}`)}
							<span
								class="rounded-md border border-secondary/20 bg-secondary/10 px-2 py-1 text-[10px] font-bold tracking-wider text-secondary uppercase"
							>
								{theme.replace(/([A-Z])/g, ' $1').trim()}
							</span>
						{/each}
					</div>
				</div>

				<!-- Status Feedback -->
				<div class="border-t border-outline-variant/10 pt-4">
					{#if game.tacticsStatus === 'loading'}
						<div class="flex items-center gap-3 text-on-surface-variant">
							<span class="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
							Neue Aufgabe wird geladen...
						</div>
					{:else if game.tacticsStatus === 'correct'}
						<div class="text-success flex animate-bounce items-center gap-3 font-bold">
							<span class="material-symbols-outlined text-3xl">check_circle</span>
							Richtig! Weiter so...
						</div>
					{:else if game.tacticsStatus === 'completed'}
						<div class="text-success flex items-center gap-3 font-bold">
							<span class="material-symbols-outlined text-3xl">emoji_events</span>
							Aufgabe gelöst. Lade direkt die nächste Stellung oder wechsle die Elo-Stufe.
						</div>
					{:else if game.tacticsStatus === 'wrong'}
						<div class="animate-shake flex items-center gap-3 text-error">
							<span class="material-symbols-outlined text-3xl">cancel</span>
							Falscher Zug. Die Stellung wird gleich zurückgesetzt.
						</div>
					{:else}
						<div class="flex items-center gap-3 text-on-surface-variant">
							<span class="material-symbols-outlined text-3xl"> help </span>
							<span class="font-medium">
								Finde den besten Zug für {game.playerColor === 'w' ? 'Weiß' : 'Schwarz'}.
							</span>
						</div>
					{/if}

					<button
						onclick={nextPuzzle}
						disabled={isContinueDisabled}
						class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-bold transition-all disabled:cursor-not-allowed disabled:border-outline-variant/10 disabled:bg-surface-container-high disabled:text-on-surface-variant/45 {isContinueDisabled
							? ''
							: 'border-primary/30 bg-primary/12 text-primary hover:border-primary hover:bg-primary/18'}"
					>
						<span class="material-symbols-outlined">arrow_forward</span>
						Weiter
					</button>
				</div>
			</div>
		{:else}
			<div
				class="space-y-4 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 shadow-xl"
			>
				{#if game.tacticsStatus === 'loading'}
					<div class="flex items-center gap-3 text-on-surface-variant">
						<span class="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
						<span class="font-medium">Taktikaufgabe wird geladen...</span>
					</div>
				{:else if game.tacticsStatus === 'error' || game.tacticsStatus === 'empty'}
					<div class="space-y-2">
						<h2 class="text-lg font-bold text-error">Keine Aufgabe bereit</h2>
						<p class="text-sm text-on-surface-variant/85">
							{game.tacticsError ?? 'Bitte lade eine neue Taktikaufgabe.'}
						</p>
					</div>
				{:else}
					<div class="space-y-2">
						<h2 class="text-lg font-bold text-secondary">Bereit fuer dein Training</h2>
						<p class="text-sm text-on-surface-variant/85">
							Waehle eine Elo-Stufe oder lade direkt die erste Aufgabe.
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</section>
</main>

<style>
	.animate-shake {
		animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}

	@keyframes shake {
		10%,
		90% {
			transform: translate3d(-1px, 0, 0);
		}
		20%,
		80% {
			transform: translate3d(2px, 0, 0);
		}
		30%,
		50%,
		70% {
			transform: translate3d(-4px, 0, 0);
		}
		40%,
		60% {
			transform: translate3d(4px, 0, 0);
		}
	}
</style>
