<script lang="ts">
	import { game, type AnalysisNode } from '$lib/game.svelte';

	type Segment =
		| { kind: 'move'; node: AnalysisNode; moveNum: string }
		| { kind: 'open' }
		| { kind: 'close' };

	function getDepth(nodeId: string, nodes: AnalysisNode[]): number {
		let depth = 0;
		let id: string | null = nodeId;
		while (id && id !== 'root') {
			const node = nodes.find(n => n.id === id);
			if (!node) break;
			id = node.parentId;
			depth++;
		}
		return depth;
	}

	function getMoveLabel(node: AnalysisNode, forceNum: boolean, nodes: AnalysisNode[]): string {
		const depth = getDepth(node.id, nodes);
		const num = Math.ceil(depth / 2);
		const isWhite = depth % 2 !== 0;
		if (isWhite) return `${num}.`;
		return forceNum ? `${num}...` : '';
	}

	function buildSegments(nodes: AnalysisNode[]): Segment[] {
		const result: Segment[] = [];

		function getChildren(parentId: string): AnalysisNode[] {
			return nodes.filter(n => n.parentId === parentId);
		}

		function walk(parentId: string, forceNum: boolean) {
			const children = getChildren(parentId);
			if (children.length === 0) return;

			const main = children[0];
			const alts = children.slice(1);

			result.push({ kind: 'move', node: main, moveNum: getMoveLabel(main, forceNum, nodes) });

			for (const alt of alts) {
				result.push({ kind: 'open' });
				walkVariation(alt.id);
				result.push({ kind: 'close' });
			}

			walk(main.id, alts.length > 0);
		}

		function walkVariation(nodeId: string) {
			const node = nodes.find(n => n.id === nodeId);
			if (!node) return;
			result.push({ kind: 'move', node, moveNum: getMoveLabel(node, true, nodes) });
			const children = getChildren(nodeId);
			if (children.length > 0) {
				const main = children[0];
				const alts = children.slice(1);
				for (const alt of alts) {
					result.push({ kind: 'open' });
					walkVariation(alt.id);
					result.push({ kind: 'close' });
				}
				walkVariationContinued(main.id, alts.length > 0);
			}
		}

		function walkVariationContinued(nodeId: string, forceNum: boolean) {
			const node = nodes.find(n => n.id === nodeId);
			if (!node) return;
			result.push({ kind: 'move', node, moveNum: getMoveLabel(node, forceNum, nodes) });
			const children = getChildren(nodeId);
			if (children.length > 0) {
				const main = children[0];
				const alts = children.slice(1);
				for (const alt of alts) {
					result.push({ kind: 'open' });
					walkVariation(alt.id);
					result.push({ kind: 'close' });
				}
				walkVariationContinued(main.id, alts.length > 0);
			}
		}

		walk('root', true);
		return result;
	}

	// game.analysisNodes is re-assigned on every move → $derived re-runs automatically
	let segments = $derived(buildSegments(game.analysisNodes));
</script>

<div class="move-tree">
	{#each segments as seg, i (seg.kind === 'move' ? seg.node.id : `${seg.kind}-${i}`)}
		{#if seg.kind === 'move'}
			<span
				class="move-item"
				class:active={seg.node.id === game.currentNodeId}
				onclick={() => game.jumpToNodeById(seg.node.id)}
				onkeydown={(e) => e.key === 'Enter' && game.jumpToNodeById(seg.node.id)}
				role="button"
				tabindex="0"
			>
				{#if seg.moveNum}
					<span class="move-number">{seg.moveNum}</span>
				{/if}
				<span class="move-san">{seg.node.san}</span>
			</span>
		{:else if seg.kind === 'open'}
			<span class="bracket">(</span>
		{:else}
			<span class="bracket">)</span>
		{/if}
	{/each}

	{#if segments.length === 0}
		<span class="empty-hint">Mache deinen ersten Zug...</span>
	{/if}
</div>

<style>
	.move-tree {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px 0;
		font-family: 'Inter', sans-serif;
		font-size: 0.95em;
		line-height: 1.9;
		color: #e0e0e0;
	}

	.move-item {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 7px;
		border-radius: 5px;
		cursor: pointer;
		transition: background 0.15s ease;
		user-select: none;
	}

	.move-item:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.move-item.active {
		background: #ff9154;
		color: #000;
		box-shadow: 0 0 10px rgba(255, 145, 84, 0.45);
	}

	.move-item.active .move-number,
	.move-item.active .move-san {
		color: #000;
	}

	.move-number {
		font-size: 0.8em;
		color: rgba(255, 255, 255, 0.45);
		font-weight: 700;
	}

	.move-san {
		font-weight: 600;
		color: #ffffff;
	}

	.bracket {
		color: rgba(255, 255, 255, 0.3);
		font-weight: bold;
		padding: 0 2px;
		font-size: 0.9em;
	}

	.empty-hint {
		color: rgba(255, 255, 255, 0.3);
		font-style: italic;
		font-size: 0.9em;
	}
</style>
