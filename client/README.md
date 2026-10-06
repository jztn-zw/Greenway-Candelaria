# GreenWay web client

React, TypeScript, Vite, and Tailwind portal for administrators, collectors, and residents. Run commands from this directory. API and mobile applications live outside `client/`.

## Development

Install dependencies with `npm ci`. Copy `.env.example` to `.env.local` and set the local API configuration. Keep local environment files out of Git.

```sh
npm run dev
npm test
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
| `src/test/` | Test setup and shared test helpers |
| `public/` | Files served at fixed URLs, including stored avatar URLs and site verification |
| `docs/` | Query and realtime behavior documentation |

Keep feature-only code with its owning feature. Admin messaging belongs in `src/features/admin/messages/`, independently of truck tracking. Use the `@/` alias for imports across folders and keep related component styles together.

Keep meaningful `.test.ts` and `.test.tsx` files beside the behavior they verify. Vitest discovers them automatically. Test files are not application entry points and are not bundled into the production website.

The application TypeScript configuration checks for unused imports, local declarations, and parameters. Remove abandoned code when replacing a feature flow; keep active error handling, empty states, and loading placeholders.

Use `THEME.md` for shared styling rules and `docs/admin-query.md` and `docs/resident-query.md` before changing query or realtime behavior.
