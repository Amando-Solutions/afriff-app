// Pretend afriff.com pages and data files for the tests, built the way
// afriff.com's real files are (a Vite code file with imported helpers), but
// with made-up films.

import { FILMS_PAGE, SCHEDULE_PAGE, SITE } from '../src/config'
import type { AfriffFilm } from '../src/afriff/films'
import type { Fetcher } from '../src/afriff/site'

/** 24 made-up films (the sync refuses lists under 20) */
export function sampleFilms(): AfriffFilm[] {
  const films: AfriffFilm[] = [
    {
      slug: 'lady', title: 'LADY', countries: ['United Kingdom', 'Nigeria'], programme: 'OPEN', runtime: 93, year: 2026,
      directors: ['Olive Nwosu'], cast: ['Ada One', 'Bola Two'], languages: ['English', 'Other'], genres: ['Drama'],
      synopsis: 'A Lagos cab driver.', poster: '/__l5e/assets-v1/aaa/lady.jpg', trailer: 'https://www.youtube.com/watch?v=abc',
    },
    { slug: 'two-love', title: 'Two Love', countries: ['France'], programme: 'SHORTS', runtime: 12, directors: ['VINCHO NCHOGU'], synopsis: 'Wrong synopsis from another film.' },
    { slug: 'drive-film', title: 'Drive Film', countries: ['Not Specified'], programme: 'FEAT', directors: ['A, B'], trailer: 'https://drive.google.com/file/d/x/view', poster: '/__l5e/assets-v1/bbb/drive.jpg' },
    { slug: 'dup', title: 'Dup', programme: 'OOC', directors: ['X'], poster: '/__l5e/assets-v1/ccc/dup.jpg' },
  ]
  for (let i = films.length; i < 24; i++) films.push({ slug: `film-${i}`, title: `Film ${i}`, programme: 'FEAT', directors: [`Director ${i}`], synopsis: `Synopsis ${i}.`, runtime: 90 })
  return films
}

/** A data file shaped like afriff.com's: imports a helper, builds the list, exports with short names */
export function dataFile(films: AfriffFilm[]): string {
  const raw = films.map(({ poster, ...f }) => ({ ...f, p: poster }))
  return [
    'import{n as e}from"./createLucideIcon-AbCdEf12.js";',
    'var S=new Proxy({OPEN:{name:`Opening Movie`,tagline:``},FEAT:{name:`Features`,tagline:``},SHORTS:{name:`Shorts`,tagline:``},OOC:{name:`Out of Competition`,tagline:``}},{get:(e,t)=>e[t]??{name:t,tagline:``}}),',
    'D=[`OPEN`,`FEAT`,`SHORTS`,`OOC`],',
    `A=${JSON.stringify(raw)}.map(({p,...f})=>({...f,...p?{poster:e(p)}:{}}));`,
    'export{D as n,S as r,A as t};',
  ].join('')
}

export const programPage = (file: string) =>
  `<!DOCTYPE html><html><head><link rel="modulepreload" href="/assets/index-Zz9Yy8Xx.js"/><link rel="modulepreload" href="/assets/${file}"/></head><body><h1>Official Selection</h1><script>self.$_TSR={u:${Date.now()}}</script></body></html>`

export const schedulePage = (body = 'Schedule 1–7 November 2026, Lagos. Screening times are added when the programme is out. SUN 01 Opening Night') =>
  `<!DOCTYPE html><html><body><main>${body}</main><script>self.$_TSR={u:${Date.now()}}</script></body></html>`

/** A pretend afriff.com: serves the pages and one data file; counts downloads */
export function fakeSite(films: AfriffFilm[], file = 'film-selection-test-C2TypRWh.js', schedule = schedulePage()) {
  const pages = new Map<string, string>([
    [FILMS_PAGE, programPage(file)],
    [SCHEDULE_PAGE, schedule],
    [`${SITE}/assets/${file}`, dataFile(films)],
  ])
  const hits: string[] = []
  const fetcher: Fetcher = async (url) => {
    hits.push(url)
    const text = pages.get(url)
    if (text == null) throw new Error(`${url} answered 404`)
    return text
  }
  return { fetcher, hits, pages }
}
