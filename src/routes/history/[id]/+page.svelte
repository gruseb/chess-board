<script lang="ts">
    import { Chess } from 'chess.js';
    import Piece from '$lib/components/Piece.svelte';
    import { base } from '$app/paths';
    import { game } from '$lib/game.svelte';
    import { goto } from '$app/navigation';

    let { data } = $props();
    
    // Pre-calculate all states for smooth navigation
    const historyStates = $derived.by(() => {
        const c = new Chess();
        const states = [c.fen()]; // Start position
        if (data.game && data.game.pgn) {
            const temp = new Chess();
            temp.loadPgn(data.game.pgn);
            const moveHistory = temp.history();
            
            const replayer = new Chess();
            for (const move of moveHistory) {
                replayer.move(move);
                states.push(replayer.fen());
            }
        }
        return states;
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

    let currentIndex = $state(0);

    // Initialize to the end of the game
    $effect(() => {
        if (historyStates.length > 0) {
            currentIndex = historyStates.length - 1;
        }
    });

    let currentChess = $derived(new Chess(historyStates[currentIndex]));
    let board = $derived(currentChess.board());

    function goToStart() { currentIndex = 0; }
    function prevMove() { if (currentIndex > 0) currentIndex--; }
    function nextMove() { if (currentIndex < historyStates.length - 1) currentIndex++; }
    function goToEnd() { currentIndex = historyStates.length - 1; }

    function getSquare(rowIndex: number, colIndex: number): string {
		const file = String.fromCharCode('a'.charCodeAt(0) + colIndex);
		const rank = 8 - rowIndex;
		return `${file}${rank}`;
	}
</script>

<div class="max-w-6xl mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 items-start">
    <div class="flex-1 w-full max-w-[600px]">
        <a href="{base}/history/" class="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6 font-semibold">
            <span class="material-symbols-outlined">arrow_back</span>
            Zurück zur Übersicht
        </a>
        
        <!-- Board -->
        <div class="relative aspect-square w-full bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden p-2 group ring-1 ring-white/10 mb-6">
            <div class="absolute inset-0 mist-overlay opacity-30"></div>
            
            <!-- Coordinate Labels -->
            <div class="absolute top-1 left-4 right-4 flex justify-between text-[10px] text-outline uppercase font-bold tracking-widest opacity-30 z-10 pointer-events-none">
                <span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span><span>G</span><span>H</span>
            </div>

            <div class="w-full h-full rounded-lg overflow-hidden border border-outline-variant/20 grid grid-cols-8 grid-rows-8 relative z-20 pointer-events-none">
                {#each board as row, rowIndex (rowIndex)}
                    {#each row as piece, colIndex (getSquare(rowIndex, colIndex))}
                        {@const square = getSquare(rowIndex, colIndex)}
                        {@const isDark = (rowIndex + colIndex) % 2 === 1}
                        
                        <div class="relative flex items-center justify-center {isDark ? 'bg-[#333333]' : 'bg-[rgba(179,167,188,0.15)]'}">
                            <Piece {piece} {square} />
                        </div>
                    {/each}
                {/each}
            </div>
        </div>

        <!-- Navigation Controls -->
        <div class="flex items-center justify-center gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 shadow-lg">
            <button 
                onclick={goToStart}
                disabled={currentIndex === 0}
                class="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all text-primary"
                title="Start"
            >
                <span class="material-symbols-outlined text-3xl">first_page</span>
            </button>
            <button 
                onclick={prevMove}
                disabled={currentIndex === 0}
                class="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all text-primary"
                title="Vorheriger Zug"
            >
                <span class="material-symbols-outlined text-3xl">chevron_left</span>
            </button>
            <div class="px-4 py-1 bg-surface-container-lowest rounded-full border border-outline-variant/20 font-mono font-bold text-lg min-w-[80px] text-center">
                {currentIndex} / {historyStates.length - 1}
            </div>
            <button 
                onclick={nextMove}
                disabled={currentIndex === historyStates.length - 1}
                class="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all text-primary"
                title="Nächster Zug"
            >
                <span class="material-symbols-outlined text-3xl">chevron_right</span>
            </button>
            <button 
                onclick={goToEnd}
                disabled={currentIndex === historyStates.length - 1}
                class="p-2 rounded-lg hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all text-primary"
                title="Ende"
            >
                <span class="material-symbols-outlined text-3xl">last_page</span>
            </button>
        </div>
    </div>

    <div class="w-full lg:w-[450px] space-y-6">
        <!-- Game Info -->
        <div class="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
            <h2 class="text-xl font-headline font-bold text-primary mb-6">Spieldetails</h2>
            
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
                        game.loadPgn(data.game.pgn, 'analysis');
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
            <h3 class="font-bold text-primary mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined">list</span>
                Zugliste
            </h3>
            <div class="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar pr-2">
                <button 
                    onclick={() => currentIndex = 0}
                    class="col-span-2 p-2 rounded-lg text-sm text-center transition-all {currentIndex === 0 ? 'bg-primary text-on-primary font-bold shadow-md' : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant'}"
                >
                    Startposition
                </button>
                
                {#each Array.from({ length: Math.ceil(moveList.length / 2) }) as _, i (i)}
                    {@const whiteIdx = i * 2 + 1}
                    {@const blackIdx = i * 2 + 2}
                    <div class="flex items-center gap-2 col-span-2 mt-1 first:mt-0">
                        <span class="text-[10px] text-outline w-6 text-right font-bold">{i + 1}.</span>
                        <div class="grid grid-cols-2 gap-2 flex-1">
                            <button 
                                onclick={() => currentIndex = whiteIdx}
                                class="p-2 rounded-lg text-sm transition-all text-left {currentIndex === whiteIdx ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/30' : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface'}"
                            >
                                {moveList[i * 2]}
                            </button>
                            
                            {#if moveList[i * 2 + 1]}
                                <button 
                                    onclick={() => currentIndex = blackIdx}
                                    class="p-2 rounded-lg text-sm transition-all text-left {currentIndex === blackIdx ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/30' : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface'}"
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
