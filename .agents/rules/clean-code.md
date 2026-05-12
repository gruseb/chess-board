# Clean Code & Maintainability Rules
- **Intentional Naming**: Variables, functions, and components must have descriptive names that reveal their intent (e.g., `isMoveLegal` instead of `check`).
- **Single Responsibility Principle (SRP)**: Each function and component should do one thing. Break down large Svelte components (over 250 lines) into smaller sub-components in `$lib/components`.
- **DRY (Don't Repeat Yourself)**: Extract common chess logic or UI patterns into utility functions or shared components.
- **Early Returns / Guard Clauses**: Prefer early returns to reduce nesting levels and improve readability.
- **Magic Numbers & Strings**: Extract magic numbers, specific FEN strings, and configuration values into a central `constants.ts` or at the top of the relevant file.
- **Strict Typing**: NO `any`. Use TypeScript interfaces/types for all data structures, especially for Chess objects (FEN, PGN, Move, Position).
- **Comments**: Write comments to explain "Why" a piece of logic exists, not "What" it is doing (which should be clear from the code itself).
- **Consistent Formatting**: Always follow the project's Prettier and ESLint configurations.
