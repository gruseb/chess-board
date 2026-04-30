import { Chess } from 'chess.js';
import { supabase } from '$lib/supabaseClient';

export type GameMode = 'local' | 'engine';

export type SaveNotification = {
	message: string;
	type: 'success' | 'error';
} | null;

export class GameStore {
	private chess = $state(new Chess());
	mode = $state<GameMode>('local');
	engineDifficulty = $state(8); // 1-10
	playerColor = $state<'w' | 'b'>('w');
	notification = $state<SaveNotification>(null);
	
	private engineWorker: Worker | null = null;
	private engineReady = false;

	constructor() {
		this.initEngine();
	}

	private initEngine() {
		if (typeof window !== 'undefined') {
			this.engineWorker = new Worker('/stockfish.js');
			this.engineWorker.onmessage = (event) => this.handleEngineMessage(event);
			this.engineWorker.postMessage('uci');
		}
	}

	private handleEngineMessage(event: MessageEvent) {
		const line = event.data;
		console.log('[Stockfish]', line);
		if (line === 'uciok') {
			this.engineReady = true;
			this.engineWorker?.postMessage('isready');
		}
		if (line.startsWith('bestmove')) {
			const move = line.split(' ')[1];
			if (move && move !== '(none)') {
				this.move(move.substring(0, 2), move.substring(2, 4), move.length === 5 ? move[4] : undefined, true);
			}
		}
	}

	private triggerEngineMove() {
		if (this.mode !== 'engine' || !this.engineReady) return;
		if (this.turn === this.playerColor || this.isGameOver) return;

		// Calculate Skill Level from difficulty (1-10 mapped to 0-20)
		const skillLevel = Math.floor((this.engineDifficulty - 1) * (20 / 9));
		this.engineWorker?.postMessage(`setoption name Skill Level value ${skillLevel}`);
		this.engineWorker?.postMessage(`position fen ${this.chess.fen()}`);
		
		// Map difficulty to depth (1-10 -> 1-15)
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

	// Computed properties for the board and game state
	get board() { return this.chess.board(); }
	get turn() { return this.chess.turn(); }
	get isGameOver() { return this.chess.isGameOver(); }
	get isCheckmate() { return this.chess.isCheckmate(); }
	get isStalemate() { return this.chess.isStalemate(); }
	get isDraw() { return this.chess.isDraw(); }
	get isCheck() { return this.chess.isCheck(); }
	get history() { return this.chess.history({ verbose: true }); }

	// Actions
	move(from: string, to: string, promotion: string = 'q', isEngineMove: boolean = false) {
		try {
			// Prevent user from manually moving during the engine's turn
			if (this.mode === 'engine' && !isEngineMove && this.turn !== this.playerColor) {
				return null;
			}

			const result = this.chess.move({ from, to, promotion });
			const newChess = new Chess();
			newChess.loadPgn(this.chess.pgn());
			this.chess = newChess;

			if (this.isGameOver) {
				this.saveGame();
			} else if (this.mode === 'engine' && this.turn !== this.playerColor) {
				setTimeout(() => this.triggerEngineMove(), 250);
			}

			return result;
		} catch (e) {
			return null;
		}
	}

	setMode(newMode: GameMode) {
		this.mode = newMode;
		this.reset();
	}

	reset() {
		this.chess = new Chess();
		if (this.mode === 'engine') {
			this.playerColor = Math.random() > 0.5 ? 'w' : 'b';
			if (this.playerColor === 'b') {
				setTimeout(() => this.triggerEngineMove(), 500);
			}
		} else {
			this.playerColor = 'w';
		}
	}

	undo() {
		const result = this.chess.undo();
		if (result && this.mode === 'engine') {
			this.chess.undo();
		}
		const newChess = new Chess();
		newChess.loadPgn(this.chess.pgn());
		this.chess = newChess;
		return result;
	}
}

export const game = new GameStore();
