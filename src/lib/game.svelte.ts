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

type TacticsSource = 'live' | 'retry';

interface WrongTacticRecord {
	puzzle_id: string;
	rating: number;
	topics: string[] | null;
	fen: string;
	moves: string[];
	color_to_move: 'white' | 'black';
	position_id: string | null;
	last_failed_at: string;
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
const TACTICS_POOL_SIZE = 12;

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

function getPuzzleId(raw: RawTacticsPuzzle): string | null {
	const puzzleid = raw.puzzleid ?? raw.PuzzleId;
	return typeof puzzleid === 'string' ? puzzleid : null;
}

function normalizeWrongTactic(raw: WrongTacticRecord): TacticsPuzzle | null {
	if (!raw.puzzle_id || !raw.fen || !Array.isArray(raw.moves) || typeof raw.rating !== 'number') {
		return null;
	}

	const moves = raw.moves.filter((move) => typeof move === 'string' && move.length >= 4).join(' ');
	if (!moves) {
		return null;
	}

	return {
		puzzleid: raw.puzzle_id,
		fen: raw.fen,
		moves,
		rating: raw.rating,
		themes: (raw.topics ?? []).join(' ')
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
	engineAnalysisAllowed = $state(true);
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
	tacticsSource = $state<TacticsSource>('live');
	wrongTacticsCount = $state(0);

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
		const userId = await this.getCurrentUserId(true);
		if (!userId) return;

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
			user_id: userId,
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

	private async getCurrentUserId(silent = false): Promise<string | null> {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data.user) {
			if (!silent) {
				this.showNotification('Bitte einloggen, um Daten zu speichern.', 'error');
			}
			return null;
		}
		return data.user.id;
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
		this.tacticsSource = 'live';
		this.viewIndex = -1;
		this.viewPgn = null;
		this.activePgn = null;
	}

	async refreshWrongTacticsCount() {
		const { count, error } = await supabase
			.from('wrong_tactics')
			.select('id', { count: 'exact', head: true });

		if (error) {
			console.error('Failed to load wrong tactics count:', error);
			return;
		}

		this.wrongTacticsCount = count ?? 0;
	}

	private async saveCurrentTacticAsWrong() {
		if (!this.tacticsPuzzle) {
			return;
		}
		const userId = await this.getCurrentUserId(true);
		if (!userId) return;

		const topics = this.tacticsPuzzle.themes
			.split(' ')
			.map((topic) => topic.trim())
			.filter(Boolean);
		const colorToMove = this.playerColor === 'w' ? 'white' : 'black';
		let positionId: string | null = null;

		const { data: existingPosition, error: existingPositionError } = await supabase
			.from('position')
			.select('id')
			.eq('fen', this.tacticsPuzzle.fen)
			.maybeSingle();

		if (existingPositionError) {
			console.error('Failed to load tactics position:', existingPositionError);
		} else if (existingPosition) {
			positionId = existingPosition.id;
		} else {
			const { data: newPosition, error: insertPositionError } = await supabase
				.from('position')
				.insert({
					user_id: userId,
					fen: this.tacticsPuzzle.fen,
					color_to_move: colorToMove,
					correct_moves: this.tacticsCorrectMoves,
					title: `Wrong tactic ${this.tacticsPuzzle.puzzleid}`,
					explanation: `Topics: ${topics.join(', ')}`
				})
				.select('id')
				.single();

			if (insertPositionError) {
				console.error('Failed to save tactics position:', insertPositionError);
			} else {
				positionId = newPosition.id;
			}
		}

		const { error } = await supabase.from('wrong_tactics').upsert(
			{
				user_id: userId,
				puzzle_id: this.tacticsPuzzle.puzzleid,
				rating: this.tacticsPuzzle.rating,
				topics: topics,
				fen: this.tacticsPuzzle.fen,
				moves: this.tacticsCorrectMoves,
				color_to_move: colorToMove,
				position_id: positionId,
				last_failed_at: new Date().toISOString()
			},
			{ onConflict: 'user_id,puzzle_id' }
		);

		if (error) {
			console.error('Failed to save wrong tactic:', error);
			return;
		}

		await this.refreshWrongTacticsCount();
	}

	private async clearSolvedWrongTactic() {
		if (!this.tacticsPuzzle || this.tacticsSource !== 'retry') {
			return;
		}

		const { error } = await supabase
			.from('wrong_tactics')
			.delete()
			.eq('puzzle_id', this.tacticsPuzzle.puzzleid);

		if (error) {
			console.error('Failed to delete solved wrong tactic:', error);
			return;
		}

		await this.refreshWrongTacticsCount();
	}

	private startTacticsPuzzle(puzzle: TacticsPuzzle, source: TacticsSource) {
		const moves = typeof puzzle.moves === 'string' ? puzzle.moves.split(' ').filter(Boolean) : [];

		if (moves.length === 0) {
			throw new Error('Invalid puzzle payload');
		}

		this.tacticsPuzzle = puzzle;
		this.tacticsCorrectMoves = moves;
		this.tacticsIndex = 0;
		this.tacticsSource = source;

		const newChess = new Chess(puzzle.fen);
		if (puzzle.fen !== STARTING_FEN) {
			newChess.header('SetUp', '1');
			newChess.header('FEN', puzzle.fen);
		}
		this.chess = newChess;

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
	}

	private syncChessFromFen() {
		const fen = this.chess.fen();
		const newChess = new Chess(fen);
		if (fen !== STARTING_FEN) {
			newChess.header('SetUp', '1');
			newChess.header('FEN', fen);
		}
		this.chess = newChess;
	}

	/** US13: Partie bis zum aktuellen Zeitpunkt speichern */
	async saveCurrentGame() {
		const pgn = this.chess.pgn();
		if (!pgn || this.history.length === 0) {
			this.showNotification('Keine Züge zum Speichern vorhanden.', 'error');
			return;
		}
		const userId = await this.getCurrentUserId();
		if (!userId) return;

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
			user_id: userId,
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
		const userId = await this.getCurrentUserId();
		if (!userId) return;

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
				user_id: userId,
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
			user_id: userId,
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
		if (this.mode === 'analysis') {
			return this.getActiveBranch().length - 1;
		}
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

	get viewMoveIndex(): number {
		if (this.mode === 'analysis') {
			const branch = this.getActiveBranch();
			const idx = branch.findIndex(n => n.id === this.currentNodeId);
			return idx >= 0 ? idx : 0;
		}
		if (this.viewIndex === -1) return this.totalHistoryCount;
		if (this.viewIndex === -2) return 0;
		return this.viewIndex + 1;
	}

	get totalMoveCount(): number {
		return this.totalHistoryCount;
	}

	getAnalysisPath(): AnalysisNode[] {
		const path: AnalysisNode[] = [];
		let id: string | null = this.currentNodeId;
		while (id) {
			const node = this.analysisNodes.find(n => n.id === id);
			if (!node) break;
			path.unshift(node);
			id = node.parentId;
		}
		return path;
	}

	getActiveBranch(): AnalysisNode[] {
		const branch: AnalysisNode[] = [];
		const prefix = this.getAnalysisPath();
		branch.push(...prefix);

		let currentId = this.currentNodeId;
		while (true) {
			const children = this.getChildren(currentId);
			if (children.length === 0) break;
			const nextNode = children[0];
			branch.push(nextNode);
			currentId = nextNode.id;
		}
		return branch;
	}

	// Helper: get direct children of a node by id
	getChildren(parentId: string): AnalysisNode[] {
		return this.analysisNodes.filter(n => n.parentId === parentId);
	}

	// Helper: get a node by id
	getNode(id: string): AnalysisNode | undefined {
		return this.analysisNodes.find(n => n.id === id);
	}

	private cloneChess(chessInstance: Chess): Chess {
		const fen = chessInstance.fen();
		try {
			const newChess = new Chess();
			const headers = chessInstance.header();
			for (const [key, value] of Object.entries(headers)) {
				if (typeof value === 'string') {
					newChess.header(key, value);
				}
			}

			const sourcePgn = chessInstance.pgn();
			const hasFenHeader = sourcePgn.includes('[FEN ') || sourcePgn.includes('[SetUp ');
			const initialFen = headers.FEN || (chessInstance.fen() !== STARTING_FEN ? chessInstance.fen() : null);

			if (initialFen && !hasFenHeader) {
				newChess.header('SetUp', '1');
				newChess.header('FEN', initialFen);
			}

			newChess.loadPgn(chessInstance.pgn());
			return newChess;
		} catch (e) {
			console.warn('PGN cloning failed, falling back to FEN cloning:', e);
			const fallbackChess = new Chess(fen);
			const headers = chessInstance.header();
			for (const [key, value] of Object.entries(headers)) {
				if (typeof value === 'string') {
					fallbackChess.header(key, value);
				}
			}
			return fallbackChess;
		}
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

			this.chess = this.cloneChess(this.chess);

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
			this.engineAnalysisAllowed = true;
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
		this.toggleAnalysis(this.engineAnalysisAllowed);
	}

	jumpToNodeById(nodeId: string) {
		const node = this.analysisNodes.find(n => n.id === nodeId);
		if (!node) return;
		this.currentNodeId = nodeId;
		const newChess = new Chess(node.fen);
		if (node.fen !== STARTING_FEN) {
			newChess.header('SetUp', '1');
			newChess.header('FEN', node.fen);
		}
		this.chess = newChess;

		if (this.mode === 'analysis') {
			const branch = this.getActiveBranch();
			const idx = branch.findIndex(n => n.id === nodeId);
			if (idx === branch.length - 1) {
				this.viewIndex = -1;
			} else {
				this.viewIndex = idx - 1;
			}
		}

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
		this.chess = this.cloneChess(this.chess);
		return result;
	}

	jumpToHistoryIndex(index: number, force: boolean = false) {
		if (!force && this.mode !== 'view' && this.mode !== 'local' && this.mode !== 'engine' && this.mode !== 'analysis') return;

		if (this.mode === 'analysis') {
			const branch = this.getActiveBranch();
			if (index === -2) {
				this.jumpToNodeById('root');
				this.viewIndex = -2;
				return;
			}
			if (index === -1) {
				const lastNode = branch[branch.length - 1];
				this.jumpToNodeById(lastNode.id);
				this.viewIndex = -1;
				return;
			}
			const targetBranchIndex = index + 1;
			if (targetBranchIndex >= 0 && targetBranchIndex < branch.length) {
				const targetNode = branch[targetBranchIndex];
				this.jumpToNodeById(targetNode.id);
				this.viewIndex = index;
			}
			return;
		}

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

		// index -2 means go to the very beginning (starting position)
		if (index === -2) {
			const newChess = new Chess();
			const setupFen = tempChess.header().FEN;
			if (setupFen) {
				newChess.load(setupFen);
				newChess.header('SetUp', '1');
				newChess.header('FEN', setupFen);
			}
			this.chess = newChess;
			this.viewIndex = -2;
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

	navigateHistory(direction: 'prev' | 'next' | 'start' | 'end') {
		if (this.mode === 'analysis') {
			const branch = this.getActiveBranch();
			const idx = branch.findIndex(n => n.id === this.currentNodeId);
			if (direction === 'start') {
				this.jumpToNodeById('root');
			} else if (direction === 'end') {
				this.jumpToNodeById(branch[branch.length - 1].id);
			} else if (direction === 'prev') {
				if (idx > 0) {
					this.jumpToNodeById(branch[idx - 1].id);
				}
			} else if (direction === 'next') {
				if (idx < branch.length - 1) {
					this.jumpToNodeById(branch[idx + 1].id);
				}
			}
			return;
		}

		const total = this.totalHistoryCount;
		if (direction === 'start') {
			this.jumpToHistoryIndex(-2);
		} else if (direction === 'end') {
			this.jumpToHistoryIndex(-1);
		} else if (direction === 'prev') {
			let currentIdx = this.viewIndex;
			if (currentIdx === -1) {
				currentIdx = total - 1;
			} else if (currentIdx === -2) {
				return;
			}
			
			if (currentIdx === 0) {
				this.jumpToHistoryIndex(-2);
			} else {
				this.jumpToHistoryIndex(currentIdx - 1);
			}
		} else if (direction === 'next') {
			let currentIdx = this.viewIndex;
			if (currentIdx === -1) {
				return;
			} else if (currentIdx === -2) {
				currentIdx = -1;
			}
			
			const nextIdx = currentIdx + 1;
			if (nextIdx >= total - 1) {
				this.jumpToHistoryIndex(-1);
			} else {
				this.jumpToHistoryIndex(nextIdx);
			}
		}
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

	async loadPgn(pgn: string, targetMode: GameMode = 'local', startAnalysis: boolean = false, engineAnalysisAllowed: boolean = true) {
		try {
			const newChess = new Chess();
			newChess.loadPgn(pgn);
			this.chess = newChess;
			this.mode = targetMode;
			this.viewPgn = targetMode === 'view' ? pgn : null;
			this.engineAnalysisAllowed = engineAnalysisAllowed;

			// Determine player perspective automatically based on PGN headers and user profile
			const headers = newChess.header();
			const whiteName = headers.White || '';
			const blackName = headers.Black || '';

			// Default to White
			this.playerColor = 'w';

			const userId = await this.getCurrentUserId(true);
			if (userId) {
				const { data: lichess } = await supabase
					.from('user_lichess')
					.select('lichess_username')
					.eq('user_id', userId)
					.maybeSingle();
				
				const lichessName = lichess?.lichess_username ?? null;
				const { data: authData } = await supabase.auth.getUser();
				const email = authData.user?.email ?? '';
				const emailPrefix = email.split('@')[0];

				const userIdentifiers = [
					lichessName?.toLowerCase(),
					email.toLowerCase(),
					emailPrefix.toLowerCase(),
					'user'
				].filter(Boolean) as string[];

				const isBlack = userIdentifiers.some(id => blackName.toLowerCase() === id);
				const isWhite = userIdentifiers.some(id => whiteName.toLowerCase() === id);

				if (isBlack && !isWhite) {
					this.playerColor = 'b';
				}
			}

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

	loadFen(fen: string, targetMode: GameMode = 'local', startAnalysis: boolean = false, engineAnalysisAllowed: boolean = true) {
		try {
			const newChess = new Chess(fen);
			if (fen !== STARTING_FEN) {
				newChess.header('SetUp', '1');
				newChess.header('FEN', fen);
			}
			this.chess = newChess;
			this.mode = targetMode;
			this.viewPgn = targetMode === 'view' ? newChess.pgn() : null;
			this.playerColor = newChess.turn(); // Align perspective with the active turn to move
			this.engineAnalysisAllowed = engineAnalysisAllowed;

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

			let data: RawTacticsPuzzle[] = [];
			const response = await fetch(`${base}/api/tactics?${params.toString()}`);
			if (response.status === 404) {
				const upstream = await fetch(
					`https://chess-puzzles-api.vercel.app/puzzles?min_rating=${rating}&max_rating=${rating + 100}&limit=${TACTICS_POOL_SIZE}`
				);
				if (!upstream.ok) {
					throw new Error(`HTTP ${upstream.status}`);
				}
				const payload = await upstream.json();
				const puzzles = Array.isArray(payload) ? payload : [];
				const candidates = previousPuzzleId
					? puzzles.filter((puzzle) => getPuzzleId(puzzle as RawTacticsPuzzle) !== previousPuzzleId)
					: puzzles;
				const pool = candidates.length > 0 ? candidates : puzzles;
				data = pool.length > 0 ? [pool[Math.floor(Math.random() * pool.length)]] : [];
			} else {
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				data = await response.json();
			}

			if (requestId !== this.tacticsRequestId) {
				return;
			}

			if (data && data.length > 0) {
				const puzzle = normalizeTacticsPuzzle(data[0] as RawTacticsPuzzle);

				if (!puzzle) {
					throw new Error('Invalid puzzle payload');
				}

				this.startTacticsPuzzle(puzzle, 'live');

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

	async loadWrongTactic() {
		const previousPuzzleId = this.tacticsPuzzle?.puzzleid ?? null;
		const requestId = ++this.tacticsRequestId;
		this.resetTacticsState('loading');
		this.mode = 'tactics';
		this.playerColor = 'w';
		this.showNotification('Lade gespeicherte Fehlaufgabe...', 'success');

		try {
			const { data, error } = await supabase
				.from('wrong_tactics')
				.select('puzzle_id, rating, topics, fen, moves, color_to_move, position_id, last_failed_at')
				.order('last_failed_at', { ascending: false });

			if (error) {
				throw error;
			}

			if (requestId !== this.tacticsRequestId) {
				return;
			}

			const rows = (data ?? []) as WrongTacticRecord[];
			const candidates = previousPuzzleId
				? rows.filter((row) => row.puzzle_id !== previousPuzzleId)
				: rows;
			const pool = candidates.length > 0 ? candidates : rows;

			if (pool.length === 0) {
				this.tacticsStatus = 'empty';
				this.tacticsError = 'Es gibt noch keine falsch geloesten Taktiken zum Wiederholen.';
				this.wrongTacticsCount = 0;
				this.showNotification('Keine gespeicherten Fehlaufgaben gefunden.', 'error');
				return;
			}

			const selectedPuzzle = pool[Math.floor(Math.random() * pool.length)];
			const puzzle = normalizeWrongTactic(selectedPuzzle);

			if (!puzzle) {
				throw new Error('Invalid wrong tactic payload');
			}

			this.startTacticsPuzzle(puzzle, 'retry');
			this.wrongTacticsCount = rows.length;
			this.showNotification('Gespeicherte Fehlaufgabe bereit!', 'success');
		} catch (e) {
			if (requestId !== this.tacticsRequestId) {
				return;
			}

			console.error('Failed to load wrong tactic:', e);
			this.tacticsStatus = 'error';
			this.tacticsError = 'Die gespeicherte Fehlaufgabe konnte nicht geladen werden.';
			this.showNotification('Fehler beim Laden der Fehlaufgaben.', 'error');
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
				void this.clearSolvedWrongTactic();
				this.showNotification('Hervorragend! Aufgabe gelöst.', 'success');
			}
		} else {
			this.tacticsStatus = 'wrong';
			void this.saveCurrentTacticAsWrong();
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
