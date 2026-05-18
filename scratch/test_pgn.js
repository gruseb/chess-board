// Test the annotation parsing logic extracted from +server.ts
import { Chess } from 'chess.js';

function stripAnnotations(token) {
    return token.replace(/[!?+#=]/g, '').replace(/\$\d+/g, '').trim();
}

function parseMoveAnnotations(movetext, expectedMoveCount) {
    const annotations = Array.from({ length: expectedMoveCount }, () => ({
        hasExclamation: false, commentBefore: null, commentAfter: null
    }));

    let pos = 0;
    const text = movetext;
    let moveIndex = 0;
    let lastComment = null;
    let waitingForMoveComment = false;

    while (pos < text.length) {
        if (/\s/.test(text[pos])) { pos++; continue; }

        // Comment: { ... }
        if (text[pos] === '{') {
            const end = text.indexOf('}', pos);
            if (end === -1) break;
            const comment = text.slice(pos + 1, end).trim();
            if (waitingForMoveComment && moveIndex > 0 && moveIndex - 1 < annotations.length) {
                annotations[moveIndex - 1].commentAfter = comment;
                waitingForMoveComment = false;
            } else { lastComment = comment; }
            pos = end + 1; continue;
        }

        // NAG: $N
        if (text[pos] === '$') {
            let i = pos + 1;
            while (i < text.length && /\d/.test(text[i])) i++;
            const nag = parseInt(text.slice(pos + 1, i), 10);
            if ((nag === 1 || nag === 3) && moveIndex > 0 && moveIndex - 1 < annotations.length) {
                annotations[moveIndex - 1].hasExclamation = true;
                if (lastComment && !annotations[moveIndex - 1].commentBefore) {
                    annotations[moveIndex - 1].commentBefore = lastComment;
                    lastComment = null;
                }
                waitingForMoveComment = true;
            }
            pos = i; continue;
        }

        // Game result
        if (text[pos] === '*') { pos++; continue; }
        const resultMatch = text.slice(pos).match(/^(1-0|0-1|1\/2-1\/2)/);
        if (resultMatch) { pos += resultMatch[0].length; continue; }

        // Move number: digits followed by dots
        if (/\d/.test(text[pos])) {
            let i = pos;
            while (i < text.length && /[\d.]/.test(text[i])) i++;
            pos = i; continue;
        }

        // Parenthetical variation: skip entirely
        if (text[pos] === '(') {
            let depth = 1; pos++;
            while (pos < text.length && depth > 0) {
                if (text[pos] === '(') depth++;
                else if (text[pos] === ')') depth--;
                pos++;
            }
            continue;
        }

        // Move token
        if (/[a-hA-HRNBQKOx0-9\-+#=]/.test(text[pos])) {
            let i = pos;
            while (i < text.length && !/[\s{($*]/.test(text[i])) i++;
            const token = text.slice(pos, i);
            pos = i;

            const hasExcl = /!/.test(token);
            const cleanMove = stripAnnotations(token);

            if (cleanMove.length > 0 && /^[a-hA-HRNBQKO]/.test(cleanMove)) {
                if (moveIndex < annotations.length) {
                    if (lastComment !== null) {
                        annotations[moveIndex].commentBefore = lastComment;
                        lastComment = null;
                    }
                    if (hasExcl) {
                        annotations[moveIndex].hasExclamation = true;
                        waitingForMoveComment = true;
                    } else { waitingForMoveComment = false; }
                }
                moveIndex++;
            }
            continue;
        }
        pos++;
    }
    return annotations;
}

function parseChapter(chapterPgn, studyId) {
    const positions = [];
    const eventMatch = chapterPgn.match(/\[Event\s+"([^"]+)"\]/);
    let chapterTitle = eventMatch?.[1] ?? 'Lichess Study';
    if (chapterTitle.includes(': ')) {
        const parts = chapterTitle.split(': ');
        chapterTitle = parts.slice(1).join(': ');
    }
    const studyTitle = eventMatch?.[1]?.split(': ')[0] ?? chapterTitle;

    const chess = new Chess();
    chess.loadPgn(chapterPgn);
    const history = chess.history({ verbose: true });
    if (history.length === 0) { console.log('  No history!'); return positions; }

    const headersEnd = chapterPgn.lastIndexOf(']');
    const movetext = headersEnd >= 0 ? chapterPgn.slice(headersEnd + 1).trim() : chapterPgn;

    const moveAnnotations = parseMoveAnnotations(movetext, history.length);

    // Count annotated moves
    const annotated = moveAnnotations.filter(a => a.hasExclamation);
    console.log(`  Chapter "${chapterTitle}": ${history.length} moves, ${annotated.length} annotated`);
    annotated.forEach((a, idx) => {
        const moveIdx = moveAnnotations.indexOf(a);
        console.log(`    Move ${moveIdx + 1}: ${history[moveIdx]?.san} | explanation: "${a.commentAfter ?? a.commentBefore ?? '(none)'}"`);
    });

    const replayChess = new Chess();
    const fenHeader = chess.header()?.FEN;
    if (fenHeader) replayChess.load(fenHeader);

    for (let i = 0; i < history.length; i++) {
        const annotation = moveAnnotations[i];
        const fenBeforeMove = replayChess.fen();
        try { replayChess.move(history[i].san); } catch { break; }

        if (annotation?.hasExclamation) {
            const move = history[i];
            let uciMove = move.from + move.to;
            if (move.promotion) uciMove += move.promotion;
            positions.push({
                fen: fenBeforeMove,
                color_to_move: history[i].color === 'w' ? 'white' : 'black',
                correct_moves: [uciMove],
                explanation: (annotation.commentAfter ?? annotation.commentBefore ?? '').trim(),
                title: `${chapterTitle}: ${history[i].san}!`,
                study_id: studyId, study_title: studyTitle
            });
        }
    }
    return positions;
}

// --- TESTS ---

// Test 1: literal ! annotation
const pgn1 = `[Event "Endgames: Bishop endings"]

1. e4! {Dieser Zug ist sehr stark.} e5 2. Nf3 Nc6 *`;

console.log('Test 1: literal ! annotation');
const r1 = parseChapter(pgn1, 'test1');
console.log('  Positions found:', r1.length, r1.map(p => p.correct_moves[0] + ' | ' + p.explanation));

// Test 2: NAG $1 annotation
const pgn2 = `[Event "Endgames: Rook endings"]

1. d4 $1 {Sehr gut!} d5 2. c4 $3 {Noch besser!} e6 *`;

console.log('\nTest 2: NAG $1 and $3 annotation');
const r2 = parseChapter(pgn2, 'test2');
console.log('  Positions found:', r2.length, r2.map(p => p.correct_moves[0] + ' | ' + p.explanation));

// Test 3: Lichess-style with comment before ! move
const pgn3 = `[Event "Study: Chapter 1"]

1. e4 e5 2. Nf3 {Dies ist ein guter Zug} Nc6!! {Sehr stark!} 3. Bb5 *`;

console.log('\nTest 3: !! annotation with comment before and after');
const r3 = parseChapter(pgn3, 'test3');
console.log('  Positions found:', r3.length, r3.map(p => p.correct_moves[0] + ' | ' + p.explanation));

// Test 4: Subvariations (should be skipped)
const pgn4 = `[Event "Endgames: Pawn endings"]

1. e4 e5 (1... c5 2. Nf3) 2. Nc3! {Der beste Zug} *`;

console.log('\nTest 4: with subvariation (should be skipped in parsing)');
const r4 = parseChapter(pgn4, 'test4');
console.log('  Positions found:', r4.length, r4.map(p => p.correct_moves[0] + ' | ' + p.explanation));
