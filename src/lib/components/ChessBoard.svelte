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

	function onSquareClick(square: string, piece: any) {
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
				game.move(fromSquare, toSquare);
				selectedSquare = null;
			}
		}
	}
</script>

<div class="relative aspect-square w-full max-w-[600px] bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden p-2 group ring-1 ring-white/10">
	<div class="absolute inset-0 mist-overlay opacity-30"></div>
	
	<!-- Coordinate Labels -->
	<div class="absolute top-1 left-4 right-4 flex justify-between text-[10px] text-outline uppercase font-bold tracking-widest opacity-30 z-10 pointer-events-none {game.playerColor === 'b' ? 'rotate-180 flex-row-reverse' : ''}">
		<span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span><span>G</span><span>H</span>
	</div>

	<div class="w-full h-full rounded-lg overflow-hidden border border-outline-variant/20 grid grid-cols-8 grid-rows-8 relative z-20 {game.playerColor === 'b' ? 'rotate-180' : ''}">
		{#each game.board as row, rowIndex}
			{#each row as piece, colIndex}
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
					
					<!-- Empty Square Click Feedback -->
					{#if targetSquare === square && !piece}
						<div class="absolute w-4 h-4 bg-error/40 rounded-full animate-ping pointer-events-none"></div>
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
