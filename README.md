# StructuredMerge TypeScript

StructuredMerge TypeScript provides npm packages for editor integrations,
web-hosted tools, Node services, and other JavaScript runtimes that need
portable structured-merge behavior.

The workspace includes the core AST/review contracts, parser substrate support,
format-specific merge packages, binary/ZIP planning helpers, provider adapters,
and a TypeScript packaging recipe package.

Project links:

- Website: <https://structuredmerge.org>
- Implementations: <https://structuredmerge.org/implementations.html>
- Specification: <https://github.com/structuredmerge/structuredmerge-spec>
- Shared fixtures: <https://github.com/structuredmerge/structuredmerge-fixtures>

## Install

Install the packages your tool needs:

```sh
pnpm add @structuredmerge/ast-merge @structuredmerge/json-merge
```

The packages are published under the `@structuredmerge` npm scope.

## Packages

Core:

- [`@structuredmerge/tree-haver`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/tree-haver) - parser substrate, byte ranges, backend adapters, and binary tree contracts.
- [`@structuredmerge/ast-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ast-merge) - AST merge contracts, diagnostics, planning, review, replay, and nested-merge vocabulary.
- [`@structuredmerge/ast-template`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ast-template) - template/session transport contracts.

Format libraries:

- [`@structuredmerge/plain-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/plain-merge)
- [`@structuredmerge/json-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/json-merge)
- [`@structuredmerge/yaml-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/yaml-merge)
- [`@structuredmerge/toml-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/toml-merge)
- [`@structuredmerge/markdown-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/markdown-merge)
- [`@structuredmerge/ruby-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ruby-merge)
- [`@structuredmerge/go-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/go-merge)
- [`@structuredmerge/javascript-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/javascript-merge)
- [`@structuredmerge/rust-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/rust-merge)
- [`@structuredmerge/typescript-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/typescript-merge)
- [`@structuredmerge/binary-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/binary-merge)
- [`@structuredmerge/zip-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/zip-merge)

Provider and recipe packages:

- [`@structuredmerge/js-yaml-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/js-yaml-merge)
- [`@structuredmerge/peggy-toml-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/peggy-toml-merge)
- [`@structuredmerge/markdown-it-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/markdown-it-merge)
- [`@structuredmerge/typescript-compiler-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/typescript-compiler-merge)
- [`@structuredmerge/kettle-nodule`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/kettle-nodule)

## Portability

The TypeScript packages are developed against the shared StructuredMerge
fixtures. Those fixtures define the cross-language behavior expected from the
Go, TypeScript, Rust, and Ruby implementations. Conformance checks live in
package tests and in the shared spec/fixture tooling rather than in a static
launch-status document.

## Development

Common checks:

- `mise run check`
- `pnpm run check`
- `pnpm test`
