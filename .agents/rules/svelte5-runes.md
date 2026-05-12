# Svelte 5 Best Practices
- **Runes ONLY**: Always use `$state`, `$derived`, `$effect`, `$props`, and `$bindable`.
- **Avoid Legacy**: Never use `export let` (use `$props`), `$: ` (use `$derived` or `$effect`), or `createEventDispatcher` (use callback props).
- **Logic Placement**: Prefer `.svelte.ts` files for complex state logic to keep components lean.
- **Typing**: Always type props using TypeScript interfaces or types.
