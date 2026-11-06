import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Modes:
//   (default)  the playground app, `npm run dev` / `npm run build`
//   single     the playground as one self-contained HTML file in dist-single/
//   lib        the embeddable library in dist-lib/: inkling.js (ES module)
//              and inkling.iife.js (classic <script>, global `Inkling`)
export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    return {
      build: {
        outDir: 'dist-lib',
        emptyOutDir: false,
        sourcemap: true,
        minify: true,
        lib: {
          entry: 'src/lib.ts',
          name: 'Inkling',
          formats: ['es', 'iife'],
          fileName: (format) => (format === 'es' ? 'inkling.js' : 'inkling.iife.js'),
        },
        rollupOptions: { output: { inlineDynamicImports: true } },
      },
    }
  }
  return {
    plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
    build: mode === 'single' ? { outDir: 'dist-single' } : undefined,
  }
})
