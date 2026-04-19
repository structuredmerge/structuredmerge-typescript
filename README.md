# Structured Merge TypeScript

Monorepo for the TypeScript implementation of the Structured Merge library
family.

Initial workspace packages:

- `@structuredmerge/tree-haver`
- `@structuredmerge/ast-merge`
- `@structuredmerge/text-merge`
- `@structuredmerge/json-merge`

## Development

Standard repo tasks are exposed through `mise` and `pnpm`:

- `mise run install`
- `mise run format`
- `mise run format-check`
- `mise run lint`
- `mise run typecheck`
- `mise run test`
- `mise run check`

The TypeScript monorepo uses:

- `eslint` for linting
- `prettier` for formatting
- `tsc` for type checking
- `vitest` for unit tests

Integration tests consume the shared fixture corpus from the sibling
`../fixtures` repository rather than copying fixture data into this monorepo.
