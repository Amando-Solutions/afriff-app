// Bundle src/ (and the shared @afriff/core code it uses) into lib/index.js.
// npm packages stay outside the bundle: the cloud installs them from package.json.
// @afriff/core isn't an npm package the cloud could install (it's packages/core
// in this project, reached through apps/admin/shared), so it's bundled in.
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const core = fileURLToPath(new URL('../packages/core/src/', import.meta.url))
const sharedCode = {
  name: 'afriff-core',
  setup(b) {
    // same mapping as packages/core/package.json "exports": "./*": "./src/*.ts"
    b.onResolve({ filter: /^@afriff\/core\// }, (a) => ({ path: `${core}${a.path.slice('@afriff/core/'.length)}.ts` }))
  },
}

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
  plugins: [sharedCode],
  sourcemap: true,
  logLevel: 'info',
})
