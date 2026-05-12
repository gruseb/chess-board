# Chess Logic & Stockfish Rules
- **Library**: Use `chess.js` for move validation and FEN/PGN handling.
- **Engine**: Manage `stockfish.js` instances carefully. Use Web Workers where possible to avoid blocking the UI.
- **Move History**: Maintain the `GameStore` as the single source of truth for the current board state and move history.
- **Validation**: Validate all incoming FEN strings or move sequences before updating the state or database.
