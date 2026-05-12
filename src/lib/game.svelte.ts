import { Chess } from 'chess.js';
import { supabase } from '$lib/supabaseClient';
import { base } from '$app/paths';

export type GameMode = 'local' | 'engine' | 'analysis' | 'view' | 'tactics';

export type SaveNotification = {
	message: string;
	type: 'success' | 'error';
} | null;

export type TacticsStatus = 'idle' | 'loading' | 'playing' | 'correct' | 'wrong' | 'completed' | 'error' | 'empty';

export interface TacticsPuzzle {
	puzzleid: string;
	fen: string;
	moves: string;
	rating: number;
	themes: string;
}

interface RawTacticsPuzzle {
	puzzleid?: string;
	fen?: string;
	moves?: string;
	rating?: number;
	themes?: string;
	PuzzleId?: string;
	FEN?: string;
	Moves?: string;
	Rating?: number;
	Themes?: string;
}

// Flat node structure – no nested reactive objects, no proxy issues
export interface AnalysisNode {
	id: string;
	san: string;
	fen: string;
	parentId: string | null;
}

// Keep MoveNode exported for any legacy usage (no internal use)
export type MoveNode = AnalysisNode;

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ANALYSIS_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

function makeId(): string {
	return Math.random().toString(36).slice(2, 9);
}

function normalizeTacticsPuzzle(raw: RawTacticsPuzzle): TacticsPuzzle | null {
	const puzzleid = raw.puzzleid ?? raw.PuzzleId;
	const fen = raw.fen ?? raw.FEN;
	const moves = raw.moves ?? raw.Moves;
	const rating = raw.rating ?? raw.Rating;
	const themes = raw.themes ?? raw.Themes;

	if (!puzzleid || !fen || !moves || typeof rating !== 'number' || !themes) {
		return null;
	}

	return {
		puzzleid,
		fen,
		moves,
		rating,
		themes
	};
}

export class GameStore {
	private chess = $state(new Chess());
	mode = $state<GameMode>('local');
	engineDifficulty = $state(8); // 1-10
	playerColor = $state<'w' | 'b'>('w');
	notification = $state<SaveNotification>(null);

	// Analysis state – flat array, guaranteed reactive
	analysisEvaluation = $state<number | string>(0);
	isAnalyzing = $state(false);
	analysisNodes = $state<AnalysisNode[]>([
		{ id: 'root', san: '', fen: STARTING_FEN, parentId: null }
	]);
	currentNodeId = $state<string>('root');
	viewPgn = $state<string | null>(null);
	viewIndex = $state<number>(-1); // -1 means current/latest position
	activePgn = $state<string | null>(null); // Stores the PGN for navigation when in local/engine modes

	// Tactics state
	tacticsPuzzle = $state<TacticsPuzzle | null>(null);
	tacticsCorrectMoves = $state<string[]>([]);
	tacticsIndex = $state(0);
	tacticsStatus = $state<TacticsStatus>('idle');
	tacticsError = $state<string | null>(null);
	tacticsSolved = $state(false);

	private tacticsRequestId = 0;
	private tacticsReplyTimer: ReturnType<typeof setTimeout> | null = null;
	private tacticsUndoTimer: ReturnType<typeof setTimeout> | null = null;

	private engineWorker: Worker | null = null;
	private engineReady = false;

	constructor() {
		this.initEngine();
	}

	private initEngine() {
		if (typeof window !== 'undefined') {
			this.engineWorker = new Worker(`${base}/stockfish.js`);
			this.engineWorker.onmessage = (event) => this.handleEngineMessage(event);
			this.engineWorker.postMessage('uci');
		}
	}

	private handleEngineMessage(event: MessageEvent) {
		const line = event.data;

		if (line === 'uciok') {
			this.engineReady = true;
			this.engineWorker?.postMessage('isready');
		}

		if (line.startsWith('info') && this.isAnalyzing) {
			this.parseAnalysisInfo(line);
		}

		if (line.startsWith('bestmove') && this.mode === 'engine') {
			const move = line.split(' ')[1];
			if (move && move !== '(none)') {
				this.move(move.substring(0, 2), move.substring(2, 4), move.length === 5 ? move[4] : undefined, true);
			}
		}
	}

	private parseAnalysisInfo(line: string) {
		const cpMatch = line.match(/score cp (-?\d+)/);
		const mateMatch = line.match(/score mate (-?\d+)/);

		if (mateMatch) {
			const mateIn = parseInt(mateMatch[1]);
			this.analysisEvaluation = `M${Math.abs(mateIn)}`;
		} else if (cpMatch) {
			const cp = parseInt(cpMatch[1]);
			const evaluation = this.turn === 'w' ? cp / 100 : -cp / 100;
			this.analysisEvaluation = evaluation;
		}
	}

	private triggerAnalysis() {
		if (!this.engineReady || !this.isAnalyzing) return;
		this.engineWorker?.postMessage('stop');
		this.engineWorker?.postMessage(`position fen ${this.chess.fen()}`);
		this.engineWorker?.postMessage('go infinite');
	}

	toggleAnalysis(enabled?: boolean) {
		this.isAnalyzing = enabled !== undefined ? enabled : !this.isAnalyzing;
		if (this.isAnalyzing) {
			this.triggerAnalysis();
		} else {
			this.engineWorker?.postMessage('stop');
			this.analysisEvaluation = 0;
		}
	}

	private triggerEngineMove() {
		if (this.mode !== 'engine' || !this.engineReady) return;
		if (this.turn === this.playerColor || this.isGameOver) return;

		const skillLevel = Math.floor((this.engineDifficulty - 1) * (20 / 9));
		this.engineWorker?.postMessage(`setoption name Skill Level value ${skillLevel}`);
		this.engineWorker?.postMessage(`position fen ${this.chess.fen()}`);

		const depth = Math.floor(1 + (this.engineDifficulty - 1) * (14 / 9));
		this.engineWorker?.postMessage(`go depth ${depth}`);
	}

	private async saveGame() {
		if (!this.isGameOver || this.history.length === 0) return;

		let resultStr = 'draw';
		if (this.isCheckmate) {
			resultStr = this.turn === 'w' ? 'black_won' : 'white_won';
		}

		let whitePlayer = 'User';
		let blackPlayer = 'User';
		let difficulty = null;

		if (this.mode === 'engine') {
			if (this.playerColor === 'w') {
				blackPlayer = 'Stockfish';
				difficulty = this.engineDifficulty;
			} else {
				whitePlayer = 'Stockfish';
				blackPlayer = 'User';
				difficulty = this.engineDifficulty;
			}
		}

		const { error } = await supabase.from('partie').insert({
			pgn: this.chess.pgn(),
			white_player: whitePlayer,
			black_player: blackPlayer,
			result: resultStr,
			difficulty: difficulty
		});

		if (error) {
			console.error('Failed to save game to Supabase:', error);
		} else {
			console.log('Game saved successfully!');
		}
	}

	private showNotification(message: string, type: 'success' | 'error') {
		this.notification = { message, type };
		setTimeout(() => { this.notification = null; }, 3000);
	}

	private clearTacticsTimers() {
		if (this.tacticsReplyTimer) {
			clearTimeout(this.tacticsReplyTimer);
			this.tacticsReplyTimer = null;
		}

		if (this.tacticsUndoTimer) {
			clearTimeout(this.tacticsUndoTimer);
			this.tacticsUndoTimer = null;
		}
	}

	private resetTacticsState(status: TacticsStatus = 'idle') {
		this.clearTacticsTimers();
		this.tacticsPuzzle = null;
		this.tacticsCorrectMoves = [];
		this.tacticsIndex = 0;
		this.tacticsStatus = status;
		this.tacticsError = null;
		this.tacticsSolved = false;
		this.viewIndex = -1;
		this.viewPgn = null;
		this.activePgn = null;
	}

	private syncChessFromFen() {
		this.chess = new Chess(this.chess.fen());
	}

	/** US13: Partie bis zum aktuellen Zeitpunkt speichern */
	async saveCurrentGame() {
		const pgn = this.chess.pgn();
		if (!pgn || this.history.length === 0) {
			this.showNotification('Keine Züge zum Speichern vorhanden.', 'error');
			return;
		}

		let whitePlayer = 'User';
		let blackPlayer = 'User';
		let difficulty = null;

		if (this.mode === 'engine') {
			if (this.playerColor === 'w') {
				blackPlayer = 'Stockfish';
				difficulty = this.engineDifficulty;
			} else {
				whitePlayer = 'Stockfish';
				difficulty = this.engineDifficulty;
			}
		}

		let resultStr = 'in_progress';
		if (this.isGameOver) {
			if (this.isCheckmate) {
				resultStr = this.turn === 'w' ? 'black_won' : 'white_won';
			} else {
				resultStr = 'draw';
			}
		}

		const { error } = await supabase.from('partie').insert({
			pgn,
			white_player: whitePlayer,
			black_player: blackPlayer,
			result: resultStr,
			difficulty
		});

		if (error) {
			console.error('Failed to save game:', error);
			this.showNotification('Fehler beim Speichern der Partie.', 'error');
		} else {
			this.showNotification('Partie erfolgreich gespeichert!', 'success');
		}
	}

	/** US14: Aktuelle Position (FEN) speichern */
	async saveCurrentPosition() {
		const fen = this.chess.fen();

		if (fen === STARTING_FEN || this.history.length === 0) {
			this.showNotification('Position nach 0 Zügen muss nicht gespeichert werden.', 'error');
			return;
		}

		const { data: existing } = await supabase
			.from('position')
			.select('id')
			.eq('fen', fen)
			.maybeSingle();

		if (existing) {
			this.showNotification('Diese Position ist bereits gespeichert.', 'error');
			return;
		}

		// Save current state as a 'partie' to have history
		const pgn = this.chess.pgn();
		let whitePlayer = 'User';
		let blackPlayer = 'User';
		let difficulty = null;

		if (this.mode === 'engine') {
			if (this.playerColor === 'w') {
				blackPlayer = 'Stockfish';
				difficulty = this.engineDifficulty;
			} else {
				whitePlayer = 'Stockfish';
				difficulty = this.engineDifficulty;
			}
		}

		const { data: partieData, error: partieError } = await supabase
			.from('partie')
			.insert({
				pgn,
				white_player: whitePlayer,
				black_player: blackPlayer,
				result: 'in_progress',
				difficulty
			})
			.select()
			.single();

		if (partieError) {
			console.error('Failed to save partie for position:', partieError);
			this.showNotification('Fehler beim Speichern der Partie-Historie.', 'error');
			return;
		}

		const colorToMove = this.turn === 'w' ? 'white' : 'black';

		const { error } = await supabase.from('position').insert({
			fen,
			color_to_move: colorToMove,
			title: `Position nach Zug ${Math.ceil(this.history.length / 2)}`,
			partie_id: partieData.id
		});

		if (error) {
			console.error('Failed to save position:', error);
			this.showNotification('Fehler beim Speichern der Position.', 'error');
		} else {
			this.showNotification('Position erfolgreich gespeichert!', 'success');
		}
	}

	// Computed properties
	get board() { return this.chess.board(); }
	get turn() { return this.chess.turn(); }
	get isGameOver() { return this.chess.isGameOver(); }
	get isCheckmate() { return this.chess.isCheckmate(); }
	get isStalemate() { return this.chess.isStalemate(); }
	get isDraw() { return this.chess.isDraw(); }
	get isCheck() { return this.chess.isCheck(); }
	get history() { return this.chess.history({ verbose: true }); }
	get fen() { return this.chess.fen(); }
	get totalHistoryCount() {
		const pgn = this.mode === 'view' ? this.viewPgn : (this.activePgn || this.chess.pgn());
		if (!pgn) return this.history.length;
		// A bit expensive, but only called when history changes or we navigate
		const temp = new Chess();
		try {
			temp.loadPgn(pgn);
			return temp.history().length;
		} catch {
			return this.history.length;
		}
	}

	// Helper: get direct children of a node by id
	getChildren(parentId: string): AnalysisNode[] {
		return this.analysisNodes.filter(n => n.parentId === parentId);
	}

	// Helper: get a node by id
	getNode(id: string): AnalysisNode | undefined {
		return this.analysisNodes.find(n => n.id === id);
	}

	// Actions
	move(from: string, to: string, promotion: string = 'q', isEngineMove: boolean = false) {
		try {
			if (this.mode === 'view') {
				return null;
			}

			if (this.mode === 'tactics' && this.tacticsStatus !== 'playing') {
				return null;
			}

			// If we are viewing an old position, reset to latest before moving
			if (this.viewIndex !== -1) {
				this.viewIndex = -1;
				// The chess state should already be at latest if we didn't change it permanently,
				// but let's ensure it.
				this.jumpToHistoryIndex(this.history.length - 1, true);
			}

			if (this.mode === 'engine' && !isEngineMove && this.turn !== this.playerColor) {
				return null;
			}

			const moveResult = this.chess.move({ from, to, promotion });
			if (!moveResult) return null;

			// Handle Analysis Tree with flat array
			if (this.mode === 'analysis') {
				// Check if this move already exists as a child of the current node
				const existing = this.analysisNodes.find(
					n => n.parentId === this.currentNodeId && n.san === moveResult.san
				);
				if (existing) {
					this.currentNodeId = existing.id;
				} else {
					const newNode: AnalysisNode = {
						id: makeId(),
						san: moveResult.san,
						fen: this.chess.fen(),
						parentId: this.currentNodeId
					};
					// Array re-assignment = Svelte 5 definitely detects the change
					this.analysisNodes = [...this.analysisNodes, newNode];
					this.currentNodeId = newNode.id;
				}
				if (this.isAnalyzing) this.triggerAnalysis();
			}

			const newChess = new Chess();
			newChess.loadPgn(this.chess.pgn());
			this.chess = newChess;

			if (this.isGameOver && this.mode !== 'analysis' && this.mode !== 'tactics') {
				this.saveGame();
			} else if (this.mode === 'engine' && this.turn !== this.playerColor) {
				setTimeout(() => this.triggerEngineMove(), 250);
			} else if (this.mode === 'tactics') {
				this.validateTacticsMove(from, to, promotion);
			}

			return moveResult;
		} catch {
			return null;
		}
	}

	setMode(newMode: GameMode) {
		if (this.mode === newMode) return;
		if (this.mode === 'tactics' && newMode !== 'tactics') {
			this.resetTacticsState();
		}
		this.mode = newMode;
		if (newMode === 'analysis') {
			this.resetAnalysis();
		} else {
			this.reset();
		}
	}

	reset() {
		if (this.mode === 'analysis') {
			this.resetAnalysis();
			return;
		}
		if (this.mode === 'tactics') {
			this.resetTacticsState();
		}
		this.chess = new Chess();
		this.toggleAnalysis(false);
		if (this.mode === 'engine') {
			this.playerColor = Math.random() > 0.5 ? 'w' : 'b';
			if (this.playerColor === 'b') {
				setTimeout(() => this.triggerEngineMove(), 500);
			}
		} else {
			this.playerColor = 'w';
		}
	}

	resetAnalysis() {
		this.chess = new Chess();
		// Full replacement of the array – guaranteed reactive
		this.analysisNodes = [
			{ id: 'root', san: '', fen: STARTING_FEN, parentId: null }
		];
		this.currentNodeId = 'root';
		this.toggleAnalysis(true);
	}

	jumpToNodeById(nodeId: string) {
		const node = this.analysisNodes.find(n => n.id === nodeId);
		if (!node) return;
		this.currentNodeId = nodeId;
		const newChess = new Chess();
		newChess.load(node.fen);
		this.chess = newChess;
		if (this.isAnalyzing) this.triggerAnalysis();
	}

	undo() {
		if (this.mode === 'analysis') {
			const current = this.analysisNodes.find(n => n.id === this.currentNodeId);
			if (current?.parentId) {
				this.jumpToNodeById(current.parentId);
			}
			return null;
		}

		const result = this.chess.undo();
		if (result && this.mode === 'engine') {
			this.chess.undo();
		}
		const newChess = new Chess();
		newChess.loadPgn(this.chess.pgn());
		this.chess = newChess;
		return result;
	}

	jumpToHistoryIndex(index: number, force: boolean = false) {
		if (!force && this.mode !== 'view' && this.mode !== 'local' && this.mode !== 'engine') return;

		// When starting to navigate in local/engine mode, capture the current PGN
		if (this.mode !== 'view' && this.viewIndex === -1 && index !== -1) {
			this.activePgn = this.chess.pgn();
		}

		let pgnToUse = this.mode === 'view' ? this.viewPgn : this.activePgn;
		if (!pgnToUse) {
			pgnToUse = this.chess.pgn();
		}

		if (!pgnToUse && index !== -1) return;

		const tempChess = new Chess();
		if (pgnToUse) {
			tempChess.loadPgn(pgnToUse);
		}
		const history = tempChess.history({ verbose: true });

		// index -1 means go to the end of the history
		if (index === -1) {
			this.chess = tempChess;
			this.viewIndex = -1;
			this.activePgn = null;
			return;
		}

		if (index < 0 || index >= history.length) return;

		const newChess = new Chess();
		const setupFen = tempChess.header().FEN;
		if (setupFen) {
			newChess.load(setupFen);
		}

		for (let i = 0; i <= index; i++) {
			newChess.move(history[i].san);
		}
		this.chess = newChess;
		this.viewIndex = index;
	}

	async deleteGame(id: string) {
		const { error } = await supabase.from('partie').delete().eq('id', id);
		if (error) {
			console.error('Failed to delete game:', error);
			this.showNotification('Fehler beim Löschen der Partie.', 'error');
			return false;
		} else {
			this.showNotification('Partie gelöscht.', 'success');
			return true;
		}
	}

	canAnalyze(createdAt: string): boolean {
		const createdDate = new Date(createdAt).getTime();
		const now = new Date().getTime();
		return (now - createdDate) >= ANALYSIS_DELAY_MS;
	}

	loadPgn(pgn: string, targetMode: GameMode = 'local', startAnalysis: boolean = false) {
		try {
			const newChess = new Chess();
			newChess.loadPgn(pgn);
			this.chess = newChess;
			this.mode = targetMode;
			this.viewPgn = targetMode === 'view' ? pgn : null;

			if (targetMode === 'analysis') {
				// Reconstruct flat analysis tree from PGN
				const setupFen = newChess.header().FEN;
				const startFen = setupFen || STARTING_FEN;

				const temp = new Chess();
				if (setupFen) {
					temp.load(setupFen);
				}

				const history = newChess.history({ verbose: true });

				this.analysisNodes = [
					{ id: 'root', san: '', fen: startFen, parentId: null }
				];
				this.currentNodeId = 'root';

				for (const move of history) {
					const parentId = this.currentNodeId;
					temp.move(move);
					const newNode: AnalysisNode = {
						id: makeId(),
						san: move.san,
						fen: temp.fen(),
						parentId: parentId
					};
					this.analysisNodes = [...this.analysisNodes, newNode];
					this.currentNodeId = newNode.id;
				}

				this.isAnalyzing = startAnalysis;
				if (startAnalysis) this.triggerAnalysis();
			} else {
				this.toggleAnalysis(false);
			}

			this.showNotification('Partie geladen!', 'success');
		} catch (e) {
			console.error('Failed to load PGN:', e);
			this.showNotification('Fehler beim Laden der PGN.', 'error');
		}
	}

	loadFen(fen: string, targetMode: GameMode = 'local', startAnalysis: boolean = false) {
		try {
			const newChess = new Chess(fen);
			this.chess = newChess;
			this.mode = targetMode;
			this.viewPgn = targetMode === 'view' ? newChess.pgn() : null;

			if (targetMode === 'analysis') {
				this.analysisNodes = [
					{ id: 'root', san: '', fen, parentId: null }
				];
				this.currentNodeId = 'root';
				this.isAnalyzing = startAnalysis;
				if (startAnalysis) this.triggerAnalysis();
			} else {
				this.toggleAnalysis(false);
			}

			if (this.mode === 'engine' && this.turn !== this.playerColor) {
				setTimeout(() => this.triggerEngineMove(), 500);
			}

			this.showNotification('Position geladen!', 'success');
		} catch (e) {
			console.error('Failed to load FEN:', e);
			this.showNotification('Fehler beim Laden der Position.', 'error');
		}
	}

	async loadTactics(rating: number) {
		const previousPuzzleId = this.tacticsPuzzle?.puzzleid ?? null;
		const requestId = ++this.tacticsRequestId;
		this.resetTacticsState('loading');
		this.mode = 'tactics';
		this.playerColor = 'w';
		this.showNotification(`Lade Taktikaufgabe (${rating})...`, 'success');

		try {
			const params = new URLSearchParams({ rating: `${rating}` });
			if (previousPuzzleId) {
				params.set('exclude', previousPuzzleId);
			}

			const response = await fetch(`${base}/api/tactics?${params.toString()}`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			const data = await response.json();

			if (requestId !== this.tacticsRequestId) {
				return;
			}

			if (data && data.length > 0) {
				const puzzle = normalizeTacticsPuzzle(data[0] as RawTacticsPuzzle);

				if (!puzzle) {
					throw new Error('Invalid puzzle payload');
				}

				const moves = typeof puzzle.moves === 'string' ? puzzle.moves.split(' ').filter(Boolean) : [];

				if (moves.length === 0) {
					throw new Error('Invalid puzzle payload');
				}

				this.tacticsPuzzle = puzzle;
				this.tacticsCorrectMoves = moves;
				this.tacticsIndex = 0;

				// Initialize the board with the puzzle FEN
				this.chess = new Chess(puzzle.fen);

				// The first move in the puzzle creates the tactical position the user should solve.
				const firstMove = this.tacticsCorrectMoves[0];
				const setupMove = this.chess.move({
					from: firstMove.substring(0, 2),
					to: firstMove.substring(2, 4),
					promotion: firstMove.length === 5 ? firstMove[4] : 'q'
				});

				if (!setupMove) {
					throw new Error('Invalid setup move');
				}

				this.syncChessFromFen();

				this.tacticsIndex = 1;
				this.tacticsStatus = 'playing';
				this.playerColor = this.turn;

				this.showNotification('Taktikaufgabe bereit!', 'success');
			} else {
				this.tacticsStatus = 'empty';
				this.tacticsError = 'Keine passende Aufgabe fuer diese Elo-Stufe gefunden.';
				this.showNotification('Keine passende Aufgabe gefunden.', 'error');
			}
		} catch (e) {
			if (requestId !== this.tacticsRequestId) {
				return;
			}
			console.error('Failed to load tactics:', e);
			this.tacticsStatus = 'error';
			this.tacticsError = 'Die Taktikaufgabe konnte nicht geladen werden. Bitte versuche es gleich noch einmal.';
			this.showNotification('Fehler beim Laden der Taktikaufgabe.', 'error');
		}
	}

	private validateTacticsMove(from: string, to: string, promotion: string) {
		if (this.mode !== 'tactics' || this.tacticsStatus !== 'playing') {
			return;
		}

		const expectedMove = this.tacticsCorrectMoves[this.tacticsIndex];
		if (!expectedMove) {
			this.tacticsStatus = 'completed';
			this.tacticsSolved = true;
			return;
		}

		const playedMove = from + to + (promotion !== 'q' ? promotion : '');
		const playedMoveShort = from + to;
		const isCorrect = expectedMove === playedMove || (expectedMove.length === 5 && expectedMove.startsWith(playedMoveShort));

		if (isCorrect) {
			this.tacticsIndex++;
			this.tacticsStatus = 'correct';

			// If there's an opponent move follow-up, play it
			if (this.tacticsIndex < this.tacticsCorrectMoves.length) {
				const opponentMove = this.tacticsCorrectMoves[this.tacticsIndex];
				const requestId = this.tacticsRequestId;
				this.tacticsReplyTimer = setTimeout(() => {
					if (requestId !== this.tacticsRequestId || this.mode !== 'tactics' || this.tacticsPuzzle === null) {
						return;
					}

					this.chess.move({
						from: opponentMove.substring(0, 2),
						to: opponentMove.substring(2, 4),
						promotion: opponentMove.length === 5 ? opponentMove[4] : 'q'
					});
					this.syncChessFromFen();
					this.tacticsReplyTimer = null;
					this.tacticsIndex++;
					this.tacticsStatus = 'playing';
				}, 500);
			} else {
				this.tacticsStatus = 'completed';
				this.tacticsSolved = true;
				this.showNotification('Hervorragend! Aufgabe gelöst.', 'success');
			}
		} else {
			this.tacticsStatus = 'wrong';
			this.showNotification('Falscher Zug. Versuche es noch einmal!', 'error');
			// Undo the move
			const requestId = this.tacticsRequestId;
			this.tacticsUndoTimer = setTimeout(() => {
				if (requestId !== this.tacticsRequestId || this.mode !== 'tactics') {
					return;
				}

				this.chess.undo();
				this.syncChessFromFen();
				this.tacticsUndoTimer = null;
				this.tacticsStatus = 'playing';
			}, 1000);
		}
	}
}

export const game = new GameStore();
