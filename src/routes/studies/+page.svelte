<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	let studyId = $state('Us4CtOxW'); // Default to the specific study
	let importing = $state(false);
	let importMessage = $state<string | null>(null);
	let importError = $state<string | null>(null);
	let importStats = $state<{ imported: number; updated: number; total: number } | null>(null);
	let session = $state<{ access_token: string } | null>(null);

	onMount(async () => {
		const { data: s } = await supabase.auth.getSession();
		session = s.session;
		supabase.auth.onAuthStateChange((_event, s) => {
			session = s;
		});
	});

	async function runImport(rawId: string) {
		if (!rawId.trim()) {
			importError = 'Bitte eine Lichess-Studie-ID eingeben.';
			return;
		}

		importing = true;
		importMessage = null;
		importError = null;
		importStats = null;

		try {
			const cleanId = rawId
				.trim()
				.replace(/^https:\/\/lichess\.org\/study\//, '')
				.split('/')[0];

			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};
			if (session?.access_token) {
				headers['Authorization'] = `Bearer ${session.access_token}`;
			}

			const resp = await fetch(`${base}/api/import-study`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ study_id: cleanId })
			});

			const result = await resp.json();

			if (!resp.ok) {
				importError = result.message ?? `Fehler ${resp.status}`;
			} else {
				importMessage = result.message;
				importStats = { imported: result.imported, updated: result.updated, total: result.total };
				await invalidateAll();
			}
		} catch (e) {
			importError = 'Netzwerkfehler. Bitte versuche es erneut.';
		} finally {
			importing = false;
		}
	}

	async function importStudy() {
		await runImport(studyId);
	}

	// Helper: how many positions in a study have explanations
	function countWithExplanation(positions: typeof data.positions) {
		return positions.filter((p) => p.explanation && p.explanation.trim().length > 0).length;
	}
</script>

<svelte:head>
	<title>Studien-Training | The Ethereal Grandmaster</title>
</svelte:head>

<main
	class="animate-in fade-in mx-auto flex w-full max-w-6xl flex-col gap-10 p-6 duration-700 lg:p-12"
>
	<!-- Header -->
	<section class="space-y-2">
		<h1 class="font-['Epilogue'] text-4xl font-bold tracking-tight text-on-surface">
			Lichess <span class="text-primary italic">Studien</span>
		</h1>
		<p class="max-w-2xl text-sm text-on-surface-variant">
			Importiere wichtige Stellungen aus deinen privaten Lichess-Studien. Züge mit
			<code class="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">!</code>
			oder
			<code class="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">!!</code>
			gelten als gesuchte Züge. Du kannst dann gezielt diese Schlüsselstellungen trainieren.
		</p>
	</section>

	<!-- Import Card -->
	<section
		class="rounded-3xl border border-outline-variant/10 bg-surface-container-low p-6 shadow-xl"
	>
		<div class="mb-6 flex items-center gap-3">
			<span class="material-symbols-outlined text-3xl text-primary">cloud_download</span>
			<h2 class="font-['Epilogue'] text-xl font-bold text-on-surface">Studie importieren</h2>
		</div>

		<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
			<div class="flex-1 space-y-2">
				<label class="text-sm font-semibold text-on-surface" for="study-id-input">
					Lichess Studie-ID oder URL
				</label>
				<input
					id="study-id-input"
					class="w-full rounded-xl border border-outline-variant/20 bg-surface-container-highest px-4 py-3 font-mono text-sm text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:outline-none"
					placeholder="Us4CtOxW  oder  https://lichess.org/study/Us4CtOxW"
					bind:value={studyId}
					disabled={importing}
				/>
				<p class="text-xs text-on-surface-variant/70">
					Dein Lichess API-Token (mit <span class="font-semibold">study:read</span>-Berechtigung)
					muss im
					<a href="{base}/account" class="text-primary hover:underline">Account-Bereich</a> hinterlegt
					sein.
				</p>
			</div>
			<button
				onclick={importStudy}
				disabled={importing || !studyId.trim()}
				class="flex shrink-0 items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-on-primary-container shadow-lg shadow-primary/25 transition-all hover:bg-primary-container active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if importing}
					<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span>
					Wird importiert...
				{:else}
					<span class="material-symbols-outlined text-lg">download</span>
					Importieren
				{/if}
			</button>
		</div>

		<!-- Import feedback -->
		{#if importMessage && importStats}
			<div
				class="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4"
			>
				<div class="flex items-center gap-2 text-emerald-300">
					<span class="material-symbols-outlined">check_circle</span>
					<span class="font-bold">{importMessage}</span>
				</div>
				<div class="flex flex-wrap gap-4 text-xs text-emerald-200/80">
					<span>✦ <strong>{importStats.imported}</strong> neu importiert</span>
					<span>✦ <strong>{importStats.updated}</strong> aktualisiert</span>
					<span>✦ <strong>{importStats.total}</strong> gesamt gefunden</span>
				</div>
			</div>
		{:else if importError}
			<div
				class="mt-5 flex items-start gap-2 rounded-2xl border border-error/25 bg-error/10 p-4 text-sm text-error"
			>
				<span class="material-symbols-outlined shrink-0">error</span>
				<span>{importError}</span>
			</div>
		{/if}
	</section>

	<!-- Imported Positions by Study -->
	{#if Object.keys(data.grouped).length === 0}
		<section
			class="flex flex-col items-center justify-center gap-4 rounded-3xl border border-outline-variant/10 bg-surface-container-low p-12 text-center shadow-xl"
		>
			<span class="material-symbols-outlined text-5xl text-on-surface-variant/40">menu_book</span>
			<div class="space-y-1">
				<h2 class="text-lg font-bold text-on-surface-variant">Noch keine Stellungen importiert</h2>
				<p class="max-w-sm text-sm text-on-surface-variant/70">
					Importiere eine Lichess-Studie, um Stellungen mit wichtigen Zügen hier zu sehen.
				</p>
			</div>
		</section>
	{:else}
		{#each Object.entries(data.grouped) as [studyTitle, positions] (studyTitle)}
			<section class="space-y-4">
				<!-- Study Header -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<span class="material-symbols-outlined text-2xl text-secondary">school</span>
						<h2 class="font-['Epilogue'] text-2xl font-bold text-on-surface">{studyTitle}</h2>
						<span
							class="rounded-full border border-secondary/25 bg-secondary/10 px-3 py-0.5 text-xs font-bold text-secondary"
						>
							{positions.length} Stellung{positions.length !== 1 ? 'en' : ''}
						</span>
					</div>
					<div class="flex items-center gap-3">
						<button
							onclick={() => runImport(positions[0]?.study_id ?? '')}
							disabled={importing}
							class="flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-highest px-4 py-2 text-sm font-bold text-on-surface transition-all hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span class="material-symbols-outlined text-base">sync</span>
							Synchronisieren
						</button>
						<a
							href="{base}/studies/train?study={positions[0]?.study_id ?? ''}"
							class="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-all hover:border-primary hover:bg-primary/18"
						>
							<span class="material-symbols-outlined text-base">play_circle</span>
							Alle trainieren
						</a>
					</div>
				</div>

				<!-- Position Cards -->
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each positions as pos (pos.id)}
						<div
							class="group flex flex-col gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5 shadow-lg transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
						>
							<div class="space-y-1">
								<p class="text-[10px] font-bold tracking-widest text-outline-variant uppercase">
									Stellung
								</p>
								<h3 class="line-clamp-2 leading-tight font-semibold text-on-surface">
									{pos.title ?? 'Unbenannte Stellung'}
								</h3>
							</div>

							<div class="flex items-center gap-2">
								<span
									class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold {pos.color_to_move ===
									'white'
										? 'border-stone-400/30 bg-stone-100/10 text-stone-200'
										: 'border-slate-700/30 bg-slate-900/30 text-slate-300'}"
								>
									<span
										class="inline-block h-2.5 w-2.5 rounded-full border {pos.color_to_move ===
										'white'
											? 'border-stone-300/50 bg-stone-100'
											: 'border-slate-600/50 bg-slate-800'}"
									></span>
									{pos.color_to_move === 'white' ? 'Weiß am Zug' : 'Schwarz am Zug'}
								</span>

								{#if pos.explanation && pos.explanation.trim().length > 0}
									<span
										class="rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase"
									>
										Erklärung
									</span>
								{/if}
							</div>

							{#if pos.explanation && pos.explanation.trim().length > 0}
								<p class="line-clamp-2 text-xs leading-relaxed text-on-surface-variant/80">
									{pos.explanation}
								</p>
							{/if}

							<a
								href="{base}/studies/train?position={pos.id}"
								class="mt-auto flex items-center justify-center gap-2 rounded-xl border border-outline-variant/15 bg-surface-container-highest px-4 py-2.5 text-sm font-bold text-on-surface transition-all group-hover:border-primary/20 hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
							>
								<span class="material-symbols-outlined text-base">fitness_center</span>
								Trainieren
							</a>
						</div>
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</main>
