import { Chess } from 'chess.js';
import { supabase } from '$lib/supabaseClient';
import { base } from '$app/paths';

export type GameMode = 'local' | 'engine' | 'analysis';

export type SaveNotification = {
	message: string;
	type: 'success' | 'error';
} | null;

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

function makeId(): string {
	return Math.random().toString(36).slice(2, 9);
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
		if (!this.isGameOver) return;

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

	/** US13: Partie bis zum aktuellen Zeitpunkt speichern */
	async saveCurrentGame() {
		const pgn = this.chess.pgn();
		if (!pgn) {
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

		if (fen === STARTING_FEN) {
			this.showNotification('Anfangsstellung muss nicht gespeichert werden.', 'error');
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

		const colorToMove = this.turn === 'w' ? 'white' : 'black';

		const { error } = await supabase.from('position').insert({
			fen,
			color_to_move: colorToMove,
			title: `Position nach Zug ${this.history.length}`
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

			if (this.isGameOver && this.mode !== 'analysis') {
				this.saveGame();
			} else if (this.mode === 'engine' && this.turn !== this.playerColor) {
				setTimeout(() => this.triggerEngineMove(), 250);
			}

			return moveResult;
		} catch {
			return null;
		}
	}

	setMode(newMode: GameMode) {
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

	loadFen(fen: string) {
		try {
			const newChess = new Chess(fen);
			this.chess = newChess;
			this.showNotification('Position geladen!', 'success');

			if (this.mode === 'analysis') {
				this.analysisNodes = [
					{ id: 'root', san: '', fen, parentId: null }
				];
				this.currentNodeId = 'root';
			}

			if (this.mode === 'engine' && this.turn !== this.playerColor) {
				setTimeout(() => this.triggerEngineMove(), 500);
			}

			if (this.isAnalyzing) this.triggerAnalysis();
		} catch (e) {
			console.error('Failed to load FEN:', e);
			this.showNotification('Fehler beim Laden der Position.', 'error');
		}
	}
}

export const game = new GameStore();
