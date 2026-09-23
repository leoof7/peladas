# Regras do negócio — App das Peladas

Decisões combinadas com o Leandro em 17/09/2026. Se alguma regra mudar, atualize aqui.

## Geral

- Um app só, com duas peladas dentro. **Cada pelada tem um tipo fixo, que não se troca:**
  - **Pelada da Madrugada:** sempre campo, sempre cobrança mensal.
  - **Pelada Shekinah:** sempre quadra, sempre rateio por pelada.
- Login, jogadores, ranking, Pix e financeiro são iguais nas duas. O dia de jogo e a cobrança mudam conforme o tipo.
- Hospedagem no GitHub Pages (conta `leoof7`). Banco de dados no Firebase.
- Funciona no celular e pode ser instalado na tela inicial.

## Acesso

- Dois perfis: **diretoria** e **participante**.
- A **diretoria vê tudo o que o participante vê**, mais as funções de diretoria.
- **Só a diretoria** tira time, muda uniforme, altera dados, marca pagamento e edita chaves Pix.
- A diretoria escreve os códigos como quiser (4 a 12 letras e números). Os dois códigos
  precisam ser diferentes entre si.
- Cada jogador é cadastrado pela diretoria. No primeiro acesso ele acha o próprio nome na
  lista e o PIN que digitar vira o dele. Nomes repetidos não são aceitos no cadastro.
- Participante consulta, copia a chave Pix e lança os próprios gols e assistências (a diretoria aprova).
- Entrada: **código da pelada → escolhe o próprio nome → PIN de 4 números**.
  - O PIN é criado no primeiro acesso. A diretoria pode zerar o PIN de quem esqueceu.
  - A diretoria entra com um código próprio, diferente do código dos jogadores.
- Quem cobra também é diretoria.
- **Cada participante vê só o próprio financeiro.** A diretoria vê o de todos.

## Jogadores

- Cadastro: nome, apelido, posição, tipo (fixo ou convidado), foto opcional.
- Posições: goleiro, defesa, meio, ataque. **Lateral e volante contam como defesa.**
- Convidado/avulso é cadastrado na hora e conta tudo (gols, assistências, presença, pagamento).
- Quem sai do grupo é **desativado**, nunca apagado, pra não perder o histórico.
- Opção **isento**: não paga nada (usado pelos goleiros fixos).

## Gols e assistências (as duas peladas)

- Lançados **no final**, por jogador.
- O **próprio jogador** pode lançar seus gols e assistências. Fica "aguardando" até a **diretoria aprovar** (um por um ou "Aprovar todos").
- A diretoria também pode lançar e corrigir direto.
- Só entra no ranking o que foi aprovado.

## Lista e chegada (as duas peladas)

São duas coisas diferentes:

- **Lista** é quem disse que vem. Pode entrar de três jeitos: **colar o texto** do WhatsApp,
  **print** do grupo ou **foto da lista de papel**; ou puxando dos **jogadores já cadastrados**.
  A diretoria confere os nomes antes de salvar. O nome lido do grupo casa pelo nome **ou pelo apelido**.
- **Chegou** é quem apareceu de verdade, na ordem em que chegou. Só quem chegou entra em time,
  conta presença e entra na conta do dinheiro.

Tudo isso é **ao vivo**: o que a diretoria muda aparece na hora pros outros diretores e pros
jogadores, sem ninguém precisar recarregar.

## Pelada da Madrugada (campo, todo domingo de manhã)

- Campo 11: 10 na linha + 1 goleiro fixo por time. **Um jogo de 90 minutos, dois times.**
- Lista por **ordem de chegada**, editável se houver confusão. A lista de papel continua sendo a principal.
- Jogam os primeiros 22. Quem chegar depois fica de fora e **entra no 2º tempo**, sempre por ordem de chegada.
- Os times saem na **tampinha**, ao vivo. O app só registra o que saiu.
- Cada time usa um **uniforme** (a cor muda de domingo pra domingo). A lista de uniformes e a escolha em cada domingo são só da diretoria.
- **Pagamento:**
  - Mensalidade de **R$ 60,00**, paga indo ou não ao domingo. **Recebe: Zé Luiz.**
  - Mais **R$ 2,00 por domingo** pra cada jogador do time que **perdeu ou empatou**. No empate, os dois times pagam. **Recebe: Wanderley.**
  - Quem entrou no 2º tempo paga os R$ 2,00 se o time em que entrou perder ou empatar.
  - Goleiros fixos (2 ou 3) não pagam nada: nem mensalidade, nem os R$ 2,00.
- Domingo sem jogo (chuva, feriado) é marcado como **cancelado** e ninguém paga os R$ 2,00.

## Pelada Shekinah (quadra, sem dia fixo)

- Não é mensal: funciona por **lista** a cada pelada.
- Tem **limite de vagas** e **não tem lista de espera**.
- Na quadra, a diretoria marca **quem chegou**. **Só quem chegou entra no sorteio.**
- Quem **chega atrasado** é incluído na hora e **entra no time de fora**.
- Times: **aleatório**, **ordem de chegada** ou **tampinha** (o app registra). No máximo 5 na linha por time; algumas quadras são 4 na linha.
- As partidas (7 minutos, durante 1h30) **não são registradas no app**, o rodízio fica no ao vivo. Pra referência: quem ganha fica e entra o time de fora; no empate sai quem está há mais tempo em quadra; empate na primeira partida vai no par ou ímpar.
- **Pagamento:** aluguel da quadra **dividido por quem chegou e jogou**, valor exato, sem arredondar.
  - O valor por pessoa é arredondado só no centavo (ex.: R$ 180,00 ÷ 14 = R$ 12,86). A diferença de centavos aparece na tela.
  - **Recebe: Suan**, ou **Leandro** quando o Suan falta. A diretoria escolhe em cada pelada.

## Pix e cobrança

- **Sem QR Code.** O app mostra a **chave Pix** de quem recebe, com botão de **copiar**.
- Todos da pelada veem e copiam a chave. **Só a diretoria altera.**
- **O app não confirma pagamento sozinho.** O comprovante vai no grupo e a diretoria marca quem pagou.
- Botão **"Todos pagaram"** pra dar baixa em lote e depois desmarcar quem não pagou.
- Aba de **financeiro/caixa**: entradas e saídas (aluguel, bola, colete, água) e saldo.

## O que o app já faz (20/09/2026)

- Entrar com código + nome + PIN, com os dois perfis.
- Cadastro de jogadores, com goleiro fixo isento e quem saiu desativado.
- Dia de jogo em quatro passos: chegada, times, gols e cobrança.
- Chegada: colar a lista do grupo, cadastrar convidado na hora, ordem editável.
- Times: tampinha na Madrugada (com uniforme por time) e sorteio na Shekinah.
- Gols e assistências, com o jogador lançando os dele e a diretoria aprovando.
- Cobrança: os R$ 2 de quem perdeu ou empatou, mensalidade por mês, rateio da
  quadra, chave Pix pra copiar e botão "Todos pagaram".
- Ranking do ano: gols, assistências, presença e aproveitamento.
- Caixa: o que os jogadores pagaram entra sozinho; aluguel, bola e colete são
  lançados à mão.

Ainda não existe: leitura de print ou foto da lista (por enquanto é colar o
texto), foto do grupo e dos jogadores, e mandar resumo pro WhatsApp.

## Virada do ano

- Dívida de dezembro fica em dezembro.
- No ano novo os números zeram, mas as estatísticas dos anos anteriores continuam disponíveis pra consulta.
