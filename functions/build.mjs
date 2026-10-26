// Bundle src/ (and the shared @afriff/core code it uses) into lib/index.js.
// npm packages stay outside the bundle: the cloud installs them from package.json.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
})
