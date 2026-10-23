import { readdir, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { join } from 'node:path'

const files = async (dir) =>
  (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map(async (entry) =>
        entry.isDirectory() ? files(join(dir, entry.name)) : join(dir, entry.name),
      ),
    )
  ).flat()
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
const sensitiveName = (file) => /(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.env.example')
assert.deepEqual(tracked.filter(sensitiveName), [], 'Local environment files must not be tracked')
for (const file of tracked.filter((name) =>
  /\.(?:tsx?|m?js|json|ya?ml|properties|example)$/.test(name),
)) {
  const text = await readFile(file, 'utf8')
  assert.ok(!/sk-(?:proj-)?[A-Za-z0-9_-]{24,}/.test(text), `Possible tracked credential in ${file}`)
}
const output = await files('dist')
for (const file of output) {
  assert.ok(
    !sensitiveName(file) && !/\.(?:map|pem|key|p12)$/.test(file),
    `Unexpected deployment file: ${file}`,
  )
  assert.ok(
    !/^dist\/(?:backend|src|docs|server)\//.test(file),
    `Private source in deployment: ${file}`,
  )
  if (/\.(?:js|html|json|css|txt|md)$/.test(file)) {
    const text = await readFile(file, 'utf8')
    assert.ok(!/sk-(?:proj-)?[A-Za-z0-9_-]{24,}/.test(text), `Possible credential in ${file}`)
    assert.ok(!text.includes('OPENAI_API_KEY='), `Server configuration in ${file}`)
  }
}
for (const file of await files('public')) {
  assert.deepEqual(
    await readFile(file.replace(/^public\//, 'dist/')),
    await readFile(file),
    `Missing or altered public asset: ${file}`,
  )
}
console.log(
  `PASS static deployment audit: ${output.length} files, public assets intact, no tracked local env, source maps or detected credentials`,
)
