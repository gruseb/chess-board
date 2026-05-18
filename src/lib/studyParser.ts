import { Chess } from 'chess.js';

export interface StudyPosition {
	fen: string;
	color_to_move: 'white' | 'black';
	correct_moves: string[]; // UCI format (e.g., ["e2e4"])
	explanation: string;
	title: string;
	difficulty: number;
}

export interface StudyChapter {
	title: string;
	positions: StudyPosition[];
}

/**
 * Splits a multi-chapter PGN string into individual chapters.
 */
export function splitPgnChapters(pgnText: string): string[] {
	const chapters: string[] = [];
	const lines = pgnText.split('\n');
	let currentChapter = '';

	for (const line of lines) {
		if (line.trim().startsWith('[Event ') && currentChapter.trim().length > 0) {
			chapters.push(currentChapter);
			currentChapter = line + '\n';
		} else {
			currentChapter += line + '\n';
		}
	}

	if (currentChapter.trim().length > 0) {
		chapters.push(currentChapter);
	}

	return chapters;
}

/**
 * Parses headers/tags of a PGN chapter.
 */
export function parsePgnHeaders(pgn: string): { title: string; startFen?: string } {
	const headers: Record<string, string> = {};
	const headerRegex = /\[([A-Za-z0-9_]+)\s+"([^"]*)"\]/g;
	let match;
	while ((match = headerRegex.exec(pgn)) !== null) {
		headers[match[1]] = match[2];
	}
	return {
		title: headers['Event'] || 'Unbenanntes Kapitel',
		startFen: headers['FEN']
	};
}

/**
 * Parses positions annotated with ! or !! from a PGN chapter.
 */
export function parseChapterPositions(pgn: string): StudyPosition[] {
	const { title: chapterTitle, startFen } = parsePgnHeaders(pgn);
	const moveText = pgn.replace(/\[[\s\S]*?\]/g, '').trim();

	// Tokenize move text
	// Type 1: comment inside curly braces { ... }
	// Type 2: open variation "("
	// Type 3: close variation ")"
	// Type 4: move number e.g. "1." or "2..."
	// Type 5: move SAN e.g. "e4", "Nf3!", "d8=Q!!"
	const tokenRegex = /\{([\s\S]*?)\}|\(|\)|(\d+\.+\.?)|([a-zA-Z0-9\-+=#\/!?]+)/g;
	let match;
	const tokens: { type: 'comment' | 'open' | 'close' | 'move' | 'number'; value: string }[] = [];

	while ((match = tokenRegex.exec(moveText)) !== null) {
		if (match[1] !== undefined) {
			tokens.push({ type: 'comment', value: match[1].trim() });
		} else if (match[0] === '(') {
			tokens.push({ type: 'open', value: '(' });
		} else if (match[0] === ')') {
			tokens.push({ type: 'close', value: ')' });
		} else if (match[2] !== undefined) {
			tokens.push({ type: 'number', value: match[2] });
		} else if (match[3] !== undefined) {
			const val = match[3].trim();
			// Skip PGN game results
			if (['*', '1-0', '0-1', '1/2-1/2'].includes(val)) continue;
			tokens.push({ type: 'move', value: val });
		}
	}

	const positions: StudyPosition[] = [];

	let initialBoard = new Chess();
	if (startFen) {
		try {
			initialBoard = new Chess(startFen);
		} catch (e) {
			console.error('[StudyParser] Invalid starting FEN in chapter headers:', startFen, e);
		}
	}

	/**
	 * Walks the PGN tokens recursively to build a history stack of board positions.
	 * Returns the index at which this recursive variation walk terminated (usually at a Close parenthesis token).
	 */
	function walk(startIndex: number, board: Chess): number {
		let i = startIndex;
		const boardHistory: Chess[] = [board];

		while (i < tokens.length) {
			const token = tokens[i];

			if (token.type === 'close') {
				return i;
			} else if (token.type === 'open') {
				// A variation is an alternative to the LAST played move in the current level.
				// Thus, it starts from the state BEFORE that last move was played.
				// This corresponds to the second to last item in our board history stack.
				if (boardHistory.length >= 2) {
					const preLastBoard = boardHistory[boardHistory.length - 2];
					const varBoard = new Chess(preLastBoard.fen());
					const nextIndex = walk(i + 1, varBoard);
					i = nextIndex + 1; // resume after close parenthesis
				} else {
					i++;
				}
			} else if (token.type === 'move') {
				const moveStr = token.value;
				const hasExclam = moveStr.includes('!');
				const cleanMove = moveStr.replace(/[!?]/g, '');

				const activeBoard = boardHistory[boardHistory.length - 1];
				const fenBefore = activeBoard.fen();
				const activeColor = activeBoard.turn() === 'w' ? 'white' : 'black';

				try {
					const clonedBoard = new Chess(activeBoard.fen());
					const moveObj = clonedBoard.move(cleanMove);
					boardHistory.push(clonedBoard);

					if (hasExclam) {
						let explanation = '';

						// 1. Lookahead: Check if next token is a comment
						if (i + 1 < tokens.length && tokens[i + 1].type === 'comment') {
							explanation = tokens[i + 1].value;
						}

						// 2. Lookbehind: If no lookahead comment, check if previous token was a comment
						if (!explanation && i > 0 && tokens[i - 1].type === 'comment') {
							explanation = tokens[i - 1].value;
						}

						// 3. Fallback: Check if chess.js built-in getComment contains any comments
						if (!explanation && typeof clonedBoard.getComment === 'function') {
							explanation = clonedBoard.getComment() || '';
						}

						const uciMove = moveObj.from + moveObj.to + (moveObj.promotion || '');

						positions.push({
							fen: fenBefore,
							color_to_move: activeColor,
							correct_moves: [uciMove],
							explanation: explanation.trim(),
							title: `${chapterTitle} - Zug ${moveObj.san}!`,
							difficulty: 3
						});
					}
				} catch (e) {
					console.warn(`[StudyParser] Skipper invalid move "${cleanMove}" in FEN "${activeBoard.fen()}":`, e);
				}

				i++;
			} else {
				i++;
			}
		}
		return i;
	}

	walk(0, initialBoard);
	return positions;
}
