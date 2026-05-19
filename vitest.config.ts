import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@structuredmerge/ast-merge': fileURLToPath(
        new URL('./packages/ast-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/ast-merge-git': fileURLToPath(
        new URL('./packages/ast-merge-git/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/tree-haver': fileURLToPath(
        new URL('./packages/tree-haver/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/plain-merge': fileURLToPath(
        new URL('./packages/plain-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/json-merge': fileURLToPath(
        new URL('./packages/json-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/go-merge': fileURLToPath(
        new URL('./packages/go-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/toml-merge': fileURLToPath(
        new URL('./packages/toml-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/peggy-toml-merge': fileURLToPath(
        new URL('./packages/peggy-toml-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/typescript-merge': fileURLToPath(
        new URL('./packages/typescript-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/typescript-compiler-merge': fileURLToPath(
        new URL('./packages/typescript-compiler-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/yaml-merge': fileURLToPath(
        new URL('./packages/yaml-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/js-yaml-merge': fileURLToPath(
        new URL('./packages/js-yaml-merge/src/index.ts', import.meta.url)
      )
    }
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
    root
  }
});
