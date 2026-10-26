/**
 * Zero dependency test harness runner.
 *
 * `tsc -p tsconfig.test.json` emits CommonJS into `.test-build`, but the folder
 * sits inside a `"type": "module"` package, so Node would treat the emitted
 * `.js` files as ES modules and every `require` would fail. Writing a one line
 * package.json into the build folder marks it as CommonJS scope.
 *
 * The suites are passed to `node --test` as a glob over `.test-build/test`, so
 * every `*.test.js` that was compiled runs. Pointing `node --test` at the
 * folder instead only loads one entry file, and any suite missing from that
 * entry is skipped without a word, which is a silent false green.
 *
 * The marker is written on every run so the folder never needs to be tracked in
 * git. No dependencies, no network.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'

const buildDirectory = '.test-build'
const testDirectory = `${buildDirectory}/test`
const sourceDirectory = 'test'
const marker = { type: 'commonjs' }

mkdirSync(buildDirectory, { recursive: true })
writeFileSync(`${buildDirectory}/package.json`, `${JSON.stringify(marker, null, 2)}\n`)

const compiled = readdirSync(testDirectory).filter((name) => name.endsWith('.test.js'))
if (compiled.length === 0) {
  console.error(`No compiled test files in ${testDirectory}. Did tsc run?`)
  process.exit(1)
}

// tsc never deletes the output of a source that was renamed or removed, so a
// stale file would keep running as a ghost suite. Fail loudly instead.
const orphaned = compiled.filter(
  (name) => !existsSync(`${sourceDirectory}/${name.slice(0, -'.js'.length)}.ts`),
)
if (orphaned.length > 0) {
  console.error(`Stale compiled tests with no source: ${orphaned.join(', ')}`)
  console.error(`Delete ${buildDirectory} and run again.`)
  process.exit(1)
}

const result = spawnSync(process.execPath, ['--test', `${testDirectory}/*.test.js`], {
  stdio: 'inherit',
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
