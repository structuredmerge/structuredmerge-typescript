# StructuredMerge TypeScript

TypeScript implementation of the StructuredMerge contract.

This repository is one of four peer launch implementations: [Go](https://github.com/structuredmerge/structuredmerge-go), [TypeScript](https://github.com/structuredmerge/structuredmerge-typescript), [Rust](https://github.com/structuredmerge/structuredmerge-rust), and [Ruby](https://github.com/structuredmerge/structuredmerge-ruby). The language repos are not separate products. They consume the same public spec and shared fixture corpus so tools can choose the runtime surface that fits their environment.

Project links:

- Website: <https://structuredmerge.org>
- Implementations overview: <https://structuredmerge.org/implementations.html>
- Conformance model: <https://structuredmerge.org/conformance.html>
- Specification: <https://github.com/structuredmerge/structuredmerge-spec>
- Shared fixtures: <https://github.com/structuredmerge/structuredmerge-fixtures>

## Workspace

This is a pnpm workspace for StructuredMerge packages.

Package directories:

- [`@structuredmerge/ast-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ast-merge)
- [`@structuredmerge/ast-template`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ast-template)
- [`@structuredmerge/go-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/go-merge)
- [`@structuredmerge/json-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/json-merge)
- [`@structuredmerge/js-yaml-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/js-yaml-merge)
- [`@structuredmerge/kettle-nodule`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/kettle-nodule)
- [`@structuredmerge/markdown-it-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/markdown-it-merge)
- [`@structuredmerge/markdown-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/markdown-merge)
- [`@structuredmerge/peggy-toml-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/peggy-toml-merge)
- [`@structuredmerge/ruby-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ruby-merge)
- [`@structuredmerge/rust-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/rust-merge)
- [`@structuredmerge/text-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/text-merge)
- [`@structuredmerge/toml-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/toml-merge)
- [`@structuredmerge/tree-haver`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/tree-haver)
- [`@structuredmerge/typescript-compiler-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/typescript-compiler-merge)
- [`@structuredmerge/typescript-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/typescript-merge)
- [`@structuredmerge/yaml-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/yaml-merge)

## Conformance

Integration tests should consume the shared fixture corpus from the sibling `../structuredmerge-fixtures` checkout. A ruleset, fixture, diagnostic shape, or review outcome should mean the same thing whether exercised through Go, TypeScript, Rust, or Ruby.

Use the spec repository's conformance matrix for the current launch-readiness snapshot:

- <https://github.com/structuredmerge/structuredmerge-spec/blob/main/conformance-matrix.md>
- <https://github.com/structuredmerge/structuredmerge-spec/blob/main/IMPLEMENTATION_STATUS.md>

## Development

Standard repo tasks are exposed through `mise` and native TypeScript tooling.

Common checks:

- `mise run check`
- `pnpm test`

## Status

Early implementation work. Public compatibility claims should be tied to shared fixtures and documented conformance status rather than runtime-specific assumptions.
