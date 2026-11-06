import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Modes:
//   (default)        the playground app, `npm run dev` / `npm run build`
//   single           the playground as one self-contained HTML file in dist-single/
//   lib              the embeddable library in dist-lib/: inkling.js (ES module)
//                    and inkling.iife.js (classic <script>, global `Inkling`)
//   lib-node         dist-lib/inkling-node.js: renderToSVG for Node (linkedom bundled)
//   lib-react        dist-lib/inkling-react.js: React component and hook (react external)
//   lib-remark       dist-lib/inkling-remark.js: remark plugin (uses ./inkling-node.js)
//   lib-markdown-it  dist-lib/inkling-markdown-it.js: markdown-it plugin (uses ./inkling-node.js)
// `npm run build:lib` builds all of them.

/** The extra library builds: entry, output file, and what is left outside the bundle. */
const EXTRA: Record<string, { entry: string; file: string; types: string; hasDefault?: boolean; node?: boolean; react?: boolean; useNode?: boolean }> = {
  'lib-node': { entry: 'src/node/index.ts', file: 'inkling-node.js', types: 'node/index', node: true },
  'lib-react': { entry: 'src/react/index.tsx', file: 'inkling-react.js', types: 'react/index', react: true },
  'lib-remark': { entry: 'src/markdown/remark.ts', file: 'inkling-remark.js', types: 'markdown/remark', hasDefault: true, node: true, useNode: true },
  'lib-markdown-it': { entry: 'src/markdown/markdown-it.ts', file: 'inkling-markdown-it.js', types: 'markdown/markdown-it', hasDefault: true, node: true, useNode: true },
}

/** A one-line declaration next to each file (inkling-react.d.ts), so a relative import is typed. */
function typesShim(file: string, types: string, hasDefault?: boolean): Plugin {
  return {
    name: 'inkling-types-shim',
    generateBundle() {
      const from = `./types/${types}`
      this.emitFile({
        type: 'asset',
        fileName: file.replace(/\.js$/, '.d.ts'),
        source: `export * from '${from}';\n${hasDefault ? `export { default } from '${from}';\n` : ''}`,
      })
    },
  }
}

/** Imports of src/node/index.ts become imports of the built ./inkling-node.js next to the output. */
function useBuiltNode(): Plugin {
  const target = resolve(__dirname, 'src/node/index.ts')
  return {
    name: 'inkling-use-built-node',
    enforce: 'pre',
    async resolveId(source, importer, opts) {
      if (!importer || !source.startsWith('.')) return null
      const r = await this.resolve(source, importer, { ...opts, skipSelf: true })
      if (r && r.id === target) return { id: './inkling-node.js', external: true }
      return null
    },
  }
}

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
  const extra = EXTRA[mode]
  if (extra) {
    const plugins: Plugin[] = [typesShim(extra.file, extra.types, extra.hasDefault)]
    if (extra.useNode) plugins.push(useBuiltNode())
    if (extra.react) plugins.push(...(react() as Plugin[]))
    return {
      plugins,
      // Node builds must not pick browser variants of their dependencies.
      resolve: extra.node ? { conditions: ['node', 'import', 'module', 'default'], mainFields: ['module', 'main'] } : undefined,
      build: {
        outDir: 'dist-lib',
        emptyOutDir: false,
        // Node files skip source maps: linkedom makes them large.
        sourcemap: !extra.node,
        target: extra.node ? 'node18' : 'es2020',
        minify: !extra.node,
        lib: { entry: extra.entry, formats: ['es'], fileName: () => extra.file },
        rollupOptions: {
          external: extra.react
            ? (id: string) => id === 'react' || id === 'react-dom' || id.startsWith('react/') || id.startsWith('react-dom/')
            : (id: string) => id.startsWith('node:'),
          // The bundler keeps src/react's 'use client' directive at the top, for Next.js.
          output: { inlineDynamicImports: true },
        },
      },
    }
  }
  return {
    // Relative paths, so the built app works from any folder (GitHub Pages serves it under /<repo>/).
    base: './',
    plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
    build: mode === 'single' ? { outDir: 'dist-single' } : undefined,
  }
})
