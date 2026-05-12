# Error-First Development Rules
- **No New Features on Broken Code**: Before adding any new functionality, ensure that the project (or at least the affected components) is free of linting, TypeScript, and runtime errors.
- **Proactive Validation**: Frequently run `pnpm check` (Svelte-Check) and `pnpm test` to identify hidden issues.
- **Fix First**: If a task involves a file with existing errors or warnings, prioritize fixing them before making any other changes.
- **Avoid Suppressions**: Do not use `ts-ignore`, `eslint-disable`, or `@ts-nocheck` unless it is an absolute last resort. If used, provide a clear comment explaining why the fix is not possible.
- **Clean Build**: Ensure that the project can build successfully (`pnpm build`) without errors before considering a major task complete.
