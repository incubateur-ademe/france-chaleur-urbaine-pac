# Tech Stack

Versions live in `package.json` and are authoritative.

## Core

- Vite 8, React 19, TypeScript 5.9 strict.
- Node 24 and pnpm 10 only.
- Client-only app; no server framework by default.

## UI

- `@codegouvfr/react-dsfr` for DSFR components and styles.
- Plain CSS is enough for the initial shell; add Tailwind only if a real need appears.

## Publicodes

- `@betagouv/france-chaleur-urbaine-publicodes` provides FCU rules and generated types.
- `publicodes` is installed as the peer runtime.

## Tooling

- Biome 2.4.10 for lint + format.
- Vitest 4 + Testing Library + happy-dom.
- Husky + lint-staged + node-talisman for pre-commit checks.
