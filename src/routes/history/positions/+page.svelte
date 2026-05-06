<script lang="ts">
    import { base } from '$app/paths';
    import { game } from '$lib/game.svelte';
    import { goto } from '$app/navigation';
    
    let { data } = $props();

    function openPosition(fen: string) {
        game.loadFen(fen);
        goto(`${base}/`);
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
                    <th class="p-4 font-semibold text-on-surface-variant">Aktion</th>
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
                            <button 
                                onclick={() => openPosition(pos.fen)}
                                class="text-primary hover:underline font-semibold flex items-center gap-1"
                            >
                                <span class="material-symbols-outlined text-sm">play_circle</span>
                                Öffnen
                            </button>
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
