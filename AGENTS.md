# AGENTS.md — AI documentation index

> Root index for AI agents. Detailed docs live in `.ai/context/`; load the relevant one before working on an area.

## Workflow

- Re-evaluate which `.ai/context/` files to load on every message and at each phase: implement / test / debug / refactor have different triggers.
- Ambiguous request -> ask before guessing
- Code changes: minor (typo, rename, one-liner) -> do it directly; significant (feature, refactor, multi-file) -> plan -> confirm -> implement.
- Before delivering any code change: run `pnpm lint`, `pnpm ts`, `pnpm test` when relevant, and `pnpm build` for bundling-sensitive changes.
- Update the relevant `AGENTS.md` / `.ai/context/*.md` when a change alters the project high-level behavior or integration points.
- Deliver with a 4-5 sentence overview, then one line per file changed.
- Before proposing: is it the minimal solution? Does it duplicate or reintroduce something? Would a senior reviewer object?

## Developer profile

- Senior dev in a small team; wants a critical pair programmer, not a yes-man.
- Direct, factual, no filler. Respond in French; code and docs in English.
- Ship-ready on first delivery: zero TS errors, zero lint warnings, minimum viable solution, no over-engineering.
- Flag doubts, race conditions and limitations before implementing. No unsolicited changes to surrounding code.
- Deliver one definitive recommendation, no contradictory back-and-forth, no live deliberation.

## Feedback storage

Persistent feedback (coding rules, conventions, project decisions) goes in the project docs: this file for cross-cutting rules, the relevant `.ai/context/*.md` otherwise. Never in personal memory.

## Context Files Index

Load before working on the related area.

| File | Load when... |
|------|--------------|
| [architecture.md](.ai/context/architecture.md) | Adding/moving files, creating app structure, understanding boundaries |
| [commands.md](.ai/context/commands.md) | Running lint, typecheck, build, tests, CLI |
| [conventions.md](.ai/context/conventions.md) | Writing or reviewing any code |
| [git-workflow.md](.ai/context/git-workflow.md) | Commits, branches, PRs, protected files |
| [stack.md](.ai/context/stack.md) | Choosing a library, checking versions, upgrading deps |
| [styling.md](.ai/context/styling.md) | Any UI `.tsx` / CSS change: DSFR, responsive, icons |
| [testing.md](.ai/context/testing.md) | Writing/modifying/running tests |

## Code Navigation

Prefer LSP over grep when available: go to definition / find references before renaming or changing a signature, hover for types, diagnostics after writing. Use `rg` for comments, strings, config values and broad searches.
