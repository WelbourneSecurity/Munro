# Contributing

Munro is a small, restrained tracker. Read [SOUL.md](SOUL.md) before changing
product behaviour, visuals, data handling or scope.

## Setup

```sh
npm ci
pip install -r requirements.txt
```

## Development

```sh
npm run dev
npm run build
npm run preview
```

## Checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run test:coverage
npm run test:e2e
npm run verify
mkdocs build --strict
```

## Pull requests

One focused change per branch and PR — the MVP was built as one
implementation-plan task per PR, and that discipline continues. Keep changes
inside the PR's stated scope, keep peak source data separate from user
progress, and update the docs (README, `wiki/`, `CLAUDE.md`) in the same PR
when a change alters commands, stack facts, data or behaviour.

Use Conventional Commit-style messages. The expected types are `feat:`, `fix:`,
`docs:`, `chore:` and `data:`. Use `data:` for reviewed hill-list or boundary
data changes.

The pre-commit hook runs `lint-staged`, which applies ESLint fixes and Prettier
only to staged files. Type checking and tests stay in CI and in `npm run verify`.

`eslint-plugin-jsx-a11y` has not declared ESLint 10 peer support yet. The npm
install tolerates that peer metadata while keeping the plugin active in linting.
