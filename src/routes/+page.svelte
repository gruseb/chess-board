<script lang="ts">
	import ChessBoard from '$lib/components/ChessBoard.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { game } from '$lib/game.svelte';

</script>

<main class="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
	
	<!-- Main Game Canvas -->
	<section class="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 space-y-6 overflow-y-auto relative">
		
		<!-- Notifications -->
		{#if game.notification}
			<div class="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4">
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
		
		<!-- Game Over Overlay -->
		{#if game.isGameOver}
			<div class="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
				<div class="bg-surface-container p-8 rounded-2xl border border-primary/30 shadow-[0_0_40px_rgba(255,145,84,0.2)] text-center max-w-md">
					<h2 class="font-headline text-3xl font-bold text-primary mb-2">
						{#if game.isCheckmate}
							Checkmate!
						{:else if game.isStalemate}
							Stalemate!
						{:else if game.isDraw}
							Draw!
						{:else}
							Game Over
						{/if}
					</h2>
					<p class="text-on-surface-variant mb-6">The séance has concluded.</p>
					<button 
						class="w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary-container rounded-xl font-bold hover:bg-primary-container transition-all"
						onclick={() => game.reset()}
					>
						<span class="material-symbols-outlined">restart_alt</span>
						Play Again
					</button>
				</div>
			</div>
		{/if}

		<!-- Opponent Info -->
		<div class="w-full max-w-[600px] flex items-center justify-between px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
					<span class="material-symbols-outlined">psychology</span>
				</div>
				<div>
					<div class="font-headline text-on-surface font-semibold">Black Player</div>
				</div>
			</div>
			{#if game.turn === 'b' && !game.isGameOver}
				<div class="text-xs bg-primary/20 text-primary px-2 py-1 rounded font-bold uppercase tracking-wider animate-pulse">
					Thinking...
				</div>
			{/if}
		</div>

		<!-- Chessboard Area -->
		<ChessBoard />

		<!-- Player Info -->
		<div class="w-full max-w-[600px] flex items-center justify-between px-4 py-3 bg-surface-container rounded-xl border border-primary/20 shadow-[0_0_20px_rgba(255,145,84,0.1)]">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary ring-2 ring-primary/50">
					<span class="material-symbols-outlined">person</span>
				</div>
				<div>
					<div class="font-headline text-on-surface font-semibold flex items-center gap-2">
						White Player
					</div>
				</div>
			</div>
			{#if game.turn === 'w' && !game.isGameOver}
				<div class="text-xs bg-primary text-on-primary-container px-2 py-1 rounded font-bold uppercase tracking-wider">
					Your Turn
				</div>
			{/if}
		</div>

	</section>

	<Sidebar />
</main>
