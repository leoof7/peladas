import { useEffect, useRef } from 'react'
import { faixaDaEstrela, notaEmNumero, POSICOES } from '../../dados/estrelas.js'
import Nota from '../../componentes/Nota.jsx'

const EDICOES = { sem: 'SEM NOTA', bronze: 'BRONZE', prata: 'PRATA', ouro: 'OURO', craque: 'CRAQUE DA PELADA' }

export function CartaJogador({ jogador, dados, aoAbrir, completa = false }) {
  const faixa = faixaDaEstrela(jogador.estrelas)
  const posicao = POSICOES.find((item) => item.chave === jogador.posicao)
  const conteudo = <>
    <span className="carta__edicao">{EDICOES[faixa]}</span>
    <span className="carta__valor"><b>{jogador.estrelas ? notaEmNumero(jogador.estrelas) : '–'}</b><span>{posicao?.curto || 'JOG'}</span><small>★</small></span>
    <span className="carta__retrato">
      {jogador.foto ? <img src={jogador.foto} alt="" /> : <span className="carta__iniciais">{(jogador.nome || '').split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('')}</span>}
    </span>
    <span className="carta__identidade"><strong>{jogador.apelido || jogador.nome}</strong>{jogador.apelido && <small>{jogador.nome}</small>}</span>
    <Nota valor={jogador.estrelas} somenteLeitura rotulo={`Estrelas de ${jogador.nome}`} tamanho="pequeno" />
    <span className="carta__numeros">
      {[['gols', 'Gols'], ['assistencias', 'Assist.'], ['jogos', 'Jogos'], ...(completa ? [['vitorias', 'Vitórias'], ['empates', 'Empates'], ['derrotas', 'Derrotas']] : [])].map(([chave, nome]) => <span key={chave}><b>{dados?.[chave] ?? 0}</b><small>{nome}</small></span>)}
    </span>
    <span className="carta__rodape">{completa ? 'ESTATÍSTICAS DO ANO' : 'VER CARTINHA'} <span aria-hidden="true">✦</span></span>
  </>
  const classe = `carta card--${faixa}${completa ? ' carta--grande' : ''}`
  return aoAbrir ? <button type="button" className={classe} onClick={aoAbrir} aria-label={`Abrir carta de ${jogador.nome}`}>{conteudo}</button> : <div className={classe}>{conteudo}</div>
}

export default function Cartinha({ jogador, dados, ano, aoFechar, aoEditar, aoMudarNota, quemAlterou }) {
  const dialogo = useRef(null)
  useEffect(() => { dialogo.current.showModal() }, [])
  return <dialog ref={dialogo} className="cartinha-dialogo" onCancel={aoFechar} onClick={(evento) => { if (evento.target === evento.currentTarget) aoFechar() }}>
    <div className="cartinha-dialogo__topo"><span>Temporada {ano}</span><button type="button" className="botao botao--pequeno" autoFocus onClick={aoFechar}>Fechar</button></div>
    <CartaJogador jogador={jogador} dados={dados} completa />
    {aoMudarNota && <div className="carta-controle"><span>Ajustar estrelas</span><Nota valor={jogador.estrelas} aoMudar={aoMudarNota} rotulo={`Alterar estrelas de ${jogador.nome}`} /><span className="mexeu">{quemAlterou}</span></div>}
    {!dados && <p className="ajuda">Ainda sem estatísticas registradas neste ano.</p>}
    {aoEditar && <button type="button" className="botao" onClick={aoEditar}>Editar jogador e foto</button>}
  </dialog>
}
