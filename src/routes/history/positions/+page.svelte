<script lang="ts">
    import { base } from '$app/paths';
    import { game } from '$lib/game.svelte';
    import { goto } from '$app/navigation';
    
    let { data } = $props();


    function viewPosition(pos: any) {
        if (pos.partie?.pgn) {
            game.loadPgn(pos.partie.pgn, 'view');
        } else {
            game.loadFen(pos.fen, 'view');
        }
        goto(`${base}/`);
    }

    function continuePlaying(pos: any) {
        if (pos.partie?.pgn) {
            game.loadPgn(pos.partie.pgn, 'engine');
        } else {
            game.loadFen(pos.fen, 'engine');
        }
        goto(`${base}/`);
    }

    function startAnalysis(pos: any) {
        if (pos.partie?.pgn) {
            game.loadPgn(pos.partie.pgn, 'analysis', true);
        } else {
            game.loadFen(pos.fen, 'analysis', true);
        }
        goto(`${base}/analysis`);
    }
</script>

<div class="max-w-4xl mx-auto p-8">
    <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-headline font-bold text-primary">Gespeicherte Positionen</h1>
        <a href="{base}/history/" class="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">history</span>
            Zur Partie-Historie
        </a>
    </div>
    
    <div class="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden shadow-xl">
        <table class="w-full text-left">
            <thead class="bg-surface-container border-b border-outline-variant/10">
                <tr>
                    <th class="p-4 font-semibold text-on-surface-variant">Datum</th>
                    <th class="p-4 font-semibold text-on-surface-variant">Titel</th>
                    <th class="p-4 font-semibold text-on-surface-variant">Am Zug</th>
                    <th class="p-4 font-semibold text-on-surface-variant">Aktionen</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/5">
                {#each data.positions as pos (pos.id)}
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="p-4 text-on-surface text-sm">{new Date(pos.created_at).toLocaleString()}</td>
                        <td class="p-4 text-on-surface font-medium">{pos.title || 'Ohne Titel'}</td>
                        <td class="p-4">
                            <span class="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                                {pos.color_to_move === 'white' ? 'bg-primary/20 text-primary' : 'bg-surface-container-highest text-on-surface-variant'}">
                                {pos.color_to_move === 'white' ? 'Weiß' : 'Schwarz'}
                            </span>
                        </td>
                        <td class="p-4">
                            <div class="flex flex-wrap gap-3">
                                <button 
                                    onclick={() => viewPosition(pos)}
                                    class="text-on-surface hover:text-primary font-semibold flex items-center gap-1 transition-colors"
                                    title="Stellung ansehen"
                                >
                                    <span class="material-symbols-outlined text-sm">visibility</span>
                                    Ansehen
                                </button>
                                <button 
                                    onclick={() => continuePlaying(pos)}
                                    class="text-primary hover:text-primary-container font-semibold flex items-center gap-1 transition-colors"
                                    title="Gegen Stockfish weiterspielen"
                                >
                                    <span class="material-symbols-outlined text-sm">psychology</span>
                                    Weiterspielen
                                </button>
                                <button 
                                    onclick={() => startAnalysis(pos)}
                                    class="text-secondary hover:text-secondary-container font-semibold flex items-center gap-1 transition-colors"
                                    title="Stellung mit Stockfish analysieren"
                                >
                                    <span class="material-symbols-outlined text-sm">analytics</span>
                                    Analyse
                                </button>
                            </div>
                        </td>
                    </tr>
                {:else}
                    <tr>
                        <td colspan="4" class="p-8 text-center text-on-surface-variant">Noch keine Positionen gespeichert. Nutze den "Position speichern" Button während einer Partie!</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
