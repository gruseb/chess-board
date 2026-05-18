<script lang="ts">
	import ChessBoard from '$lib/components/ChessBoard.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import EvaluationBar from '$lib/components/EvaluationBar.svelte';
	import { game } from '$lib/game.svelte';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	onMount(() => {
		if (game.mode !== 'analysis') {
			game.engineAnalysisAllowed = true;
			game.setMode('analysis');
		}
	});
</script>

<main class="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
	
	<!-- Main Analysis Area -->
	<section class="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 space-y-6 overflow-y-auto relative">
		
		<!-- Notifications -->
		{#if game.notification}
			<div class="fixed top-24 left-1/2 -translate-x-1/2 z-60 animate-in fade-in slide-in-from-top-4">
				<div class="flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-md
					{game.notification.type === 'success' 
						? 'bg-primary/20 border-primary/40 text-primary shadow-primary/20' 
						: 'bg-error/20 border-error/40 text-error shadow-error/20'}">
					<span class="material-symbols-outlined">
						{game.notification.type === 'success' ? 'check_circle' : 'error'}
					</span>
					<span class="font-bold tracking-tight">{game.notification.message}</span>
				</div>
			</div>
		{/if}

		<div class="flex flex-row items-center gap-6">
			<!-- Evaluation Bar -->
			{#if game.isAnalyzing}
				<div class="h-[600px]" transition:fly={{ x: -20, duration: 300 }}>
					<EvaluationBar />
				</div>
			{/if}

			<div class="flex flex-col gap-4">
				<!-- Opponent Info (Stockfish) -->
				<div class="w-full max-w-[600px] flex items-center justify-between px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
							<span class="material-symbols-outlined">analytics</span>
						</div>
						<div>
							<div class="font-headline text-on-surface font-semibold">Stockfish Analysis</div>
							<div class="text-xs text-on-surface-variant">Continuous Evaluation</div>
						</div>
					</div>
					{#if game.isAnalyzing}
						<div class="flex items-center gap-2">
							<span class="flex h-2 w-2 rounded-full bg-primary animate-ping"></span>
							<span class="text-xs text-primary font-bold uppercase tracking-wider">Live</span>
						</div>
					{/if}
				</div>

				<!-- Chessboard -->
				<ChessBoard />

				<!-- Player Info -->
				<div class="w-full max-w-[600px] flex items-center justify-between px-4 py-3 bg-surface-container rounded-xl border border-primary/20 shadow-[0_0_20px_rgba(255,145,84,0.1)]">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary ring-2 ring-primary/50">
							<span class="material-symbols-outlined">explore</span>
						</div>
						<div>
							<div class="font-headline text-on-surface font-semibold">Analysis Mode</div>
							<div class="text-xs text-on-surface-variant">Explore variations</div>
						</div>
					</div>
				</div>
			</div>
		</div>

	</section>

	<Sidebar />
</main>
