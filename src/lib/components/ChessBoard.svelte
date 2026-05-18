<script lang="ts">
	import { game } from '$lib/game.svelte';
	import Piece from './Piece.svelte';

	// Helper to get square name (e.g. 'e4') from row and col indices
	function getSquare(rowIndex: number, colIndex: number): string {
		const file = String.fromCharCode('a'.charCodeAt(0) + colIndex);
		const rank = 8 - rowIndex;
		return `${file}${rank}`;
	}

	// For visual feedback when an empty square is clicked
	let selectedSquare = $state<string | null>(null);
	let targetSquare = $state<string | null>(null);

	type ChessPiece = { type: string; color: string } | null;
	
	function onSquareClick(square: string, piece: ChessPiece) {
		if (selectedSquare) {
			// Attempt to move to this square (whether empty or occupied for capture)
			const result = game.move(selectedSquare, square);
			if (result) {
				selectedSquare = null;
				return;
			}
		}
		
		// If we reach here, we either had nothing selected, or the move was invalid.
		// Try to select the clicked piece, if any.
		if (piece) {
			if (game.mode === 'engine' && piece.color !== game.playerColor) {
				// Prevent selecting opponent's pieces in engine mode
				targetSquare = square;
				setTimeout(() => { targetSquare = null; }, 500);
				return;
			}
			selectedSquare = square;
		} else {
			// Clicked empty square without a valid selected piece
			targetSquare = square;
			setTimeout(() => { targetSquare = null; }, 500);
		}
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault(); // Necessary to allow dropping
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
	}

	function onDrop(e: DragEvent, toSquare: string) {
		e.preventDefault();
		if (e.dataTransfer) {
			const fromSquare = e.dataTransfer.getData('text/plain');
			if (fromSquare && fromSquare !== toSquare) {
				const result = game.move(fromSquare, toSquare);
				if (!result) {
					targetSquare = toSquare;
					setTimeout(() => { targetSquare = null; }, 500);
				}
				selectedSquare = null;
			}
		}
	}

	// US 19: Keyboard Navigation
	function onKeyDown(e: KeyboardEvent) {
		// Only navigate if we're not typing in an input
		if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

		if (e.key === 'ArrowLeft') {
			const current = game.viewIndex === -1 ? game.totalHistoryCount - 1 : game.viewIndex;
			game.jumpToHistoryIndex(current - 1);
		} else if (e.key === 'ArrowRight') {
			if (game.viewIndex !== -1) {
				const next = game.viewIndex + 1;
				if (next >= game.totalHistoryCount - 1) {
					game.jumpToHistoryIndex(-1);
				} else {
					game.jumpToHistoryIndex(next);
				}
			}
		}
	}
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="flex flex-col gap-4 w-full max-w-[600px]">
	<!-- Chessboard Box -->
	<div class="relative aspect-square w-full bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden p-2 group ring-1 ring-white/10">
		<div class="absolute inset-0 mist-overlay opacity-30"></div>
		
		<!-- Coordinate Labels -->
		<div class="absolute top-1 left-4 right-4 flex justify-between text-[10px] text-outline uppercase font-bold tracking-widest opacity-30 z-10 pointer-events-none {game.playerColor === 'b' ? 'rotate-180 flex-row-reverse' : ''}">
			<span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span><span>G</span><span>H</span>
		</div>

		<div class="w-full h-full rounded-lg overflow-hidden border border-outline-variant/20 grid grid-cols-8 grid-rows-8 relative z-20 {game.playerColor === 'b' ? 'rotate-180' : ''}">
			{#each game.board as row, rowIndex (rowIndex)}
				{#each row as piece, colIndex (getSquare(rowIndex, colIndex))}
					{@const square = getSquare(rowIndex, colIndex)}
					{@const isDark = (rowIndex + colIndex) % 2 === 1}
					
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div 
						class="relative flex items-center justify-center transition-colors duration-200 {isDark ? 'bg-[#333333]' : 'bg-[rgba(179,167,188,0.15)]'}"
						onclick={() => onSquareClick(square, piece)}
						ondragover={onDragOver}
						ondrop={(e) => onDrop(e, square)}
					>
						<!-- Selection Highlight -->
						{#if selectedSquare === square}
							<div class="absolute inset-0 bg-primary/20 border-2 border-primary shadow-[inset_0_0_15px_rgba(255,145,84,0.3)] pointer-events-none"></div>
						{/if}
						
						<!-- Empty Square Click Feedback / Illegal Move Feedback -->
						{#if targetSquare === square}
							<div class="absolute w-12 h-12 bg-error/35 rounded-full animate-ping pointer-events-none z-30"></div>
						{/if}

						<!-- The Piece -->
						<div class={game.playerColor === 'b' ? 'rotate-180 w-full h-full' : 'w-full h-full'}>
							<Piece {piece} {square} />
						</div>
					</div>
				{/each}
			{/each}
		</div>
	</div>

	<!-- Navigation Controls (US 19) - Always visible for consistency -->
	<div class="flex items-center justify-center gap-2 bg-surface-container-low p-2 rounded-xl border border-outline-variant/10 shadow-lg">
		<button 
			onclick={() => game.jumpToHistoryIndex(-1)}
			class="p-2 rounded-lg hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-all"
			title="Zum Anfang"
		>
			<span class="material-symbols-outlined text-2xl">first_page</span>
		</button>
		<button 
			onclick={() => {
				const current = game.viewIndex === -1 ? game.totalHistoryCount - 1 : game.viewIndex;
				game.jumpToHistoryIndex(current - 1);
			}}
			class="p-2 rounded-lg hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-all"
			title="Vorheriger Zug"
		>
			<span class="material-symbols-outlined text-2xl">chevron_left</span>
		</button>
		
		<div class="px-4 py-1.5 font-mono text-sm font-bold text-primary bg-primary/10 rounded-lg border border-primary/20 min-w-[100px] text-center shadow-inner">
			{game.viewIndex === -1 ? game.totalHistoryCount : game.viewIndex + 1} / {game.totalHistoryCount}
		</div>

		<button 
			onclick={() => {
				if (game.viewIndex !== -1) {
					const next = game.viewIndex + 1;
					if (next >= game.totalHistoryCount - 1) {
						game.jumpToHistoryIndex(-1);
					} else {
						game.jumpToHistoryIndex(next);
					}
				}
			}}
			class="p-2 rounded-lg hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-all disabled:opacity-20"
			disabled={game.viewIndex === -1}
			title="Nächster Zug"
		>
			<span class="material-symbols-outlined text-2xl">chevron_right</span>
		</button>
		<button 
			onclick={() => game.jumpToHistoryIndex(-1)}
			class="p-2 rounded-lg hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-all disabled:opacity-20"
			disabled={game.viewIndex === -1}
			title="Zum Ende"
		>
			<span class="material-symbols-outlined text-2xl">last_page</span>
		</button>
	</div>
</div>
