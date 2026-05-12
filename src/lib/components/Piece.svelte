<script lang="ts">
	import { game } from '$lib/game.svelte';

	let { piece, square } = $props<{
		piece: { type: string; color: string } | null;
		square: string;
	}>();

	const iconMap: Record<string, string> = {
		p: 'chess_pawn',
		r: 'chess_rook',
		n: 'chess_knight',
		b: 'chess_bishop',
		q: 'chess_queen',
		k: 'chess_king'
	};

	let isDragging = $state(false);

	function onDragStart(e: DragEvent) {
		if (!piece || game.mode === 'view') {
			e.preventDefault();
			return;
		}
		isDragging = true;
		if (e.dataTransfer) {
			e.dataTransfer.setData('text/plain', square);
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	function onDragEnd() {
		isDragging = false;
	}
</script>

{#if piece}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="w-full h-full flex items-center justify-center {game.mode === 'view' ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} {isDragging ? 'opacity-50' : 'opacity-100'}"
		draggable={game.mode !== 'view'}
		ondragstart={onDragStart}
		ondragend={onDragEnd}
	>
		<span
			class="material-symbols-outlined piece-icon {piece.color === 'w' ? 'piece-white' : 'piece-black'}"
			style="font-size: 2.75rem;"
		>
			{iconMap[piece.type]}
		</span>
	</div>
{/if}

<style>
	.piece-icon {
		user-select: none;
	}
	.piece-black {
		background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 50%, #475569 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 5px rgba(255, 255, 255, 0.2));
	}
	.piece-white {
		color: #ffffff;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
	}
</style>
