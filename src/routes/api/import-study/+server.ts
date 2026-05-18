import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Chess } from 'chess.js';
import { createClient } from '@supabase/supabase-js';
import { LICHESS_API_KEY } from '$env/static/private';

// Opt out of prerendering – this is a dynamic API route
export const prerender = false;

// Public Supabase credentials (same values as in supabaseClient.ts)
const SUPABASE_URL = 'https://ifdlaesktiljzuvqeaoj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZGxhZXNrdGlsanp1dnFlYW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDA2MjAsImV4cCI6MjA5MTIxNjYyMH0.FlNNPt0ety4Sdsqr5Wbdl8IGjUqfT2rABl4xHdIMIeo';

// We need a service-role or anon client server-side for DB access.
// Using the anon key + user's JWT (passed via header) is the correct pattern in SvelteKit.
// We create a server-side supabase client with the user's auth token.
function getServerSupabase(authToken?: string) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {},
        auth: { persistSession: false }
    });
    return client;
}

// Extracts the move string (e.g. "e4") from a PGN token, stripping annotations
function stripAnnotations(token: string): string {
    return token.replace(/[!?+#]/g, '').replace(/\$\d+/g, '').trim();
}

interface StudyPosition {
    fen: string;
    color_to_move: 'white' | 'black';
    correct_moves: string[];
    explanation: string;
    title: string;
    study_id: string;
    study_title: string;
}

/**
 * Parses a multi-game PGN (Lichess study export) and extracts positions
 * where a move is annotated with ! or !! (or NAG $1/$3).
 */
function extractStudyPositions(pgn: string, studyId: string): StudyPosition[] {
    const positions: StudyPosition[] = [];

    // Split into individual chapter PGNs by finding [Event tags
    // Lichess exports each chapter as a separate PGN game
    const chapters = pgn.split(/(?=\[Event\s+")/).filter((c) => c.trim().length > 0);

    for (const chapter of chapters) {
        try {
            const chapterPositions = parseChapter(chapter, studyId);
            positions.push(...chapterPositions);
        } catch (e) {
            console.warn('Failed to parse chapter, skipping:', e);
        }
    }

    return positions;
}

type ChapterToken =
    | { type: 'comment'; value: string }
    | { type: 'open'; value: '(' }
    | { type: 'close'; value: ')' }
    | { type: 'nag'; value: number }
    | { type: 'number'; value: string }
    | { type: 'result'; value: string }
    | { type: 'move'; value: string };

function parseChapter(chapterPgn: string, studyId: string): StudyPosition[] {
    const positions: StudyPosition[] = [];

    // Extract headers
    const eventMatch = chapterPgn.match(/\[Event\s+"([^"]+)"\]/);
    const siteMatch = chapterPgn.match(/\[Site\s+"([^"]+)"\]/);

    // Study title: use Event header or fall back to Site
    let chapterTitle = eventMatch?.[1] ?? siteMatch?.[1] ?? 'Lichess Study';
    // Clean up "Study: ..." prefix if present (Lichess format: "Study Name: Chapter Name")
    if (chapterTitle.includes(': ')) {
        const parts = chapterTitle.split(': ');
        chapterTitle = parts.slice(1).join(': ');
    }

    // Also extract study-level title (first part before ":")
    const studyTitle = eventMatch?.[1]?.split(': ')[0] ?? chapterTitle;

    // Extract movetext (after the headers block)
    const headersEnd = chapterPgn.lastIndexOf(']');
    const movetext = headersEnd >= 0 ? chapterPgn.slice(headersEnd + 1).trim() : chapterPgn;
    const tokens = tokenizeMovetext(movetext);

    const setupFenMatch = chapterPgn.match(/\[FEN\s+"([^"]+)"\]/);
    const setupFen = setupFenMatch?.[1];
    let initialBoard = new Chess();
    if (setupFen) {
        try {
            initialBoard = new Chess(setupFen);
        } catch {
            initialBoard = new Chess();
        }
    }

    function addPosition(
        fenBefore: string,
        colorToMove: 'white' | 'black',
        uciMove: string,
        explanation: string
    ) {
        positions.push({
            fen: fenBefore,
            color_to_move: colorToMove,
            correct_moves: [uciMove],
            explanation: explanation.trim(),
            title: chapterTitle,
            study_id: studyId,
            study_title: studyTitle
        });
    }

    function walk(startIndex: number, board: Chess): number {
        let i = startIndex;
        const boardHistory: Chess[] = [board];
        let lastComment: string | null = null;
        let waitingForMoveComment = false;
        let lastPositionIndex: number | null = null;
        let lastMoveContext: {
            fenBefore: string;
            colorToMove: 'white' | 'black';
            uciMove: string;
            commentBefore: string | null;
            imported: boolean;
        } | null = null;

        while (i < tokens.length) {
            const token = tokens[i];

            if (token.type === 'close') {
                return i;
            }

            if (token.type === 'open') {
                if (boardHistory.length >= 2) {
                    const preLastBoard = boardHistory[boardHistory.length - 2];
                    const varBoard = new Chess(preLastBoard.fen());
                    const nextIndex = walk(i + 1, varBoard);
                    i = nextIndex + 1;
                    continue;
                }
                i++;
                continue;
            }

            if (token.type === 'comment') {
                if (waitingForMoveComment && lastPositionIndex !== null) {
                    positions[lastPositionIndex].explanation = token.value.trim();
                    waitingForMoveComment = false;
                } else {
                    lastComment = token.value;
                }
                i++;
                continue;
            }

            if (token.type === 'nag') {
                if ((token.value === 1 || token.value === 3) && lastMoveContext && !lastMoveContext.imported) {
                    const explanation = lastMoveContext.commentBefore ?? '';
                    addPosition(
                        lastMoveContext.fenBefore,
                        lastMoveContext.colorToMove,
                        lastMoveContext.uciMove,
                        explanation
                    );
                    lastPositionIndex = positions.length - 1;
                    waitingForMoveComment = true;
                    lastMoveContext.imported = true;
                }
                i++;
                continue;
            }

            if (token.type === 'number' || token.type === 'result') {
                i++;
                continue;
            }

            if (token.type === 'move') {
                const moveStr = token.value;
                const hasExcl = /!/.test(moveStr);
                const cleanMove = stripAnnotations(moveStr);

                if (!cleanMove) {
                    i++;
                    continue;
                }

                const activeBoard = boardHistory[boardHistory.length - 1];
                const fenBefore = activeBoard.fen();
                const colorToMove: 'white' | 'black' = activeBoard.turn() === 'w' ? 'white' : 'black';
                const commentBefore = lastComment;
                lastComment = null;

                try {
                    const clonedBoard = new Chess(activeBoard.fen());
                    const moveObj = clonedBoard.move(cleanMove, { sloppy: true } as Parameters<typeof clonedBoard.move>[1]);
                    if (!moveObj) {
                        i++;
                        continue;
                    }

                    boardHistory.push(clonedBoard);
                    let uciMove = moveObj.from + moveObj.to;
                    if (moveObj.promotion) {
                        uciMove += moveObj.promotion;
                    }

                    lastMoveContext = {
                        fenBefore,
                        colorToMove,
                        uciMove,
                        commentBefore,
                        imported: false
                    };

                    if (hasExcl) {
                        const explanation = commentBefore ?? '';
                        addPosition(fenBefore, colorToMove, uciMove, explanation);
                        lastPositionIndex = positions.length - 1;
                        waitingForMoveComment = true;
                        lastMoveContext.imported = true;
                    } else {
                        waitingForMoveComment = false;
                        lastPositionIndex = null;
                    }
                } catch {
                    // Ignore invalid SAN in variations
                }

                i++;
                continue;
            }

            i++;
        }

        return i;
    }

    walk(0, initialBoard);
    return positions;
}

function tokenizeMovetext(movetext: string): ChapterToken[] {
    const tokens: ChapterToken[] = [];
    let pos = 0;

    while (pos < movetext.length) {
        const ch = movetext[pos];

        if (/\s/.test(ch)) {
            pos++;
            continue;
        }

        if (ch === ';') {
            const end = movetext.indexOf('\n', pos);
            const comment = movetext.slice(pos + 1, end === -1 ? movetext.length : end).trim();
            tokens.push({ type: 'comment', value: comment });
            pos = end === -1 ? movetext.length : end + 1;
            continue;
        }

        if (ch === '{') {
            const end = movetext.indexOf('}', pos);
            if (end === -1) break;
            const comment = movetext.slice(pos + 1, end).trim();
            tokens.push({ type: 'comment', value: comment });
            pos = end + 1;
            continue;
        }

        if (ch === '(') {
            tokens.push({ type: 'open', value: '(' });
            pos++;
            continue;
        }

        if (ch === ')') {
            tokens.push({ type: 'close', value: ')' });
            pos++;
            continue;
        }

        if (ch === '$') {
            let i = pos + 1;
            while (i < movetext.length && /\d/.test(movetext[i])) i++;
            const nag = parseInt(movetext.slice(pos + 1, i), 10);
            if (!Number.isNaN(nag)) {
                tokens.push({ type: 'nag', value: nag });
            }
            pos = i;
            continue;
        }

        if (ch === '*' || /[01]/.test(ch)) {
            const resultMatch = movetext.slice(pos).match(/^(\*|1-0|0-1|1\/2-1\/2)/);
            if (resultMatch) {
                tokens.push({ type: 'result', value: resultMatch[0] });
                pos += resultMatch[0].length;
                continue;
            }
        }

        if (/\d/.test(ch)) {
            let i = pos;
            while (i < movetext.length && /[\d.]/.test(movetext[i])) i++;
            tokens.push({ type: 'number', value: movetext.slice(pos, i) });
            pos = i;
            continue;
        }

        let i = pos;
        while (i < movetext.length && !/[\s{}();]/.test(movetext[i])) {
            i++;
        }
        const token = movetext.slice(pos, i).trim();
        if (token.length > 0) {
            if (!['*', '1-0', '0-1', '1/2-1/2'].includes(token)) {
                tokens.push({ type: 'move', value: token });
            }
        }
        pos = i;
    }

    return tokens;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
    // Get auth token from Authorization header or cookie
    const authHeader = request.headers.get('Authorization');
    const authToken = authHeader?.replace('Bearer ', '') ?? cookies.get('sb-access-token') ?? '';

    const body = await request.json().catch(() => ({}));
    const { study_id: studyId } = body as { study_id?: string };

    if (!studyId) {
        throw error(400, 'study_id is required');
    }

    const db = getServerSupabase(authToken);

    // Check auth
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
        throw error(401, 'Not authenticated');
    }

    // Get Lichess API token for this user
    const { data: lichessRow } = await db
        .from('user_lichess')
        .select('api_token, lichess_username')
        .eq('user_id', user.id)
        .maybeSingle();

    // Prefer user's stored token, fall back to env token
    const lichessToken = lichessRow?.api_token ?? LICHESS_API_KEY ?? '';

    if (!lichessToken) {
        throw error(400, 'Kein Lichess API-Token hinterlegt. Bitte im Account-Bereich einen Token eingeben.');
    }

    // Fetch study PGN from Lichess
    const lichessUrl = `https://lichess.org/api/study/${studyId}.pgn?comments=true&clocks=false&evals=false&variations=true`;

    let pgn: string;
    try {
        const resp = await fetch(lichessUrl, {
            headers: {
                Authorization: `Bearer ${lichessToken}`,
                Accept: 'application/x-chess-pgn'
            }
        });

        if (!resp.ok) {
            if (resp.status === 401 || resp.status === 403) {
                throw error(403, 'Kein Zugriff auf diese Lichess-Studie. Stelle sicher, dass dein API-Token die Berechtigung "study:read" hat.');
            }
            if (resp.status === 404) {
                throw error(404, 'Lichess-Studie nicht gefunden. Bitte prüfe die Studie-ID.');
            }
            throw error(502, `Lichess API Fehler: HTTP ${resp.status}`);
        }

        pgn = await resp.text();
    } catch (e) {
        if (e && typeof e === 'object' && 'status' in e) throw e;
        throw error(502, 'Lichess-Studie konnte nicht geladen werden.');
    }

    if (!pgn.trim()) {
        throw error(404, 'Die Lichess-Studie ist leer oder enthält keine Kapitel.');
    }

    // Parse positions with ! annotations
    const studyPositions = extractStudyPositions(pgn, studyId);

    if (studyPositions.length === 0) {
        return json({
            imported: 0,
            message: 'Keine Züge mit ! oder !! Annotation in dieser Studie gefunden.'
        });
    }

    // Upsert positions into DB
    // We use (fen, study_id) as the logical unique key by checking before insert
    let imported = 0;
    let skipped = 0;

    for (const pos of studyPositions) {
        // Check for existing position with same FEN and study_id
        const { data: existing } = await db
            .from('position')
            .select('id')
            .eq('fen', pos.fen)
            .eq('study_id', studyId)
            .maybeSingle();

        if (existing) {
            // Update explanation and moves in case study was edited
            await db
                .from('position')
                .update({
                    correct_moves: pos.correct_moves,
                    explanation: pos.explanation,
                    title: pos.title,
                    study_title: pos.study_title
                })
                .eq('id', existing.id);
            skipped++;
        } else {
            const { error: insertError } = await db.from('position').insert({
                user_id: user.id,
                fen: pos.fen,
                color_to_move: pos.color_to_move,
                correct_moves: pos.correct_moves,
                explanation: pos.explanation,
                title: pos.title,
                study_id: pos.study_id,
                study_title: pos.study_title
            });

            if (insertError) {
                console.error('Failed to insert study position:', insertError);
            } else {
                imported++;
            }
        }
    }

    return json({
        imported,
        updated: skipped,
        total: studyPositions.length,
        message: `${imported} neue Stellung${imported !== 1 ? 'en' : ''} importiert, ${skipped} aktualisiert.`
    });
};
