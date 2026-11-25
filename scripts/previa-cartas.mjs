import { createServer } from 'vite'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { readFileSync, writeFileSync } from 'node:fs'

const servidor = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { CartaJogador } = await servidor.ssrLoadModule('/src/telas/jogadores/Cartinha.jsx')
  const css = readFileSync('src/estilo.css', 'utf8')
  const estrelas = css.slice(css.indexOf('.nota {'), css.indexOf('/* ----', css.indexOf('.nota {')))
  const faixas = css.slice(css.indexOf('.card--bronze {'), css.indexOf('.card--saiu {'))
  const cartas = css.slice(css.indexOf('/* Cartas da pelada:'))
  const exemplos = [2, 3.5, 4.5, 5].map((nota) => renderToStaticMarkup(createElement(CartaJogador, {
    jogador: { nome: 'Seu nome', posicao: 'ataque', estrelas: nota }, completa: true,
  }))).join('')
  const destino = 'C:/Users/SETTE/.codex/visualizations/2026/10/22/01a164b0-238e-7dd2-8fda-48c36d9e9629/cartas-pelada.html'
  writeFileSync(destino, `<div id="previa-cartas-pelada" class="viz-dotted-background"><div class="pelada-previa"><div class="pelada-legenda">PRÉVIA DO DESENHO · Sem foto · Estrelas de exemplo · Números zerados para demonstração</div><div class="pelada-cartas">${exemplos}</div></div></div>
<style>
@scope (#previa-cartas-pelada) {
${estrelas}
${faixas}
${cartas}
}
#previa-cartas-pelada .pelada-previa { --titulo: 'Arial Narrow',Arial,sans-serif; --ouro:#e0a000; --vazia:#c2bcae; --suave:#655d4b; padding:24px 12px; font-family:Arial,sans-serif; }
#previa-cartas-pelada .pelada-legenda { color:light-dark(#454545,#c4c9d3); font-size:12px; margin-bottom:20px; padding-right:70px; line-height:1.6; }
#previa-cartas-pelada .pelada-cartas { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px 16px; max-width:690px; margin:auto; }
#previa-cartas-pelada .carta { box-sizing:border-box; }
#previa-cartas-pelada .carta__retrato { height:170px; }
#previa-cartas-pelada .carta__rodape { font-size:9px; }
#previa-cartas-pelada .carta__numeros small { font-size:11px; }
#previa-cartas-pelada .carta__identidade strong { font-size:22px; }
@media(max-width:440px) { #previa-cartas-pelada .pelada-cartas {grid-template-columns:minmax(0,300px);justify-content:center;} }
</style>`)
  console.log(destino)
} finally { await servidor.close() }
