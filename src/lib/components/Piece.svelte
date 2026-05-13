<script lang="ts">
	import { game } from '$lib/game.svelte';

	let { piece, square } = $props<{
		piece: { type: string; color: string } | null;
		square: string;
	}>();

	const unicodeMap: Record<string, Record<string, string>> = {
		w: {
			k: '♔',
			q: '♕',
			r: '♖',
			b: '♗',
			n: '♘',
			p: '♙'
		},
		b: {
			k: '♚',
			q: '♛',
			r: '♜',
			b: '♝',
			n: '♞',
			p: '♟'
		}
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
		class="flex h-full w-full items-center justify-center {game.mode === 'view'
			? 'cursor-default'
			: 'cursor-grab active:cursor-grabbing'} {isDragging ? 'opacity-50' : 'opacity-100'}"
		draggable={game.mode !== 'view'}
		ondragstart={onDragStart}
		ondragend={onDragEnd}
	>
		<span class="piece-icon {piece.color === 'w' ? 'piece-white' : 'piece-black'}">
			{unicodeMap[piece.color]?.[piece.type]}
		</span>
	</div>
{/if}

<style>
	.piece-icon {
		font-size: 2.9rem;
		line-height: 1;
		user-select: none;
	}
	.piece-black {
		color: #1a1a1a;
		text-shadow:
			0 0 2px rgba(255, 255, 255, 0.5),
			0 0 6px rgba(255, 255, 255, 0.25);
	}
	.piece-white {
		color: #f8f8f8;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
	}
</style>
