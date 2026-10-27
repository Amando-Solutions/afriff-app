// Read the data out of one of afriff.com's JavaScript files, safely.
//
// afriff.com keeps its film list in a JavaScript file (not a JSON feed), so to
// read it, the file has to be run. It runs inside QuickJS, a small JavaScript
// engine compiled to WebAssembly: it has no network, no files, no access to our
// database credentials or to anything else in the function. It gets a memory cap
// and a time limit, and all that comes back is plain JSON text.
//
// The file imports helpers from afriff.com's other files. Those are replaced by
// stand-ins that hand their first argument straight back, which is what the
// helpers the data needs do (e.g. the one that turns a poster path into a link;
// we make the links absolute ourselves afterwards).

import { newQuickJSWASMModuleFromVariant, shouldInterruptAfterDeadline, type QuickJSWASMModule } from 'quickjs-emscripten-core'
import RELEASE_SYNC from '@jitl/quickjs-wasmfile-release-sync'

const MEMORY_LIMIT = 64 * 1024 * 1024
const STACK_LIMIT = 1024 * 1024
const TIME_LIMIT_MS = 5000
const MAX_RESULT_CHARS = 4 * 1024 * 1024

let engine: Promise<QuickJSWASMModule> | null = null
const getEngine = () => (engine ??= newQuickJSWASMModuleFromVariant(RELEASE_SYNC))

/** Names each imported file must provide, read from the file's import lines */
export function importedNames(source: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const add = (from: string, names: string[]) => out.set(from, [...new Set([...(out.get(from) ?? []), ...names])])
  // import{a as b,c}from"./x.js"   (also: import d,{e}from"./y.js")
  for (const m of source.matchAll(/import\s*(?:([\w$]+)\s*,\s*)?\{([^}]*)\}\s*from\s*["'`]([^"'`]+)["'`]/g)) {
    const names = m[2]!.split(',').map((s) => s.trim().split(/\s+as\s+/)[0]!.trim()).filter(Boolean)
    add(m[3]!, names)
  }
  // import x from"./y.js" / import*as x from"./y.js" / import"./y.js"
  for (const m of source.matchAll(/import\s*(?:[\w$]+|\*\s*as\s*[\w$]+)?\s*(?:from\s*)?["'`]([^"'`]+)["'`]/g)) add(m[1]!, [])
  return out
}

const baseName = (path: string) => path.replace(/^.*\//, '')

// A stand-in for anything imported: calling it returns its first argument;
// reading a property or constructing it gives the stand-in again.
const standIn = (names: string[]) => `
const S = new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => '' : S),
  apply: (t, self, args) => (args.length ? args[0] : S),
  construct: () => S,
});
${names.filter((n) => /^[\w$]+$/.test(n) && n !== 'default').map((n) => `export const ${n} = S;`).join('\n')}
export default S;`

/**
 * Run an ES module's source in the sandbox and return its exports as plain
 * data (functions dropped). Throws if it errors, runs too long or uses too much memory.
 */
export async function moduleExports(source: string, { timeLimitMs = TIME_LIMIT_MS } = {}): Promise<Record<string, unknown>> {
  const imports = importedNames(source)
  const byBase = new Map([...imports].map(([from, names]) => [baseName(from), names]))
  const QuickJS = await getEngine()
  const runtime = QuickJS.newRuntime()
  try {
    runtime.setMemoryLimit(MEMORY_LIMIT)
    runtime.setMaxStackSize(STACK_LIMIT)
    runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeLimitMs))
    runtime.setModuleLoader((name) => standIn(imports.get(name) ?? byBase.get(baseName(name)) ?? []))
    const vm = runtime.newContext()
    try {
      const exportsHandle = vm.unwrapResult(vm.evalCode(source, 'afriff-data.js', { type: 'module' }))
      vm.setProp(vm.global, '__exports', exportsHandle)
      exportsHandle.dispose()
      const json = vm.unwrapResult(
        vm.evalCode(`JSON.stringify(globalThis.__exports, (k, v) => (typeof v === 'function' ? undefined : v))`),
      )
      const text = vm.getString(json)
      json.dispose()
      if (text.length > MAX_RESULT_CHARS) throw new Error(`afriff.com's data file is unexpectedly large (${Math.round(text.length / 1024)} KB)`)
      return JSON.parse(text) as Record<string, unknown>
    } finally {
      vm.dispose()
    }
  } catch (e) {
    // QuickJS errors arrive as plain objects ({ name, message })
    const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
    throw new Error(`Couldn't read afriff.com's data file: ${msg}`)
  } finally {
    runtime.dispose()
  }
}
