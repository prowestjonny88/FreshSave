# FreshSave Marketplace

## Frontend

Use HTML, CSS, and vanilla JavaScript modules only. Do not add a UI framework, CSS framework, TypeScript, or JSX. Preserve the existing interface and interactions unless a task explicitly asks for a redesign.

## Project structure

- `index.html` contains the shared single-page app shell.
- `css/global.css` contains the original design tokens and base styles; `css/app.css` imports shared components, screen styles, and responsive styles in cascade order.
- `css/components/` contains reusable interface styles; `css/pages/` contains styles grouped by screen or feature.
- `src/app.js` handles routing and global event delegation.
- `src/core.js` contains shared state, helpers, and UI primitives; `src/data.js` contains demo and reference data.
- `src/components/` contains shared JavaScript components such as navigation and popovers.
- `src/views/` contains screen renderers and interactions, grouped by feature (`auth`, `tracking`, `market`, `listings`, `reservations`, and `account`).
- `vite.config.js` configures the development server and production build. Vite is a build tool, not a frontend framework.

## Development and build

Run `pnpm dev` for local development and `pnpm build` to verify a production build. Keep shared styles in `css/components/`, screen styles in `css/pages/`, and screen behavior in the appropriate module under `src/views/`.
