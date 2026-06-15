# Testing

## Stack

- Vitest runs component and utility tests.
- Testing Library is used for React assertions.
- `happy-dom` is the DOM environment.

## Commands

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## Notes

The publicodes package currently publishes JSON through `import ... assert { type: "json" }`. Vite can bundle it for the app, but Vitest on Node 24 may fail if tests load it directly. For UI shell tests, mock the package when the test does not need the real rule set.
