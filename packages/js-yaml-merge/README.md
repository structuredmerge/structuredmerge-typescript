# 💎 @structuredmerge/js-yaml-merge

[![Source](https://img.shields.io/badge/source-github-238636.svg)](git+https://github.com/structuredmerge/structuredmerge-typescript.git) ![License](https://img.shields.io/badge/license-MIT-259D6C.svg)

## 🌻 Synopsis



## 💡 Info you can shake a stick at

Compatible with the configured npm runtime.

<details markdown="1">
<summary>StructuredMerge package family and backend compatibility</summary>

StructuredMerge packages provide fixture-backed merge behavior for document, configuration, source, archive, and binary formats. Shared contracts live in fixtures, while Go, Ruby, Rust, and TypeScript packages expose language-native APIs over the same behavior.

| Package | Layer | Families | Status | README role |
|---|---|---|---|---|
| ast-template | workflow | template, readme | active | applies shared templates, package README sections, and package-directory sync workflows |
| ast-merge | core | template, review, structured-edit | active | documents provider-neutral contracts, token resolution, review state, and execution reports |
| tree-haver | backend substrate | parser, backend | active | documents backend selection, language-pack integration, position data, and capability reporting |
| markdown-merge | family | markdown | active | documents Markdown heading, fenced-code, nested-family, and provider behavior |
| json-merge | family | json, jsonc | active | documents JSON and JSONC merge behavior; old jsonc-merge is superseded |
| toml-merge | family | toml | active | documents TOML table, value, parser, and backend behavior |
| yaml-merge | family | yaml | active | documents YAML mapping, sequence, scalar, and backend behavior |
| ruby-merge | family | ruby-source | active | documents Ruby source merge behavior; old prism-merge is backend/provider prior art |
| zip-merge | family | zip, archive | active | documents ZIP member planning and raw-preservation behavior |
| binary-merge | family | binary | active | documents binary preservation and diagnostics behavior |

| Backend | Languages | Families | Note |
|---|---|---|---|
| tree-sitter-language-pack | Go, Ruby, Rust, TypeScript | markdown, toml, yaml, source | Preferred cross-language parser substrate where a family has language-pack support. |
| native ecosystem parser | Ruby | ruby, yaml, markdown, toml | Backend-specific Ruby packages are provider prior art or adapters, not the source schema. |
| plain structured text | Go, Ruby, Rust, TypeScript | plain, binary, zip | Families without parser requirements document preservation, byte ranges, archive members, and diagnostics. |

</details>

## ✨ Installation

```console
npm add @structuredmerge/js-yaml-merge
```

## ⚙️ Configuration



## 🔧 Basic Usage



## 🦷 FLOSS Funding

This free software project accepts funding support when configured by the package maintainer.

## 🤝 Contributing

Contributions are welcome. Missing optional service integrations are reported by the generator instead of rendered as broken badges.

## 📌 Versioning

This project follows semantic versioning for its public API where practical.

## 📄 License

This project is made available under the terms of the MIT License.

## 🤑 A request for help

Please support the project by using it, reporting issues, and contributing improvements.
