import assert from 'node:assert/strict'
import { test } from 'node:test'
import { importedNames, moduleExports } from '../src/afriff/sandbox'
import { dataFile, sampleFilms } from './fixtures'

test('reads a data file like afriff.com’s, with imported helpers stood in', async () => {
  const x = await moduleExports(dataFile(sampleFilms()))
  assert.deepEqual(x.n, ['OPEN', 'FEAT', 'SHORTS', 'OOC'])
  const films = x.t as { slug: string; poster?: string }[]
  assert.equal(films.length, 24)
  // the helper stand-in hands the poster path straight back
  assert.equal(films[0]!.poster, '/__l5e/assets-v1/aaa/lady.jpg')
  assert.equal((x.r as Record<string, { name: string }>).OPEN!.name, 'Opening Movie')
})

test('the file can’t reach anything outside the sandbox', async () => {
  const x = await moduleExports(
    'export const seen = [typeof process, typeof require, typeof fetch, typeof XMLHttpRequest, typeof globalThis.os, typeof globalThis.std].join(",");',
  )
  assert.equal(x.seen, 'undefined,undefined,undefined,undefined,undefined,undefined')
})

test('a file that never finishes is stopped', async () => {
  const started = Date.now()
  await assert.rejects(moduleExports('while (true) {}', { timeLimitMs: 300 }), /Couldn't read afriff.com's data file/)
  assert.ok(Date.now() - started < 3000)
})

test('a file that eats memory is stopped', async () => {
  await assert.rejects(moduleExports('const a = []; while (true) a.push("x".repeat(1e6));'), /Couldn't read afriff.com's data file/)
})

test('a broken file gives a clear error', async () => {
  await assert.rejects(moduleExports('export const x = ;'), /Couldn't read afriff.com's data file/)
})

test('finds the names each import must provide', () => {
  const m = importedNames('import{n as e,r as t}from"./a-123.js";import d,{x}from"./b.js";import"./c.js";')
  assert.deepEqual(m.get('./a-123.js'), ['n', 'r'])
  assert.deepEqual(m.get('./b.js'), ['x'])
  assert.deepEqual(m.get('./c.js'), [])
})
