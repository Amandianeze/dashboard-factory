/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // Plotly is lazy-loaded into its own chunk; warn if the main bundle grows past budget.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
