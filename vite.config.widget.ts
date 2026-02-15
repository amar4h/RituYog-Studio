import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite config for building the embeddable chat widget.
 * Produces a single self-executing IIFE file: dist/chat-widget.js
 *
 * Usage: npm run build:widget
 * Output goes into the main dist/ folder alongside the app build.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/chat-widget-embed.tsx',
      name: 'YogaChatWidget',
      formats: ['iife'],
      fileName: () => 'chat-widget.js',
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't wipe existing app build
    rollupOptions: {
      // Bundle everything — no externals
      external: [],
    },
    minify: 'esbuild',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
