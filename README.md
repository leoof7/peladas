# Peladas

App das peladas do Leandro: **Pelada da Madrugada** (campo, mensalidade) e **Pelada Shekinah** (quadra, rateio).
Lista de quem vai, times, gols, assistências e quem já pagou.

Site: GitHub Pages. Banco de dados: Firebase (Firestore).

## Documentos

- [Regras do negócio](docs/regras-do-negocio.md) — como cada pelada funciona e o que foi combinado.
- [Decisões de arquitetura](docs/adr) — por que o app foi montado assim.

## Rodar no computador

```bash
npm install
npm run dev
```

Sem o arquivo `.env`, o app abre em **modo de teste**: tudo fica guardado só no
navegador daquele aparelho. Serve pra experimentar as telas sem nuvem nenhuma.

Para ligar o Firebase, copie `.env.example` para `.env` e preencha com os dados
que aparecem em *Configurações do projeto > Seus aplicativos > Web*.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Abre o app no computador pra desenvolvimento |
| `npm run build` | Gera a versão que vai pro ar, na pasta `dist` |
| `npm run lint` | Confere o código |
| `npm run preview` | Abre a versão gerada, pra conferir antes de publicar |

## Publicação

Todo envio para o ramo `main` publica sozinho, pelo GitHub Actions
(`.github/workflows/deploy.yml`). Os dados de conexão do Firebase ficam nos
*secrets* do repositório, com os mesmos nomes do `.env.example`.

## Segurança

- As regras de quem pode ler e escrever ficam em `firestore.rules`, no servidor
  do Firebase. O aplicativo sozinho não consegue passar por cima delas.
- O PIN de cada jogador nunca é guardado como número, só como um resumo que não
  dá pra desfazer. Nem a diretoria lê esse resumo.
- Nenhuma chave fica dentro do código: tudo vem de variáveis de ambiente.
