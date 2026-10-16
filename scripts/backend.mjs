import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
const backend = fileURLToPath(new URL('../backend/', import.meta.url))
const child = spawn(
  process.platform === 'win32' ? 'mvnw.cmd' : './mvnw',
  ['-B', '-ntp', `-Dmaven.repo.local=${join(backend, '.m2/repository')}`, ...process.argv.slice(2)],
  {
    cwd: backend,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, MAVEN_USER_HOME: join(backend, '.m2') },
  },
)
child.on('error', () => {
  console.error('JDK 21과 backend/mvnw 실행 권한을 확인하세요.')
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
