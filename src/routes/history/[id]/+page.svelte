<script lang="ts">
    import { Chess } from 'chess.js';
    import Piece from '$lib/components/Piece.svelte';
    import { base } from '$app/paths';

    let { data } = $props();
    
    // Wir erstellen ein lokales, passives Schachbrett für diese Ansicht
    let chess = $derived.by(() => {
        const c = new Chess();
        if (data.game && data.game.pgn) {
            c.loadPgn(data.game.pgn);
        }
        return c;
    });
    let board = $derived(chess.board());

    function getSquare(rowIndex: number, colIndex: number): string {
		const file = String.fromCharCode('a'.charCodeAt(0) + colIndex);
		const rank = 8 - rowIndex;
		return `${file}${rank}`;
	}
</script>

<div class="max-w-5xl mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 items-start">
    <div class="flex-1 w-full max-w-[600px]">
        <a href="{base}/history/" class="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6 font-semibold">
            <span class="material-symbols-outlined">arrow_back</span>
            Zurück zur Übersicht
        </a>
        
        <!-- Board copy, not interactive -->
        <div class="relative aspect-square w-full bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden p-2 group ring-1 ring-white/10">
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
    </div>

    <div class="w-full lg:w-[400px] bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
        <h2 class="text-2xl font-headline font-bold text-primary mb-6">Spieldetails</h2>
        
        <div class="space-y-4 mb-8">
            <div class="flex justify-between pb-2 border-b border-outline-variant/10">
                <span class="text-on-surface-variant">Gespielt am</span>
                <span class="font-medium text-on-surface">{new Date(data.game.created_at).toLocaleString()}</span>
            </div>
            <div class="flex justify-between pb-2 border-b border-outline-variant/10">
                <span class="text-on-surface-variant">Weiß</span>
                <span class="font-medium text-on-surface">{data.game.white_player}</span>
            </div>
            <div class="flex justify-between pb-2 border-b border-outline-variant/10">
                <span class="text-on-surface-variant">Schwarz</span>
                <span class="font-medium text-on-surface">{data.game.black_player} {data.game.difficulty ? `(Lvl ${data.game.difficulty})` : ''}</span>
            </div>
            <div class="flex justify-between pb-2 border-b border-outline-variant/10">
                <span class="text-on-surface-variant">Ergebnis</span>
                <span class="font-medium text-on-surface">
                    {#if data.game.result === 'white_won'}
                        Weiß gewinnt
                    {:else if data.game.result === 'black_won'}
                        Schwarz gewinnt
                    {:else}
                        Unentschieden
                    {/if}
                </span>
            </div>
        </div>

        <h3 class="font-semibold text-primary mb-3">Zughistorie (PGN)</h3>
        <div class="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/5 text-sm font-mono text-on-surface-variant overflow-x-auto whitespace-pre-wrap max-h-[300px] custom-scrollbar">
            {data.game.pgn}
        </div>
    </div>
</div>
