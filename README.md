# FreshSave Marketplace

FreshSave is a browser-based food-expiry tracker and surplus-food marketplace built with HTML, CSS, and vanilla JavaScript modules. Vite provides the development server and production build; it is not used as a UI framework.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite (by default, `http://localhost:8443`). Create a production build with `pnpm build`.

## Project structure

```text
index.html                 Shared HTML shell and app entry point
css/
  global.css               Existing font, design tokens, reset, and base styles
  app.css                  Ordered imports for all app styles
  components/               Shared navigation, forms, buttons, tables, and overlays
  pages/                    Screen-specific styles
  responsive.css            Existing responsive breakpoints
src/
  app.js                    Hash router and global event delegation
  core.js                   Shared state, helpers, and UI primitives
  data.js                   Demo records, categories, and reference data
  components/
    navigation.js           Shared role-aware navigation and header updates
    notifications.js        Shared notification and account popovers
  views/
    account.js              Dashboard, notifications, impact, and profile screens
    auth.js                 Login, registration, and password recovery screens
    listings.js             Listing creation, seller listings, and clearance basket
    market.js               Marketplace, product details, seller profile, and chat
    reservations.js         Reservation list and detail screens
    tracking.js             Scanner, barcode, inventory, and batch screens
public/
  favicon.png
  robots.txt
```

## Screens and navigation

The app is a single-page application: `index.html` provides the shared header, navigation, footer, dialogs, and main content outlet. The hash router renders each screen through its feature module in `src/views/`; shared state and interactions remain in `src/core.js` and `src/app.js`. This keeps existing navigation, local browser data, and screen behavior intact without duplicating an HTML shell for every route.

Screen styles are split into `css/pages/`, while reusable styles are in `css/components/`. `css/app.css` imports them in the original cascade order so this code-organization change does not redesign the interface.
