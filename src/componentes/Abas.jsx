import { irPara } from '../util/rotas.js'

const ICONES = {
  inicio: (
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  ),
  jogos: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  jogadores: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3-7 7-7s7 3 7 7M16 4.5a4 4 0 0 1 0 7M22 21c0-3-1.8-5.5-4.5-6.5" />
    </>
  ),
  ranking: <path d="M6 20v-8M12 20V4M18 20v-5" />,
  financeiro: (
    <>
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="17" cy="15" r="1.5" />
    </>
  ),
}

export default function Abas({ peladaId, atual, ehMensal }) {
  const abas = [
    { chave: 'inicio', nome: 'Início', caminho: `/p/${peladaId}` },
    { chave: 'jogos', nome: ehMensal ? 'Domingos' : 'Peladas', caminho: `/p/${peladaId}/jogos` },
    { chave: 'jogadores', nome: 'Jogadores', caminho: `/p/${peladaId}/jogadores` },
    { chave: 'ranking', nome: 'Ranking', caminho: `/p/${peladaId}/ranking` },
    { chave: 'financeiro', nome: 'Financeiro', caminho: `/p/${peladaId}/financeiro` },
  ]

  return (
    <nav className="abas" aria-label="Seções da pelada">
      {abas.map((aba) => (
        <button
          key={aba.chave}
          type="button"
          className={aba.chave === atual ? 'aba aba--atual' : 'aba'}
          aria-current={aba.chave === atual ? 'page' : undefined}
          onClick={() => irPara(aba.caminho)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {ICONES[aba.chave]}
          </svg>
          {aba.nome}
        </button>
      ))}
    </nav>
  )
}
