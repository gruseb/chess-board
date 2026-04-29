<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>The Ethereal Grandmaster</title>
	<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
	<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
</svelte:head>

<div class="dark min-h-screen flex flex-col">
	{@render children()}
</div>
