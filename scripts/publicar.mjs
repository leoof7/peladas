// Gera o site e publica no ramo "gh-pages", que é o que o GitHub Pages mostra.
// Uso: npm run publicar
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const raiz = process.cwd()
const pastaDeEnvio = join(raiz, '.deploy')
const ehWindows = process.platform === 'win32'

function rodar(programa, argumentos, onde = raiz) {
  // No Windows o npm só roda através do shell. O git não pode usar shell, senão
  // o texto do commit se quebra nos espaços.
  const precisaDeShell = ehWindows && programa === 'npm'
  execFileSync(programa, argumentos, { cwd: onde, stdio: 'inherit', shell: precisaDeShell })
}

function saida(argumentos) {
  return execFileSync('git', argumentos, { cwd: raiz, encoding: 'utf8' }).trim()
}

function existeRamo(ramo) {
  try {
    saida(['rev-parse', '--verify', ramo])
    return true
  } catch {
    return false
  }
}

console.log('Gerando o site…')
rodar('npm', ['run', 'build'])

if (existsSync(pastaDeEnvio)) rmSync(pastaDeEnvio, { recursive: true, force: true })
rodar('git', ['worktree', 'prune'])

const jaExiste = existeRamo('gh-pages') || existeRamo('origin/gh-pages')
if (jaExiste) {
  rodar('git', ['worktree', 'add', '.deploy', 'gh-pages'])
} else {
  rodar('git', ['worktree', 'add', '--detach', '.deploy'])
  rodar('git', ['checkout', '--orphan', 'gh-pages'], pastaDeEnvio)
  rodar('git', ['rm', '-rq', '--cached', '.'], pastaDeEnvio)
}

// Limpa o que estava lá e põe a versão nova.
for (const arquivo of readdirSync(pastaDeEnvio)) {
  if (arquivo !== '.git') rmSync(join(pastaDeEnvio, arquivo), { recursive: true, force: true })
}
cpSync(join(raiz, 'dist'), pastaDeEnvio, { recursive: true })
// Avisa o GitHub pra não mexer nos arquivos.
writeFileSync(join(pastaDeEnvio, '.nojekyll'), '')

rodar('git', ['add', '-A'], pastaDeEnvio)
const data = new Date().toLocaleString('pt-BR')
try {
  rodar('git', ['commit', '-q', '-m', `Publica o site em ${data}`], pastaDeEnvio)
} catch {
  console.log('Nada mudou desde a última publicação.')
}
rodar('git', ['push', '-u', 'origin', 'gh-pages'], pastaDeEnvio)

rmSync(pastaDeEnvio, { recursive: true, force: true })
rodar('git', ['worktree', 'prune'])
console.log('Publicado.')
