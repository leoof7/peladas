# Continuar daqui — estrelas, cards e o que falta

Atualizado em 22/10/2026. Este arquivo é feito pra outra pessoa (ou outra IA)
pegar o trabalho sem ter o histórico da conversa. Leia junto com
`docs/regras-do-negocio.md`, que é onde moram as regras do negócio.

## Onde o projeto está

App em React + Vite, sem TypeScript, banco no Firebase (projeto `futebois`,
região `southamerica-east1`), publicado em https://leoof7.github.io/peladas/
com `npm run publicar`. Duas peladas de verdade no banco: **Pelada da
Madrugada** (campo, mensal) e **Shekinah Futebol Clube** (quadra, rateio).

O dono é o **Leandro**, que não é programador. Ele decide o produto; quem
escreve o código decide o como e precisa avisar, em português claro, quando o
pedido tem risco. As preferências dele estão em `C:\Users\SETTE\.claude\CLAUDE.md`.

## O que foi feito nesta rodada

A antiga aba **Jogadores** virou a tela das estrelas, usando os jogadores que
já estavam cadastrados. Não houve migração: quem já existia continua lá, só
sem nota até alguém dar.

| Arquivo | O que faz |
|---|---|
| `src/dados/estrelas.js` | posições, arredondar de meia em meia, média, faixa de cor do card, ordenação e o texto pra colar no grupo |
| `src/dados/estrelas.test.js` | 8 testes dessa lógica (de 27 do projeto) |
| `src/componentes/Nota.jsx` | as cinco estrelas: toque e arrasto, de meia em meia |
| `src/componentes/Avatar.jsx` | bolinha com foto ou iniciais |
| `src/util/foto.js` | encolhe a foto pra 240px quadrados e corrige foto deitada |
| `src/telas/Jogadores.jsx` | lista e cards, grupos por posição, nome editável, excluir, copiar pro grupo |
| `src/telas/jogadores/FichaJogador.jsx` | apelido, posição, foto, isento, quem saiu, zerar PIN, excluir |

Campos novos no documento do jogador: `estrelas`, `estrelasPor`, `estrelasEm`
e `foto` (imagem em texto, data URL).

`firestore.rules` **não mudou**: a coleção `jogadores` já era lida por quem
está na pelada e escrita só pela diretoria — exatamente a regra pedida.

### Correções da segunda leva

- **Excluir jogador** passou a existir, com confirmação em dois toques e aviso
  de que, pra quem já jogou, é melhor desmarcar "Continua na pelada".
- **Zoom estragava as notas**: fechar a pinça passando os dedos pela lista
  mudava a estrela de todo mundo. Agora a trilha usa
  `touch-action: pan-y pinch-zoom`, ignora ponteiros não primários e cancela o
  arrasto quando aparece um segundo dedo.
- **Lista mais enxuta**: a foto abre a ficha, o nome abre a correção do nome, e
  o lapisinho saiu — era ele que espremia o nome e causava "Guilherme A...".
- **Cards por faixa de cor**, no espírito das figurinhas de jogo:
  sem nota = neutro, 1 e 2 = bronze, 3 = prata, 4 = ouro, 5 = craque (fundo
  escuro com borda dourada). A regra está em `faixaDaEstrela()`, com teste.

## O que o Leandro pediu e ainda NÃO foi feito

### 1. Nota por diretor, com média (é o mais importante)

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

### 3. Times sorteados pelas estrelas

Era o motivo original das notas. A ideia combinada: equilibrar os dois times
pela **soma das estrelas**, sem separar os goleiros fixos. Mexe em
`src/dados/regras.js` (`montarTimes`, `dividirEmDois`) e em
`src/telas/jogo/Times.jsx`.

### 4. Importar as estrelas que o grupo já tem

O Leandro quer trazer as notas da Shekinah que estão no WhatsApp. O caminho é
colar o texto do grupo e casar os nomes, reaproveitando `lerNomesColados` e
`casarNomes` de `src/dados/regras.js`, que já casam por nome **e por apelido**.
O formato do grupo é `Suan⭐⭐⭐` e `Tio du⭐⭐⭐,5`.

### 5. Etapa 4, que já estava pendente de antes

Ler a lista de um print ou de uma foto do papel, foto do grupo e mandar resumo
pro WhatsApp. Depende de o Leandro mandar uma foto da lista de papel da
Madrugada, pra saber se a leitura de letra à mão é viável antes de prometer.

### 6. Privacidade do financeiro (dívida antiga, ele sabe)

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
