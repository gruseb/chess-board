import { Chess } from 'chess.js';

export class GameStore {
	private chess = $state(new Chess());

	// Computed properties for the board and game state
	get board() {
		return this.chess.board();
	}

	get turn() {
		return this.chess.turn();
	}

	get isGameOver() {
		return this.chess.isGameOver();
	}

	get isCheckmate() {
		return this.chess.isCheckmate();
	}

	get isStalemate() {
		return this.chess.isStalemate();
	}

	get isDraw() {
		return this.chess.isDraw();
	}

	get isCheck() {
		return this.chess.isCheck();
	}

	get history() {
		return this.chess.history({ verbose: true });
	}

	// Actions
	move(from: string, to: string) {
		try {
			// Using chess.js move, default to queen promotion for simplicity right now
			const result = this.chess.move({ from, to, promotion: 'q' });
			// Create a new instance to trigger reactivity in Svelte 5
			const newChess = new Chess();
			newChess.loadPgn(this.chess.pgn());
			this.chess = newChess;
			return result;
		} catch (e) {
			// Invalid move
			return null;
		}
	}

	reset() {
		this.chess = new Chess();
	}

	undo() {
		const result = this.chess.undo();
		if (result) {
			const newChess = new Chess();
			newChess.loadPgn(this.chess.pgn());
			this.chess = newChess;
		}
		return result;
	}
}

// Export a singleton instance for simplicity, or we can instantiate it per component
export const game = new GameStore();
