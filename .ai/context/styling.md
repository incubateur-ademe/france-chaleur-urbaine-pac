# Styling

- Use native DSFR HTML structure and `fr-*` classes; do not use `@codegouvfr/react-dsfr`.
- Production relies on the host page providing DSFR CSS and JS; `vite.config.ts` injects DSFR 1.13.1 assets only in dev.
- UI text is French.
- Keep project CSS in `src/styles.css` until the app needs a larger styling structure.
- Check responsive behavior when adding layout-heavy components.
