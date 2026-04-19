# TypeScript PLAN

## Objective

Build the first non-Ruby implementation of the merge stack as a family of npm
packages, using tree-sitter as the primary analysis backend for MVP releases.

This implementation should be the first portability target because there is an
immediate TypeScript application use case and because package/API design
feedback will come quickly in the JavaScript ecosystem.

## License

Planned dual license for all new TypeScript merge-stack packages:

- `AGPL-3.0-only`
- `PolyForm-Small-Business-1.0.0`

Reference:

- `LICENSE_TEMPLATE_PLAN.md`

## Scope Boundary

This plan does not attempt to recreate `kettle-jem` as-is.

Initial focus:

1. parser/runtime adapter
2. merge core abstractions
3. text merge MVP
4. JSON and JSONC merge MVP
5. shared-fixture conformance runner

Deferred:

- package templating/scaffolding
- full markdown merge parity
- TOML/YAML parity
- CRISPR/ruleset execution parity
- kettle-dev/kettle-test equivalents

## Proposed Package Family

Initial package candidates:

- `@structuredmerge/tree-haver`
- `@structuredmerge/ast-merge`
- `@structuredmerge/text-merge`
- `@structuredmerge/json-merge`

Possible later packages:

- `@structuredmerge/toml-merge`
- `@structuredmerge/yaml-merge`
- `@structuredmerge/markdown-merge`
- `@structuredmerge/merge-ruleset`
- `@structuredmerge/package-template`

## Ruby Mapping

Reference Ruby siblings to study first:

- `tree_haver`
- `ast-merge`
- `json-merge`
- `markdown-merge`
- `toml-merge`
- `psych-merge`
- `kettle-jem`

For MVP, the critical mapping is:

- `tree_haver` -> tree-sitter runtime/load API
- `ast-merge` -> shared merge model and diagnostics
- text merge behavior in Ruby stack -> portable text merge MVP
- `json-merge` -> JSON/JSONC merge semantics

## Tree-Sitter Strategy

Primary backend:

- Node bindings for tree-sitter

Current constraint:

- In this workspace environment, the official native Node binding is blocked on
  Node `22.22.2` because no native build is available here, and the published
  `tree-sitter-json` grammar package still advertises `tree-sitter ^0.21.1` as
  its peer range.
- Until that host/runtime constraint is resolved, TypeScript tree-sitter work
  should be treated as experimental and should not be assumed to move in lock
  step with Rust and Go backend adoption.

Requirements:

- grammar loading abstraction
- parse error collection
- stable node wrapper API
- support for JSON comments
- strict behavior for trailing commas unless explicitly normalized before parse

## MVP Deliverables

### 1. `tree-haver`

- grammar registry/loading abstraction
- parser acquisition
- parse result wrapper
- diagnostics for parse errors

### 2. `ast-merge`

- generic merge result model
- diagnostics model
- freeze-region model
- node matching/refinement interfaces

### 3. `text-merge`

- normalized text segmentation
- paragraph/block matching
- configurable similarity threshold
- symmetric similarity scoring API

### 4. `json-merge`

- JSON and JSONC comments support
- strict parse behavior
- optional targeted recovery hooks outside the core parser contract

### 5. Fixture Runner

- reads shared workspace fixtures
- emits pass/fail plus diagnostic diffs

## Non-Goals For V1

- full fidelity port of every Ruby implementation detail
- Ruby-specific naming or gem packaging assumptions
- direct package templating parity with `kettle-jem`

## Open Questions

1. Publish under one npm scope or multiple scopes?
2. How much of the Ruby comment capability model should be ported in v1?
3. Should text merge expose a matcher-only API before a full merge API?

## Decisions

- Use one monorepo workspace with multiple publishable packages.
- Prefer the `@structuredmerge` npm scope.

## First Implementation Sequence

1. define TypeScript node/diagnostic interfaces
2. implement `tree-haver`
3. implement shared fixture runner
4. implement `text-merge`
5. implement `json-merge`
