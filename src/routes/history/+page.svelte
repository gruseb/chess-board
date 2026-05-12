<script lang="ts">
    import { base } from '$app/paths';
    import { game } from '$lib/game.svelte';
    import { goto } from '$app/navigation';
    let { data } = $props();
</script>

<div class="max-w-4xl mx-auto p-8">
    <h1 class="text-3xl font-headline font-bold text-primary mb-8">Partien-Historie</h1>
    
    {#if data.syncResult.error}
        <div class="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error flex items-center gap-3">
            <span class="material-symbols-outlined">warning</span>
            <p class="text-sm">Fehler beim Lichess-Sync: {data.syncResult.error}</p>
        </div>
    {:else if data.syncResult.success}
        <div class="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary flex items-center gap-3">
            <span class="material-symbols-outlined">sync</span>
            <p class="text-sm">{data.syncResult.count} Partien von Lichess synchronisiert.</p>
        </div>
    {/if}
    <div class="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden shadow-xl">
        <table class="w-full text-left">
            <thead class="bg-surface-container border-b border-outline-variant/10">
                <tr>
                    <th class="p-4 font-semibold text-on-surface-variant">Datum</th>
                    <th class="p-4 font-semibold text-on-surface-variant">Weiß</th>
                    <th class="p-4 font-semibold text-on-surface-variant">Schwarz</th>
                    <th class="p-4 font-semibold text-on-surface-variant">Ergebnis</th>
                    <th class="p-4 font-semibold text-on-surface-variant">Aktion</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/5">
                {#each data.games as match (match.id)}                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="p-4 text-on-surface text-sm">
                            <div class="flex items-center gap-2">
                                {#if match.source === 'lichess'}
                                    <span class="w-2 h-2 rounded-full bg-[#f0d9b5]" title="Lichess.org"></span>
                                {:else}
                                    <span class="w-2 h-2 rounded-full bg-primary" title="Lokal"></span>
                                {/if}
                                {new Date(match.created_at).toLocaleString()}
                            </div>
                        </td>
                        <td class="p-4 text-on-surface">{match.white_player}</td>
                        <td class="p-4 text-on-surface">{match.black_player} {match.difficulty ? `(Lvl ${match.difficulty})` : ''}</td>
                        <td class="p-4">
                            {#if match.result === 'white_won'}
                                <span class="text-primary font-bold">1 - 0</span>
                            {:else if match.result === 'black_won'}
                                <span class="text-error font-bold">0 - 1</span>
                            {:else}
                                <span class="text-on-surface-variant font-bold">½ - ½</span>
                            {/if}
                        </td>
                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                <a href="{base}/history/{match.id}" 
                                   class="p-2 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all group"
                                   title="Ansehen">
                                    <span class="material-symbols-outlined text-xl">visibility</span>
                                </a>

                                <button 
                                    onclick={() => {
                                        game.loadPgn(match.pgn, 'local');
                                        goto(`${base}/`);
                                    }}
                                    class="p-2 rounded-lg hover:bg-secondary/10 text-on-surface-variant hover:text-secondary transition-all"
                                    title="Partie fortsetzen"
                                >
                                    <span class="material-symbols-outlined text-xl">play_arrow</span>
                                </button>

                                <button 
                                    onclick={() => {
                                        game.loadPgn(match.pgn, 'analysis');
                                        goto(`${base}/analysis`);
                                    }}
                                    class="p-2 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all"
                                    title="Selbst analysieren"
                                >
                                    <span class="material-symbols-outlined text-xl">psychology</span>
                                </button>

                                <button 
                                    onclick={() => {
                                        game.loadPgn(match.pgn, 'analysis', true);
                                        goto(`${base}/analysis`);
                                    }}
                                    disabled={match.source !== 'lichess' && !game.canAnalyze(match.created_at)}
                                    class="p-2 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                    title={match.source === 'lichess' || game.canAnalyze(match.created_at) ? 'Stockfish analysieren' : 'Analyse erst nach 24h verfügbar'}
                                >
                                    <span class="material-symbols-outlined text-xl">precision_manufacturing</span>
                                </button>

                                <button 
                                    onclick={async () => {
                                        if (confirm('Möchtest du diese Partie wirklich löschen?')) {
                                            const success = await game.deleteGame(match.id);
                                            if (success) {
                                                window.location.reload();
                                            }
                                        }
                                    }}
                                    class="p-2 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all"
                                    title="Löschen"
                                >
                                    <span class="material-symbols-outlined text-xl">delete</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                {:else}
                    <tr>
                        <td colspan="5" class="p-8 text-center text-on-surface-variant">Noch keine Partien gespeichert. Spiel erst eine Partie zu Ende!</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
