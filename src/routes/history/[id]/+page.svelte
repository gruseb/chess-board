<script lang="ts">
    import { Chess } from 'chess.js';
    import ChessBoard from '$lib/components/ChessBoard.svelte';
    import { base } from '$app/paths';
    import { game } from '$lib/game.svelte';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    let { data } = $props();
    
    // Load the game into the store for viewing
    onMount(() => {
        if (data.game && data.game.pgn) {
            game.loadPgn(data.game.pgn, 'view');
        }
    });

    // Extract move list for display
    const moveList = $derived.by(() => {
        const c = new Chess();
        if (data.game && data.game.pgn) {
            c.loadPgn(data.game.pgn);
            return c.history();
        }
        return [];
    });

    function jumpTo(index: number) {
        game.jumpToHistoryIndex(index);
    }
</script>

<div class="max-w-6xl mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 items-start">
    <div class="flex-1 w-full max-w-[600px]">
        <a href="{base}/history/" class="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6 font-semibold">
            <span class="material-symbols-outlined">arrow_back</span>
            Zurück zur Übersicht
        </a>
        
        <!-- Board -->
        <div class="mb-6">
            <ChessBoard />
        </div>

    </div>

    <div class="w-full lg:w-[450px] space-y-6">
        <!-- Game Info -->
        <div class="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
            <h2 class="text-xl font-headline text-on-surface font-bold mb-6">Spieldetails</h2>
            
            <div class="space-y-4">
                <div class="flex justify-between pb-2 border-b border-outline-variant/10">
                    <span class="text-on-surface-variant text-sm">Datum</span>
                    <span class="font-medium text-on-surface">{new Date(data.game.created_at).toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between pb-2 border-b border-outline-variant/10">
                    <span class="text-on-surface-variant text-sm">Weiß</span>
                    <span class="font-medium text-on-surface">{data.game.white_player}</span>
                </div>
                <div class="flex justify-between pb-2 border-b border-outline-variant/10">
                    <span class="text-on-surface-variant text-sm">Schwarz</span>
                    <span class="font-medium text-on-surface">{data.game.black_player} {data.game.difficulty ? `(Lvl ${data.game.difficulty})` : ''}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-on-surface-variant text-sm">Ergebnis</span>
                    <span class="font-bold text-primary uppercase tracking-wider">
                        {#if data.game.result === 'white_won'}
                            Weiß gewinnt
                        {:else if data.game.result === 'black_won'}
                            Schwarz gewinnt
                        {:else}
                            Remis
                        {/if}
                    </span>
                </div>
            </div>

            <!-- Advanced Actions -->
            <div class="mt-8 pt-6 border-t border-outline-variant/10 grid grid-cols-2 gap-3">
                <button 
                    onclick={() => {
                        game.loadPgn(data.game.pgn, 'local');
                        goto(`${base}/`);
                    }}
                    class="flex flex-col items-center gap-2 p-3 bg-surface-container-highest/50 rounded-xl hover:bg-secondary/10 text-on-surface hover:text-secondary transition-all border border-outline-variant/10"
                >
                    <span class="material-symbols-outlined">play_arrow</span>
                    <span class="text-[10px] font-bold uppercase tracking-tighter">Fortsetzen</span>
                </button>

                <button 
                    onclick={() => {
                        game.loadPgn(data.game.pgn, 'analysis', false, false);
                        goto(`${base}/analysis`);
                    }}
                    class="flex flex-col items-center gap-2 p-3 bg-surface-container-highest/50 rounded-xl hover:bg-primary/10 text-on-surface hover:text-primary transition-all border border-outline-variant/10"
                >
                    <span class="material-symbols-outlined">psychology</span>
                    <span class="text-[10px] font-bold uppercase tracking-tighter">Analyse</span>
                </button>

                <button 
                    onclick={() => {
                        game.loadPgn(data.game.pgn, 'analysis', true);
                        goto(`${base}/analysis`);
                    }}
                    disabled={!game.canAnalyze(data.game.created_at)}
                    class="flex flex-col items-center gap-2 p-3 bg-surface-container-highest/50 rounded-xl hover:bg-primary/10 text-on-surface hover:text-primary transition-all border border-outline-variant/10 disabled:opacity-20"
                >
                    <span class="material-symbols-outlined">precision_manufacturing</span>
                    <span class="text-[10px] font-bold uppercase tracking-tighter">Stockfish</span>
                </button>

                <button 
                    onclick={async () => {
                        if (confirm('Möchtest du diese Partie wirklich löschen?')) {
                            const success = await game.deleteGame(data.game.id);
                            if (success) {
                                goto(`${base}/history`);
                            }
                        }
                    }}
                    class="flex flex-col items-center gap-2 p-3 bg-surface-container-highest/50 rounded-xl hover:bg-error/10 text-on-surface hover:text-error transition-all border border-outline-variant/10"
                >
                    <span class="material-symbols-outlined">delete</span>
                    <span class="text-[10px] font-bold uppercase tracking-tighter">Löschen</span>
                </button>
            </div>
        </div>

        <!-- Move List -->
        <div class="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col max-h-[500px]">
            <h3 class="font-bold text-on-surface mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">list</span>
                Zugliste
            </h3>
            <div class="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar pr-2">
                <button 
                    onclick={() => jumpTo(-1)}
                    class="col-span-2 p-2 rounded-lg text-sm text-center transition-all {game.viewIndex === -1 ? 'bg-primary text-on-primary font-bold shadow-md' : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant'}"
                >
                    Startposition
                </button>
                
                {#each Array.from({ length: Math.ceil(moveList.length / 2) }) as _, i (i)}
                    {@const whiteIdx = i * 2}
                    {@const blackIdx = i * 2 + 1}
                    <div class="flex items-center gap-2 col-span-2 mt-1 first:mt-0">
                        <span class="text-[10px] text-outline w-6 text-right font-bold">{i + 1}.</span>
                        <div class="grid grid-cols-2 gap-2 flex-1">
                            <button 
                                onclick={() => jumpTo(whiteIdx)}
                                class="p-2 rounded-lg text-sm transition-all text-left {game.viewIndex === whiteIdx ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/30' : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface'}"
                            >
                                {moveList[i * 2]}
                            </button>
                            
                            {#if moveList[i * 2 + 1]}
                                <button 
                                    onclick={() => jumpTo(blackIdx)}
                                    class="p-2 rounded-lg text-sm transition-all text-left {game.viewIndex === blackIdx ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/30' : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface'}"
                                >
                                    {moveList[i * 2 + 1]}
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
