# Tech Stack

Versions live in `package.json` and are authoritative.

## Core

- Vite 8, React 19, TypeScript 5.9 strict.
- Node 24 and pnpm 10 only.
- Client-only app; no server framework by default.

## UI

- DSFR is provided by the host page in production; do not add `@codegouvfr/react-dsfr` or bundle DSFR in the app.
- `vite.config.ts` injects DSFR 1.13.1 CSS and JS only during `pnpm dev`; production builds exclude those tags.
- Use native DSFR HTML structure and `fr-*` classes in React components.
- Plain CSS is enough for the initial shell; add Tailwind only if a real need appears.

## Publicodes

- `@betagouv/france-chaleur-urbaine-publicodes` provides FCU rules and generated types.
- `publicodes` is installed as the peer runtime.

## Tooling

- Biome 2.4.10 for lint + format.
- Vitest 4 + Testing Library + happy-dom.
- Husky + lint-staged + node-talisman for pre-commit checks.
