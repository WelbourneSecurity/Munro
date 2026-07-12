import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    coverage: {
      exclude: [
        'src/**/index.ts',
        'src/data/**',
        'src/main.tsx',
        'src/map/**',
        'src/test/**',
        'src/vite-env.d.ts',
      ],
      include: ['src/**'],
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          environment: 'node',
          include: [
            'src/domain/**/*.test.ts',
            'src/data/**/*.test.ts',
            'src/export/**/*.test.ts',
            'src/store/**/*.test.ts',
          ],
          name: 'domain',
        },
      },
      {
        extends: true,
        test: {
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          name: 'components',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
