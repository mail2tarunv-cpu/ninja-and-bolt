import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const assetPath = (name) => resolve(process.cwd(), 'public', 'art', name)
const assetFiles = [
  'sky.webp', 'ruins.webp', 'foliage.webp',
  'stone-tiles.webp', 'mechanisms.webp',
  'robot-atlas.png', 'ninja-atlas.png',
]

test('storybook level art assets exist and are not empty', () => {
  for (const name of assetFiles) {
    assert.ok(statSync(assetPath(name)).size > 8000, `${name} is missing or truncated`)
  }
})

test('character sprite atlases use the existing 17 x 180 by 220 frame layout', () => {
  for (const name of ['robot-atlas.png', 'ninja-atlas.png']) {
    const png = readFileSync(assetPath(name))
    assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG')
    assert.equal(png.readUInt32BE(16), 3060, `${name} width`)
    assert.equal(png.readUInt32BE(20), 220, `${name} height`)
  }
})

test('all required generated level art paths are referenced by the rendering code', () => {
  const artSource = readFileSync(resolve('src/art.ts'), 'utf8')
  for (const name of assetFiles.slice(0, 5)) assert.ok(artSource.includes(`/art/${name}`))
  const gameSource = readFileSync(resolve('src/App.tsx'), 'utf8')
  for (const name of assetFiles.slice(-2)) assert.ok(gameSource.includes(`/art/${name}`))
})
