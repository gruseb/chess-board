<script lang="ts">
    let { data } = $props();
</script>

<div class="max-w-4xl mx-auto p-8">
    <h1 class="text-3xl font-headline font-bold text-primary mb-8">Partien-Historie</h1>
    
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
                {#each data.games as game}
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="p-4 text-on-surface">{new Date(game.created_at).toLocaleString()}</td>
                        <td class="p-4 text-on-surface">{game.white_player}</td>
                        <td class="p-4 text-on-surface">{game.black_player} {game.difficulty ? `(Lvl ${game.difficulty})` : ''}</td>
                        <td class="p-4">
                            {#if game.result === 'white_won'}
                                <span class="text-primary font-bold">1 - 0</span>
                            {:else if game.result === 'black_won'}
                                <span class="text-error font-bold">0 - 1</span>
                            {:else}
                                <span class="text-on-surface-variant font-bold">½ - ½</span>
                            {/if}
                        </td>
                        <td class="p-4">
                            <a href={`/history/${game.id}`} class="text-primary hover:underline font-semibold flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">visibility</span>
                                Ansehen
                            </a>
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
