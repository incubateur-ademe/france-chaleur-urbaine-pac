# Architecture & Structure

## Stack flow

This repository is a small frontend prototype. It has no server runtime, database layer, Next.js pages, tRPC router, or background jobs.

## Structure

| Area | Location | Purpose |
|------|----------|---------|
| App shell | `src/App.tsx` | Journey state, API calls, URL synchronization and high-level composition |
| Questionnaire | `src/Questionnaire.tsx` | Steps 1 to 8 and their form controls |
| Questionnaire constants | `src/constants.ts` | Static questionnaire labels, choices, recommendations and step metadata |
| Questionnaire journey | `src/questionnaire.ts` | Journey state initialization, URL synchronization and route outcome helpers |
| Results page | `src/ResultsPage.tsx` | Recommendations and simulation result presentation |
| Shared contracts | `src/types.ts` | Domain values and types shared across the journey components |
| Entry point | `src/main.tsx` | DSFR startup, CSS imports, React mounting |
| Tests | `src/**/*.spec.tsx` | Component and utility tests |
| Test setup | `src/test/setup.ts` | Testing Library / Vitest setup |
| Styles | `src/styles.css` | Project-specific CSS on top of DSFR |
| Build config | `vite.config.ts` | Vite application config |
| Test config | `vitest.config.mts` | Vitest config |

## Boundaries

- Keep the app client-only unless the project explicitly gains a backend.
- Prefer direct imports from `@betagouv/france-chaleur-urbaine-publicodes` for publicodes rules and types.
- Keep domain code in `src/` with focused files; introduce folders only when there are multiple related files.
