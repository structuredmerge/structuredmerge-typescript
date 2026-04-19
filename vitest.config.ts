import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@structuredmerge/ast-merge': fileURLToPath(
        new URL('./packages/ast-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/tree-haver': fileURLToPath(
        new URL('./packages/tree-haver/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/text-merge': fileURLToPath(
        new URL('./packages/text-merge/src/index.ts', import.meta.url)
      ),
      '@structuredmerge/json-merge': fileURLToPath(
        new URL('./packages/json-merge/src/index.ts', import.meta.url)
      )
    }
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
    root
  }
});
