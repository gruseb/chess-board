<script lang="ts">
	import './layout.css';
	let { children } = $props();
	import { page } from '$app/stores';
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Chessboard</title>
	<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
	<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
</svelte:head>

<!-- TopNavBar -->
<header class="bg-slate-950/80 backdrop-blur-xl font-['Epilogue'] tracking-tight top-0 sticky z-50 border-b border-transparent bg-linear-to-b from-slate-900 to-transparent shadow-[0_4px_20px_rgba(255,145,84,0.1)] flex justify-between items-center w-full px-6 py-4">
	<div class="flex items-center gap-8">
		<a href="{base}/" class="text-2xl font-bold text-primary italic hover:text-primary-container transition-colors">The Ethereal Grandmaster</a>
		<nav class="flex gap-6">
			<a href="{base}/" class="text-sm font-semibold {$page.url.pathname === `${base}/` ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors">Play</a>
			<a href="{base}/analysis" class="text-sm font-semibold {$page.url.pathname.startsWith(`${base}/analysis`) ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors">Analyse</a>
			<a href="{base}/tactics" class="text-sm font-semibold {$page.url.pathname.startsWith(`${base}/tactics`) ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors">Tactics</a>
			<a href="{base}/history/" class="text-sm font-semibold {$page.url.pathname === `${base}/history/` ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors">Game History</a>
			<a href="{base}/history/positions/" class="text-sm font-semibold {$page.url.pathname.startsWith(`${base}/history/positions/`) ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors">Positions</a>
		</nav>
	</div>
	<div class="flex items-center gap-4">
		<div class="flex items-center gap-2 px-3 py-1 bg-surface-container-highest rounded-full border border-outline-variant/30">
			<span class="material-symbols-outlined text-primary">account_circle</span>
			<span class="text-sm font-medium">Player 1</span>
		</div>
	</div>
</header>

{@render children()}
