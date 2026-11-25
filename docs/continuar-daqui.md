# Continuar daqui

Atualizado em 25/11/2026. Feito pra outra pessoa (ou outra IA) pegar o trabalho
sem ter o histórico da conversa. Leia junto com `docs/regras-do-negocio.md`.

## Onde o projeto está

React + Vite, sem TypeScript, banco no Firebase (projeto `futebois`, região
`southamerica-east1`), publicado em https://leoof7.github.io/peladas/ com
`npm run publicar`. Duas peladas de verdade: **Pelada da Madrugada** (campo,
mensal) e **Shekinah Futebol Clube** (quadra, rateio).

O dono é o **Leandro**, que não é programador. Ele decide o produto; quem
escreve o código decide o como e avisa, em português claro, quando o pedido tem
risco. As preferências dele ficam em `C:\Users\SETTE\.claude\CLAUDE.md`.

## Feito nesta rodada (25/11)

- **Sorteio sem goleiro**: `separarGoleiros`, `sortearDoisTimes` e
  `sortearTimes` em `src/dados/regras.js`, com 5 testes. O goleiro fica fora e
  a diretoria escolhe o time dele; só a linha é dividida, aproximando a soma
  das estrelas; "Tirar de novo" varia de verdade porque o sorteio aceita
  qualquer divisão com até meia estrela de diferença.
- **`src/telas/jogo/Times.jsx` refeita**: painel com a soma dos dois times e a
  diferença, faixa de goleiros, tabuleiro em duas colunas e troca de dois
  jogadores por toque.
- **`src/telas/jogo/Chegada.jsx` refeita**: medidor com vagas, duas colunas
  (quem joga x quem espera) e ações ao tocar em quem chegou.
- **`src/componentes/Podio.jsx`**: pódio dos três primeiros no ranking, com os
  degraus subindo (respeita `prefers-reduced-motion`).
- **Lista da Shekinah ajustada no banco** conforme a lista que o Leandro mandou
  do grupo: 40 jogadores ativos, 38 com nota.
- **Nomes limpos**: vários jogadores tinham um caractere invisível do WhatsApp
  colado no nome, o que criava gente duplicada. Foram limpos; quem saiu e
  colidia com um ativo ganhou " (saiu)" no nome.

## O que falta

## O que o Leandro pediu e ainda NÃO foi feito

### 1. Nota por diretor, com média (o mais importante, e já aprovado)

Hoje a nota é **uma só**: o último diretor que mexeu sobrescreve o anterior, e
fica registrado quem foi. O Leandro quer que **cada diretor guarde a nota
dele** e o app mostre a **média** das notas dos diretores.

Caminho sugerido:

- Nova subcoleção `peladas/{pelada}/jogadores/{jogador}/votos/{usuario}` com
  `{ nota, por, em }`. Um documento por diretor, por jogador.
- No documento do jogador continuam `estrelas` (agora a **média**),
  `estrelasPor` e `estrelasEm` — assim o ranking, os cards e o texto pro grupo
  seguem funcionando sem mudar nada.
- Quem vota grava o próprio voto e, em seguida, regrava a média no jogador.
  Com poucos diretores dá pra ler todos os votos e recalcular na hora.
- Regra nova em `firestore.rules`, dentro de `match /jogadores/{jogador}`:
  ```
  match /votos/{usuario} {
    allow read: if souMembro(pelada);
    allow write: if souDiretoria(pelada) && request.auth.uid == usuario;
  }
  ```
  Ou seja: cada diretor só escreve o voto dele, e a diretoria vê os votos de
  todos — foi isso que o Leandro pediu ("pra alterar, porque os caras são
  moleque e ficam fazendo graça na hora de dar a nota").
- Na tela: mostrar a média grande e, embaixo, quantos diretores já votaram.
  Tocando ali, abrir quem deu quanto.
- **Conselho que já foi dado a ele e ele não rejeitou:** jogar fora o voto mais
  alto e o mais baixo antes de tirar a média resolve a palhaçada sozinho, sem
  ninguém precisar vigiar voto de ninguém. Vale repetir a sugestão.

### 2. Abrir o card e ver a cartinha com estatísticas

Pedido literal: *"Aí vai poder abrir os cards, com as estatísticas. O fundo da
imagem já é o card."*

Duas coisas:

- **A foto vira o fundo do card**, ocupando o card inteiro como nas figurinhas
  de jogo, com o nome por cima num degradê escuro — em vez da bolinha atual.
  Quem não tem foto continua com as iniciais.
- **Tocar no card abre a cartinha** do jogador em tela cheia: foto grande,
  estrelas, posição e as estatísticas do ano. Os números já existem prontos em
  `estatisticasDoAno(jogos, jogadores, ano)` de `src/dados/regras.js`, que
  devolve `{ gols, assistencias, jogos, vitorias, empates, derrotas }` por
  jogador. Basta buscar os jogos com
  `useColecao('peladas/{pelada}/jogos')` e achar a linha do jogador.
- Cuidado: a `Nota` é interativa (tem `role="slider"`), então ela **não pode
  ficar dentro** do botão que abre a cartinha. Deixe o botão só na foto e no
  nome, com a nota fora dele.

### 3. Importar as estrelas que o grupo já tem

O Leandro quer trazer as notas da Shekinah que estão no WhatsApp. O caminho é
colar o texto do grupo e casar os nomes, reaproveitando `lerNomesColados` e
`casarNomes` de `src/dados/regras.js`, que já casam por nome **e por apelido**.
O formato do grupo é `Suan⭐⭐⭐` e `Tio du⭐⭐⭐,5`.

### 4. Etapa 4, que já estava pendente de antes

Ler a lista de um print ou de uma foto do papel, foto do grupo e mandar resumo
pro WhatsApp. Depende de o Leandro mandar uma foto da lista de papel da
Madrugada, pra saber se a leitura de letra à mão é viável antes de prometer.

### 5. Privacidade do financeiro (dívida antiga, ele sabe)

Um participante curioso, com as ferramentas de desenvolvedor do navegador,
consegue ler o pagamento dos outros, porque mensalidades e dias de jogo são
documentos únicos lidos por todos. A correção é guardar o financeiro por
jogador. Não é urgente, mas não pode ser esquecido.

## Armadilhas que já custaram tempo

- **Componente definido dentro do render não pode.** `Pessoa` e `NomeEditavel`
  nasceram dentro de `Jogadores` e o React remontava o campo a cada letra,
  matando o foco. Estão fora agora; mantenha fora.
- **Testar foco no navegador embutido engana.** Com a janela sem foco,
  `document.hasFocus()` é falso e `.blur()` não dispara `onBlur`. Pareceu bug
  do app e não era; disparar `focusout` na mão resolve o teste.
- **Não grave no banco a cada movimento do dedo.** Existe uma espera de 600ms
  em `Jogadores.jsx` (`ESPERA_PRA_GRAVAR`): a tela anda na hora, o banco recebe
  quando o dedo descansa.
- **A barra das estrelas é medida uma vez**, no momento em que o dedo encosta
  (`areaDoArrasto` em `Nota.jsx`). Medir a cada movimento fazia as estrelas
  andarem debaixo do dedo.
- **A soma de um time passa de 5**, então ela não pode ser formatada com
  `notaEmNumero()`, que para em 5 por ser a nota de um jogador. Em `Times.jsx`
  existe um `emNumero()` só pra isso.
- **Limpe as peladas de teste do banco** quando terminar:
  `npx.cmd --yes firebase-tools firestore:delete "peladas/<id>" --recursive --force --project futebois`

## Como rodar

```
npm run dev        # http://localhost:5173
npm test           # 27 testes das contas
npm run lint
npm run build
npm run publicar   # publica em https://leoof7.github.io/peladas/
```

## Pendência fora do código

O caderno do Obsidian (`C:\Users\SETTE\Documents\Obsidian\Lesete`) está **148
commits atrás** do repositório `leoof7/lesete-cofre` e o rebase deu conflito em
notas do Leandro (AGENDA, DIARIO, SETTE, SITE e outras). A nota das Peladas
está comitada localmente, esperando ele resolver essa divergência. Não force o
push: há risco de perder texto dele.

## Continuação pelo Codex — 22/10/2026

Implementado localmente, ainda sem publicar: cartas em formato de escudo com
acabamento neutro, bronze, prata, ouro e craque azul/dourado. Mostram foto (ou
iniciais), nome/apelido, posição, estrelas e gols, assistências e jogos do ano.
Tocar abre uma janela com a carta ampliada e também vitórias, empates e derrotas.
A diretoria pode abrir a edição do jogador por essa janela. O controle para
alterar as estrelas fica fora do botão da carta.

Arquivos: `src/telas/jogadores/Cartinha.jsx`, `src/telas/Jogadores.jsx` e
`src/estilo.css`. Reaproveita `estatisticasDoAno`, sem inventar atributos de FIFA
ou converter as notas para 0–99. Sem registro no ano, avisa na carta ampliada.

Verificação: lint, montagem e 27 testes passaram. Falta conferir visualmente no
navegador e obter autorização para publicar. O item 2 acima já foi implementado
localmente; votos por diretor, sorteio e importação continuam pendentes.

Ajuste seguinte aprovado por Leandro: estrelas com degradê dourado, contorno e
reflexo, preservando meia estrela e os gestos existentes. Participantes não veem
na lista nem nas cartas o nome de quem alterou a nota; a diretoria continua
vendo. Isso oculta a informação na interface; `estrelasPor` ainda existe no
documento compartilhado do jogador. Não foi alterada a regra de leitura do banco.
Prévia demonstrativa gerada por `scripts/previa-cartas.mjs` com o componente real.

Publicação autorizada por Leandro em 22/10/2026: `npm run publicar` concluído,
commit `eccfbd5` em `gh-pages`. Endereço público respondeu HTTP 200 e passou a
servir `index-YjCi4N60.js`, confirmando a versão nova. Não houve alteração de
jogadores ou jogos no banco durante a publicação.

## Ajuste de tamanho aprovado em 22/10/2026

Grade compacta: até três cartas por linha no celular a partir de 390px, duas
nas telas menores e quatro nas maiores. Foto reduzida, sem duplicar estrelas
embaixo da carta. A diretoria ajusta a nota na janela da carta ampliada.
Filtro de posição e ordenação geral por posição, mais estrelas ou nome. A
ordenação por estrelas continua congelada durante a edição para evitar que o
jogador mude de lugar enquanto a nota é ajustada.
Lint e 27 testes passaram; montagem da publicação concluída.

## Padrão Lesete, sorteio e importação — 11/11/2026

- Identidade aplicada aos componentes comuns: símbolo oficial, Manrope local,
  paleta azul e clara, cabeçalhos e botões. As cartas continuam compactas.
- Tirar times: usa quem chegou, distribui goleiros e aproxima as somas.
  Quem está sem nota usa a média do grupo só no cálculo. A proposta precisa
  ser salva pela diretoria. Campo respeita o limite de quem começa; quadra
  mantém o rodízio quando já há dois ou mais times completos.
- Importação: nome/apelido, sobrenome, grafias próximas, acentos e formatação
  de WhatsApp. Empates não são escolhidos. A diretoria revisa as sugestões,
  corrige os vínculos e decide se cadastra convidados. Novos cadastros e lista
  são gravados juntos.
- Corrigidos também o aviso de segundo tempo fora do campo e a sugestão de
  campo que cortava dois lugares ao contar só os jogadores de linha.
- 30 testes, lint e montagem passaram. O navegador não abriu o servidor local.
  Publicado em gh-pages no commit f5d99d1.

## Redesenho dos fluxos e importação de notas — 11/11/2026

- Produção autorizada por Leandro. Dia de jogo reorganizado, botões de ações
  importantes separados, confirmação de cancelamento, configurações recolhíveis
  e busca de jogadores por nome ou apelido. A visão do jogador na etapa de
  pagamentos exibe apenas sua cobrança; as regras do banco não foram alteradas.
- Campo e quadra: por estrelas ou por ordem de chegada, sempre com revisão
  antes de salvar. Campo mantém a montagem à mão e os limites do primeiro tempo.
- Jogadores: a diretoria pode importar notas coladas do WhatsApp, revisar as
  correspondências e selecionar quais grava. Notas existentes não são marcadas
  por padrão, e correspondências sem cadastro único ou repetidas ficam de fora.
- 33 testes passaram; lint e montagem concluídos. O fluxo principal do redesenho
  foi conferido na prévia com os dois perfis. Publicação em gh-pages: 16bc787.
- Backlog aberto: média por diretor e privacidade no banco; leitura de listas
  por foto/print e compartilhamento. A leitura de papel ainda depende de exemplo.
