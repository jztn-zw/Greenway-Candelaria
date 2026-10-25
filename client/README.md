# GreenWay web client

React, TypeScript, Vite, and Tailwind portal for administrators, collectors, and residents. Run commands from this directory. API and mobile applications live outside `client/`.

## Current tech stack

- React 18.3, TypeScript 5.8 and Vite 5.4 with the React SWC plugin.
- Tailwind CSS 3.4, Radix UI primitives, Lucide icons and shared semantic theme styles.
- React Router 6 for role-specific pages; TanStack Query 5, Zustand 5, Axios and Socket.IO Client for account-scoped data and live updates.
- Leaflet/OpenStreetMap for maps, Recharts for charts, pdf-lib/fontkit for municipal PDF exports, and Mediabunny/browser media APIs for replay video encoding.
- ESLint/TypeScript for static checks, Vite production builds and browser smoke checks.

See the [shared tech stack reference](../docs/tech-stack.md) for exact lockfile versions and external integrations. Native mobile apps use Expo/React Native; this web client is not a Capacitor app.

## Development

Install dependencies with `npm ci`. Copy `.env.example` to `.env.local` and set the local API configuration. Keep local environment files out of Git.

```sh
npm run dev
npm run lint
node node_modules/typescript/bin/tsc -b --pretty false
npm run build
```

`package-lock.json` is the dependency lockfile. `node_modules/`, `dist/`, TypeScript build caches, and test reports are generated locally.

## Source structure

| Folder | Responsibility |
| --- | --- |
| `src/app/` | Providers, route definitions, route guard, and role layouts |
| `src/features/` | Feature pages and their components, hooks, types, and styles, grouped by role; public pages live in `landing/` |
| `src/components/ui/` | Shared UI primitives and their styles |
| `src/components/common/` | Shared controls, page headers, avatars, and content styles |
| `src/components/dialogs/` | Shared confirmation, form, logout, and unsaved-change dialogs |
| `src/components/feedback/` | Error boundaries, retry controls, and refresh notices |
| `src/components/loading/` | Page loading skeletons |
| `src/components/motion/` | Shared animation and page transition wrappers |
| `src/components/admin/`, `calendar/`, `maps/`, `messenger/` | Shared components for those areas |
| `src/services/` | HTTP API contracts and requests |
| `src/lib/` | Query, realtime, session, theme, and other application infrastructure |
| `src/hooks/` | Hooks used by multiple features |
| `src/store/` | Shared client state |
| `src/utils/`, `config/` | General helpers and static application configuration |
| `src/assets/` | Assets imported by the bundle |
| `public/` | Files served at fixed URLs, including stored avatar URLs and site verification |
| `docs/` | Query and realtime behavior documentation |

Keep feature-only code with its owning feature. Admin messaging belongs in `src/features/admin/messages/`, independently of truck tracking. Use the `@/` alias for imports across folders and keep related component styles together.

Application tests, their setup/helpers and the Vitest configuration were removed at the owner's request on 25 October 2026. The test/watch scripts were removed; test dependencies remain installed. Current verification uses lint, TypeScript, production builds and browser checks.

The application TypeScript configuration checks for unused imports, local declarations, and parameters. Remove abandoned code when replacing a feature flow; keep active error handling, empty states, and loading placeholders.

Use `THEME.md` for shared styling rules and `docs/admin-query.md` and `docs/resident-query.md` before changing query or realtime behavior.
