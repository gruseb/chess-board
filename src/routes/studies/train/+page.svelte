<script lang="ts">
	import { game } from '$lib/game.svelte';
	import ChessBoard from '$lib/components/ChessBoard.svelte';
	import type { PageData } from './$types';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Training queue – re-initialize when data changes (e.g. invalidateAll)
	let queue = $state<typeof data.positions>(data.positions);
	let currentIndex = $state(0);

	// Derived current position
	const currentPos = $derived(queue[currentIndex] ?? null);
	const isLastPosition = $derived(currentIndex >= queue.length - 1);
	const progress = $derived(queue.length > 0 ? (currentIndex / queue.length) * 100 : 0);

	// Derive solved/explanation state purely from game status
	const solved = $derived(game.tacticsStatus === 'completed');
	const showExplanation = $derived(game.tacticsStatus === 'completed');

	onMount(() => {
		loadCurrentPosition();
	});

	function loadCurrentPosition() {
		const pos = queue[currentIndex];
		if (!pos) return;

		// Load position into game store as study puzzle
		const puzzle = {
			puzzleid: pos.id,
			fen: pos.fen,
			moves: (pos.correct_moves ?? []).join(' '),
			rating: 1500,
			themes: 'Lichess Study',
			explanation: pos.explanation ?? '',
			title: pos.title ?? 'Studien-Aufgabe'
		};

		game.startStudyPuzzle(puzzle);
	}

	function nextPosition() {
		if (isLastPosition) return;
		currentIndex++;
		loadCurrentPosition();
	}

	function previousPosition() {
		if (currentIndex === 0) return;
		currentIndex--;
		loadCurrentPosition();
	}

	function restartCurrent() {
		loadCurrentPosition();
	}

	// Feedback panel content based on tactics status
	const feedback = $derived(getFeedback(game.tacticsStatus));

	function getFeedback(status: typeof game.tacticsStatus) {
		switch (status) {
			case 'loading':
				return {
					icon: 'progress_activity',
					title: 'Stellung wird geladen',
					message: 'Bitte warten...',
					panelClass: 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant',
					iconClass: 'animate-spin border-outline-variant/20 bg-surface-container-highest text-secondary'
				};
			case 'correct':
				return {
					icon: 'check_circle',
					title: 'Richtiger Zug!',
					message: 'Stark. Weiter so...',
					panelClass: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-100',
					iconClass: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
				};
			case 'wrong':
				return {
					icon: 'cancel',
					title: 'Falscher Zug',
					message: 'Das war nicht der gesuchte Zug. Versuche es noch einmal.',
					panelClass: 'border-rose-500/30 bg-rose-500/12 text-rose-100',
					iconClass: 'border-rose-400/40 bg-rose-500/20 text-rose-300'
				};
			case 'completed':
				return {
					icon: 'emoji_events',
					title: 'Aufgabe gelöst!',
					message: currentPos?.explanation ? 'Lies die Erklärung und lade die nächste Stellung.' : 'Sehr gut! Lade die nächste Stellung.',
					panelClass: 'border-primary/30 bg-primary/12 text-on-surface',
					iconClass: 'border-primary/40 bg-primary/20 text-primary'
				};
			default:
				return {
					icon: 'ads_click',
					title: 'Dein Zug',
					message: `Finde den besten Zug für ${game.playerColor === 'w' ? 'Weiß' : 'Schwarz'}.`,
					panelClass: 'border-secondary/20 bg-secondary/10 text-on-surface',
					iconClass: 'border-secondary/30 bg-secondary/15 text-secondary'
				};
		}
	}
</script>

<svelte:head>
	<title>{data.studyTitle} | Studien-Training | The Ethereal Grandmaster</title>
</svelte:head>

<main
	class="animate-in fade-in flex min-h-[calc(100vh-80px)] flex-col items-start justify-start gap-10 p-6 duration-700 lg:flex-row lg:p-12"
>
	<!-- Board Section -->
	<section class="flex w-full max-w-150 shrink-0 flex-col gap-6">
		<!-- Title & breadcrumb -->
		<div class="space-y-1">
			<div class="flex items-center gap-2 text-xs text-on-surface-variant/60">
				<a href="{base}/studies" class="hover:text-primary transition-colors">Studien</a>
				<span class="material-symbols-outlined text-sm">chevron_right</span>
				<span class="text-on-surface-variant">{data.studyTitle}</span>
			</div>
			<h1 class="font-['Epilogue'] text-3xl font-bold tracking-tight text-on-surface">
				{currentPos?.title ?? 'Studien-Training'}
			</h1>
		</div>

		<!-- Progress bar -->
		{#if queue.length > 1}
			<div class="space-y-1.5">
				<div class="flex justify-between text-xs text-on-surface-variant/70">
					<span>Stellung {currentIndex + 1} von {queue.length}</span>
					<span>{Math.round(progress)}% abgeschlossen</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
					<div
						class="h-full rounded-full bg-primary transition-all duration-500"
						style="width: {progress}%"
					></div>
				</div>
			</div>
		{/if}

		<ChessBoard />

		<!-- Feedback Panel -->
		<div
			class="flex items-center gap-4 rounded-3xl border px-5 py-4 shadow-xl transition-all duration-300 {feedback.panelClass}"
		>
			<div
				class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-center shadow-inner {feedback.iconClass}"
			>
				<span class="material-symbols-outlined text-3xl">{feedback.icon}</span>
			</div>
			<div class="space-y-0.5">
				<p class="text-[10px] font-bold tracking-[0.28em] uppercase opacity-70">Feedback</p>
				<h2 class="text-lg font-bold tracking-tight">{feedback.title}</h2>
				<p class="text-sm opacity-85">{feedback.message}</p>
			</div>
		</div>

		<!-- Navigation Buttons -->
		<div class="flex gap-3">
			<button
				onclick={previousPosition}
				disabled={currentIndex === 0}
				class="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-outline-variant/15 bg-surface-container-highest px-4 py-3 text-sm font-bold text-on-surface transition-all hover:border-secondary/30 hover:bg-secondary/8 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-30"
			>
				<span class="material-symbols-outlined text-base">arrow_back</span>
				Zurück
			</button>
			<button
				onclick={restartCurrent}
				class="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-outline-variant/15 bg-surface-container-highest px-4 py-3 text-sm font-bold text-on-surface transition-all hover:border-outline-variant/30"
			>
				<span class="material-symbols-outlined text-base">refresh</span>
				Wiederholen
			</button>
			<button
				onclick={nextPosition}
				disabled={isLastPosition}
				class="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-outline-variant/15 bg-surface-container-highest px-4 py-3 text-sm font-bold text-on-surface transition-all hover:border-primary/30 hover:bg-primary/8 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
			>
				Weiter
				<span class="material-symbols-outlined text-base">arrow_forward</span>
			</button>
		</div>
	</section>

	<!-- Info Section -->
	<section class="flex w-full max-w-md flex-1 flex-col gap-6">
		<!-- Queue Overview -->
		{#if queue.length > 0}
			<div class="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 shadow-xl">
				<h2 class="mb-4 flex items-center gap-2 text-lg font-bold text-secondary">
					<span class="material-symbols-outlined">format_list_bulleted</span>
					Warteschlange
				</h2>
				<div class="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
					{#each queue as pos, i (pos.id)}
						<button
							onclick={() => { currentIndex = i; loadCurrentPosition(); }}
							class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all {i === currentIndex
								? 'bg-primary/15 border border-primary/25 text-primary font-semibold'
								: 'hover:bg-surface-container-highest text-on-surface-variant'}"
						>
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold {i < currentIndex
									? 'bg-emerald-500/20 text-emerald-400'
									: i === currentIndex
										? 'bg-primary/20 text-primary'
										: 'bg-surface-container-highest text-on-surface-variant/50'}"
							>
								{#if i < currentIndex}
									<span class="material-symbols-outlined text-xs">check</span>
								{:else}
									{i + 1}
								{/if}
							</span>
							<span class="line-clamp-1 flex-1">{pos.title ?? 'Unbenannte Stellung'}</span>
							<span
								class="shrink-0 text-[10px] font-semibold {pos.color_to_move === 'white'
									? 'text-stone-300'
									: 'text-slate-400'}"
							>
								{pos.color_to_move === 'white' ? '♔' : '♚'}
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Explanation Card (shown after solving) -->
		{#if showExplanation && currentPos?.explanation && currentPos.explanation.trim().length > 0}
			<div class="animate-in slide-in-from-bottom rounded-3xl border border-primary/20 bg-primary/8 p-6 shadow-xl duration-500">
				<div class="mb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-2xl text-primary">lightbulb</span>
					<h2 class="text-lg font-bold text-primary font-['Epilogue']">Erklärung</h2>
				</div>
				<p class="text-sm leading-relaxed text-on-surface/90">
					{currentPos.explanation}
				</p>
			</div>
		{/if}

		<!-- Next puzzle CTA -->
		{#if solved && !isLastPosition}
			<button
				onclick={nextPosition}
				class="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-4 font-bold text-on-primary-container shadow-[0_8px_30px_rgba(255,145,84,0.3)] transition-all hover:bg-primary-container active:scale-[0.98]"
			>
				<span class="material-symbols-outlined">arrow_forward</span>
				Nächste Stellung
			</button>
		{:else if solved && isLastPosition}
			<div class="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center shadow-xl">
				<span class="material-symbols-outlined text-5xl text-emerald-400">military_tech</span>
				<h2 class="mt-2 text-xl font-bold text-emerald-300 font-['Epilogue']">Alle Stellungen geschafft!</h2>
				<p class="mt-1 text-sm text-emerald-200/70">Du hast alle Stellungen dieser Studie trainiert.</p>
				<a
					href="{base}/studies"
					class="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-2 text-sm font-bold text-emerald-300 transition-all hover:bg-emerald-500/10"
				>
					<span class="material-symbols-outlined text-base">arrow_back</span>
					Zurück zur Übersicht
				</a>
			</div>
		{/if}

		<!-- No positions fallback -->
		{#if queue.length === 0}
			<div class="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-8 text-center shadow-xl">
				<span class="material-symbols-outlined text-5xl text-on-surface-variant/40">search_off</span>
				<h2 class="mt-3 text-lg font-bold text-on-surface-variant">Keine Stellungen gefunden</h2>
				<p class="mt-1 text-sm text-on-surface-variant/70">
					Importiere zuerst eine Lichess-Studie mit !-Annotationen.
				</p>
				<a
					href="{base}/studies"
					class="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary"
				>
					<span class="material-symbols-outlined text-base">arrow_back</span>
					Studie importieren
				</a>
			</div>
		{/if}
	</section>
</main>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
	}
</style>
