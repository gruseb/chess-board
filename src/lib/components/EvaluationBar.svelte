<script lang="ts">
	import { game } from '$lib/game.svelte';

	let score = $derived(game.analysisEvaluation);
	
	// Calculate height percentage for the white section
	let whiteHeight = $derived.by(() => {
		if (typeof score === 'string' && score.startsWith('M')) {
			// Mate score
			return score.includes('-') ? 0 : 100;
		}
		
		const numScore = typeof score === 'number' ? score : 0;
		// Map -5 to +5 range to 0% to 100%
		// Formula: (clampedScore + 5) / 10 * 100
		const clamped = Math.max(-5, Math.min(5, numScore));
		return ((clamped + 5) / 10) * 100;
	});

	let displayScore = $derived.by(() => {
		if (typeof score === 'string') return score;
		if (score > 0) return `+${score.toFixed(1)}`;
		if (score < 0) return score.toFixed(1);
		return '0.0';
	});

	let isFlipped = $derived(game.playerColor === 'b');
</script>

<div class="evaluation-bar-container" class:flipped={isFlipped}>
	<div class="bar-background">
		<!-- Black section (top when not flipped) -->
		<div class="black-section"></div>
		<!-- White section (bottom when not flipped) -->
		<div class="white-section" style="height: {whiteHeight}%">
			<span class="score-label white-score" class:hidden={whiteHeight < 10}>{displayScore}</span>
		</div>
		<span class="score-label black-score" class:hidden={whiteHeight > 90}>{displayScore}</span>
	</div>
</div>

<style>
	.evaluation-bar-container {
		width: 32px;
		height: 100%;
		min-height: 400px;
		background: #262421;
		border-radius: 4px;
		overflow: hidden;
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	}

	.bar-background {
		display: flex;
		flex-direction: column; /* Black on top, White on bottom */
		height: 100%;
		width: 100%;
		position: relative;
	}

	.flipped .bar-background {
		flex-direction: column-reverse; /* White on top, Black on bottom */
	}

	.black-section {
		background: #262421;
		flex-grow: 1;
		width: 100%;
	}

	.white-section {
		background: #ffffff;
		width: 100%;
		transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		position: relative;
		box-shadow: 0 -2px 10px rgba(255, 255, 255, 0.2);
	}

	.score-label {
		position: absolute;
		font-family: 'Inter', sans-serif;
		font-size: 11px;
		font-weight: 700;
		padding: 4px 0;
		width: 100%;
		text-align: center;
		z-index: 10;
		pointer-events: none;
	}

	/* White score label is at the bottom of the white section (which is at the bottom of the bar) */
	.white-score {
		bottom: 8px;
		color: #262421;
	}

	.flipped .white-score {
		top: 8px;
		bottom: auto;
	}

	/* Black score label is at the top of the bar */
	.black-score {
		top: 8px;
		color: #ffffff;
	}

	.flipped .black-score {
		bottom: 8px;
		top: auto;
	}

	.hidden {
		opacity: 0;
	}
</style>
