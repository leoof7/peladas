// Prévia local com dados fictícios e sem conexão ao Firebase.
import { createServer } from 'vite'
import { hoje } from '../src/util/formato.js'

process.env.VITE_FIREBASE_API_KEY = ''
process.env.VITE_FIREBASE_PROJECT_ID = ''

const base = 'peladas/demonstracao'
const elenco = [
  ['ana', 'Ana Costa', 'Aninha', 'ataque', 5],
  ['bia', 'Beatriz Lima', 'Bia', 'defesa', 3],
  ['caio', 'Caio Mendes', '', 'goleiro', 4],
  ['dani', 'Daniel Rocha', 'Dani', 'meio', 4],
  ['eli', 'Elisa Alves', '', 'defesa', 3.5],
  ['felipe', 'Felipe Santos', 'Fê', 'goleiro', 4.5],
]
const dados = {
  [base]: { nome: 'Pelada demonstração', local: 'Quadra', cobranca: 'rateio', tipo: 'quadra-rateio',
    config: { naLinhaPorTime: 5, limiteVagas: 20, valorAluguel: 120 } },
  [base + '/membros/previa-diretoria']: { papel: 'diretoria', jogadorId: 'ana' },
  [base + '/membros/previa-jogador']: { papel: 'participante', jogadorId: 'bia' },
  [base + '/jogos/hoje']: { data: hoje(), status: 'aberto', custo: 120, lista: elenco.map(([id]) => id),
    chegaram: elenco.slice(0, 4).map(([id]) => id), pagamentos: {}, gols: {}, assistencias: {}, times: [] },
  ...Object.fromEntries(elenco.map(([id, nome, apelido, posicao, estrelas]) => [
    base + '/jogadores/' + id, { nome, apelido, posicao, estrelas, ativo: true },
  ])),
}

const server = await createServer({
  server: { host: '127.0.0.1', port: 5187, strictPort: true },
  plugins: [{
    name: 'previa-redesign',
    configureServer(vite) {
      vite.middlewares.use('/__previa', (req, res) => {
        const perfil = new URL(req.url, 'http://127.0.0.1').searchParams.get('perfil')
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        if (!['diretoria', 'jogador'].includes(perfil)) {
          res.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Peladas · Prévia do redesenho</title><style>body{font:16px system-ui;background:#eef0f4;color:#11141a;margin:20px}main{max-width:480px;margin:10vh auto;background:#fff;border:1px solid #dce3ef;border-radius:18px;padding:24px}a{display:block;padding:14px 20px;margin-top:10px;border-radius:999px;background:#1b4fd0;color:white;text-decoration:none;font-weight:700}a+a{background:#e8efff;color:#153eaa}</style>
          <main><p>LESETE · PRÉVIA LOCAL</p><h1>Experimente o Peladas</h1><p>Escolha um perfil. Todos os dados são de demonstração; cada entrada reinicia a prévia.</p>
          <a href="/__previa?perfil=diretoria">Abrir como diretoria</a><a href="/__previa?perfil=jogador">Abrir como jogador</a></main></html>`)
          return
        }
        res.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><script>
          localStorage.setItem('peladas:usuario', ${JSON.stringify('previa-' + perfil)});
          localStorage.setItem('peladas:dados', ${JSON.stringify(JSON.stringify(dados))});
          location.replace('/#/p/demonstracao');
        </script></html>`)
      })
    },
  }],
})
await server.listen()
console.log('Prévia local: http://127.0.0.1:5187/__previa')
