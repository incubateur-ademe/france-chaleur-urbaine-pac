# France Chaleur Urbaine PAC MI

Prototype Vite + React consommant le paquet `@betagouv/france-chaleur-urbaine-publicodes`.

## Prérequis

- Node 24
- pnpm 10

## Commandes

```bash
pnpm install
pnpm dev
pnpm lint
pnpm ts
pnpm test
pnpm build
```

## Builds

```bash
pnpm build:dev
pnpm build:demo
pnpm build:prod
```

- `build:dev`: includes DSFR and uses `http://localhost:3000` as the default API URL.
- `build:demo`: includes DSFR and uses `https://france-chaleur-urbaine-dev-pr1255.osc-fr1.scalingo.io` as the default API URL.
- `build:prod`: excludes DSFR and uses `https://france-chaleur-urbaine.beta.gouv.fr` as the default API URL.

`pnpm build` is an alias for `pnpm build:prod`.

Le dépôt GitHub cible est `https://github.com/incubateur-ademe/france-chaleur-urbaine-pac`.
