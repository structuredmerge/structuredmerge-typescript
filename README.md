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

## Behavioral Authority

The mature Ruby implementation is the StructuredMerge behavioral golden
master. This TypeScript implementation is a conformance consumer and currently
lags Ruby in behavior and defect fixes. Shared specifications and fixtures are
portable evidence admitted from reviewed Ruby behavior; historical TypeScript
behavior does not override Ruby when they disagree.

Names containing `parity` describe only the dimensions asserted by their cited
fixtures. They do not claim complete behavioral equivalence with Ruby unless a
versioned conformance profile explicitly says so.

## Package Family

StructuredMerge TypeScript is a layered npm package family. The lower layers
provide parser, range, AST, merge, and template contracts; format packages apply
those contracts to specific languages and data formats; provider packages bind a
format family to a parser or serializer; workflow packages package TypeScript
project maintenance and Git-driver behavior.

Each package README keeps this section short and links here. This root guide is
the implementation inventory for TypeScript users who need to choose packages,
understand backend coverage, or wire a focused backend into a test suite.

The family is intentionally layered:

- [`@structuredmerge/tree-haver`][ts-tree-haver] provides parser portability, backend discovery, byte ranges, and runtime capability reporting.
- [`@structuredmerge/ast-merge`][ts-ast-merge] provides the cross-format merge substrate: shared contracts, diagnostics, review state, and execution reports.
- Family packages such as [`@structuredmerge/markdown-merge`][ts-markdown-merge], [`@structuredmerge/yaml-merge`][ts-yaml-merge], and [`@structuredmerge/toml-merge`][ts-toml-merge] own parser-neutral behavior for one format family.
- Provider packages such as [`@structuredmerge/markdown-it-merge`][ts-markdown-it-merge], [`@structuredmerge/js-yaml-merge`][ts-js-yaml-merge], and [`@structuredmerge/peggy-toml-merge`][ts-peggy-toml-merge] bind those families to concrete JavaScript parser libraries.

| Package | Layer | What it provides |
| --- | --- | --- |
| [`@structuredmerge/tree-haver`][ts-tree-haver] | Parser substrate | Parser backend registry, byte ranges, node wrappers, source locations, and binary tree contracts. |
| [`@structuredmerge/ast-merge`][ts-ast-merge] | Merge substrate | AST merge contracts, diagnostics, planning, review, replay, and nested merge vocabulary. |
| [`@structuredmerge/ast-template`][ts-ast-template] | Template substrate | Template/session transport contracts. |
| [`@structuredmerge/ast-crispr`][ts-ast-crispr] | Structured edits | AST edit recipes for generated blocks and template-owned regions. |
| [`@structuredmerge/ast-merge-git`][ts-ast-merge-git] | Git integration | Merge-driver, diff-driver, conflict inspection, and language registry plumbing for `smorg-ts`. |
| [`@structuredmerge/plain-merge`][ts-plain-merge] | Text | Plain-text fallback contracts. |
| [`@structuredmerge/json-merge`][ts-json-merge] | JSON and JSONC | Object/array-aware JSON merge behavior. |
| [`@structuredmerge/yaml-merge`][ts-yaml-merge] | YAML | YAML-family merge contracts. |
| [`@structuredmerge/toml-merge`][ts-toml-merge] | TOML | TOML-family merge contracts. |
| [`@structuredmerge/markdown-merge`][ts-markdown-merge] | Markdown | Markdown-family merge contracts. |
| [`@structuredmerge/ruby-merge`][ts-ruby-merge] | Ruby source | Ruby source merge contracts. |
| [`@structuredmerge/go-merge`][ts-go-merge] | Go source | Go source merge contracts. |
| [`@structuredmerge/javascript-merge`][ts-javascript-merge] | JavaScript source | JavaScript source merge contracts. |
| [`@structuredmerge/c-merge`][ts-c-merge] | C source | C source merge contracts. |
| [`@structuredmerge/cpp-merge`][ts-cpp-merge] | C++ source | C++ source merge contracts. |
| [`@structuredmerge/csharp-merge`][ts-csharp-merge] | C# source | C# source merge contracts. |
| [`@structuredmerge/java-merge`][ts-java-merge] | Java source | Java source merge contracts. |
| [`@structuredmerge/python-merge`][ts-python-merge] | Python source | Python source merge contracts. |
| [`@structuredmerge/rust-merge`][ts-rust-merge] | Rust source | Rust source merge contracts. |
| [`@structuredmerge/typescript-merge`][ts-typescript-merge] | TypeScript source | TypeScript source merge contracts. |
| [`@structuredmerge/binary-merge`][ts-binary-merge] | Binary | Binary tree planning contracts. |
| [`@structuredmerge/zip-merge`][ts-zip-merge] | Archives | ZIP archive planning helpers. |
| [`@structuredmerge/js-yaml-merge`][ts-js-yaml-merge] | YAML provider | Uses [`js-yaml`][js-yaml] as the YAML parser/emitter provider path. |
| [`@structuredmerge/peggy-toml-merge`][ts-peggy-toml-merge] | TOML provider | Uses [Peggy][peggy] generated parser code as the TOML provider path. |
| [`@structuredmerge/markdown-it-merge`][ts-markdown-it-merge] | Markdown provider | Uses [markdown-it][markdown-it] as the Markdown parser provider path. |
| [`@structuredmerge/typescript-compiler-merge`][ts-typescript-compiler-merge] | TypeScript provider | Uses the [TypeScript compiler API][typescript-compiler-api] provider path. |
| [`@structuredmerge/kettle-nodule`][ts-kettle-nodule] | Recipe tooling | npm workspace maintenance and package recipe helpers. |

[ts-tree-haver]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/tree-haver
[ts-ast-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ast-merge
[ts-ast-template]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ast-template
[ts-ast-crispr]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ast-crispr
[ts-ast-merge-git]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ast-merge-git
[ts-plain-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/plain-merge
[ts-json-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/json-merge
[ts-yaml-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/yaml-merge
[ts-toml-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/toml-merge
[ts-markdown-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/markdown-merge
[ts-ruby-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/ruby-merge
[ts-go-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/go-merge
[ts-javascript-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/javascript-merge
[ts-c-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/c-merge
[ts-cpp-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/cpp-merge
[ts-csharp-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/csharp-merge
[ts-java-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/java-merge
[ts-python-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/python-merge
[ts-rust-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/rust-merge
[ts-typescript-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/typescript-merge
[ts-binary-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/binary-merge
[ts-zip-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/zip-merge
[ts-js-yaml-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/js-yaml-merge
[ts-peggy-toml-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/peggy-toml-merge
[ts-markdown-it-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/markdown-it-merge
[ts-typescript-compiler-merge]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/typescript-compiler-merge
[ts-kettle-nodule]: https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/kettle-nodule
[js-yaml]: https://github.com/nodeca/js-yaml
[peggy]: https://peggyjs.org/
[markdown-it]: https://github.com/markdown-it/markdown-it
[typescript-compiler-api]: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API

## Install

Install the packages your tool needs:

```sh
pnpm add @structuredmerge/ast-merge @structuredmerge/json-merge
```

The packages are published under the `@structuredmerge` npm scope.

## Command

The TypeScript implementation ships the implementation-specific `smorg-ts`
command. Use that name in git configuration unless a package manager or local
install has provided a `smorg` symlink.

Package-manager formulas may expose the selected implementation as `smorg`.
For a local user-created symlink:

```sh
ln -s "$(command -v smorg-ts)" ~/.local/bin/smorg
```

```sh
git config merge.smorg-ts.driver 'smorg-ts merge-driver %O %A %B %P'
git config diff.smorg-ts.command 'smorg-ts diff-driver'
smorg-ts conflicts diff path/to/file-with-conflicts.go
smorg-ts languages --gitattributes
```

`merge-driver` updates Git's `%A` file by default, or writes to `--output` when
used outside git. `diff-driver` accepts both the two-argument local form and the
seven- or nine-argument forms Git passes to external diff commands.
`conflicts diff` reports conflict-marker regions in a file that already contains
Git conflict markers.

Semantic merge-driver coverage is fixture-backed for JSON. Other language and
format paths are git-compatible command surfaces without semantic driver
coverage.

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
- [`@structuredmerge/c-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/c-merge)
- [`@structuredmerge/cpp-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/cpp-merge)
- [`@structuredmerge/csharp-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/csharp-merge)
- [`@structuredmerge/java-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/java-merge)
- [`@structuredmerge/python-merge`](https://github.com/structuredmerge/structuredmerge-typescript/tree/main/packages/python-merge)
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
fixtures. Those fixtures encode portable behavior derived from the Ruby golden
master and reviewed for cross-runtime use. Conformance checks live in package
tests and in the shared spec/fixture tooling rather than in a static status
document.

## Development

Common checks:

- `mise run check`
- `pnpm run check`
- `pnpm test`
