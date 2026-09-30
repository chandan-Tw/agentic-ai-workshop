# WorkshopHub Agent Guide

## Project Context

WorkshopHub is a private pnpm monorepo for managing workshop training sessions.

- `api/` contains the Express + TypeScript backend.
  - Prisma is used for database access and schema management.
  - Routes live in `api/src/routes/`.
  - Business logic belongs in `api/src/services/`.
  - API tests live in `api/tests/`.
- `app/` contains the React + TypeScript frontend.
  - Pages live in `app/src/pages/`.
  - Reusable UI components live in `app/src/components/`.
  - Shared frontend types live in `app/src/types/`.
- The repository uses pnpm workspaces. Root-level commands coordinate the packages.

## Team Norms

- Do not use `any`. Prefer precise types, generics, unions, or `unknown` with appropriate narrowing.
- Do not access Prisma directly from route handlers. Routes should delegate business logic and database access to services.
- Keep API behavior covered by the existing unit and integration test structure.
- All code must pass both `make test` and `make lint` before it is considered complete.
- Keep changes focused, preserve existing public APIs unless a change is required, and follow the conventions of the surrounding code.

## Validation Commands

```sh
make test
make lint
```

## MCP Permissions

<!-- Placeholder: document approved MCP tools, scopes, and permission requirements here. -->

## AGENT_BOUNDARY

<!-- Placeholder: define the agent's allowed scope, prohibited actions, and escalation boundaries here. -->
