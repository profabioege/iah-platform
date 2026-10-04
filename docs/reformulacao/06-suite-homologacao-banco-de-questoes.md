# Suíte de homologação do banco de questões (percursos pela rede)

Os percursos que antes eu rodava com scripts temporários agora fazem parte
de `npm run test:homologacao`. Eles rodam junto das suítes que já
existiam.

## Como rodar

```
cd app
npm run test:homologacao
# só as novas:
npm run test:homologacao -- tests/e2e/circuito-adaptativo.test.mjs tests/e2e/catalogo-e-revisao.test.mjs
```

O ambiente nasce e morre na execução:

1. sobe um PostgreSQL + PostgREST descartáveis com **Podman** (`scripts/pilot-db-env.mjs`);
2. provisiona as turmas pela CLI real;
3. semeia o banco de questões sintético (`scripts/homologacao-seed-banco-questoes.mjs`);
4. faz o build e sobe o servidor Next de produção;
5. roda as suítes de `tests/e2e/`.

**Nada toca banco remoto**: a semeadura recusa qualquer destino que não seja local.

## O que as suítes novas cobrem

Cada passo é o que a tela faz: um GET da página e o envio do próprio
formulário dela (a Server Action do build), com o cookie de sessão emitido
pelo Auth.js num login normal. Nenhum módulo da aplicação é importado e
nenhum cookie é fabricado.

| Suíte | Percurso |
|---|---|
| `circuito-adaptativo.test.mjs` (5) | professor liga o circuito → aluno faz duas rodadas (a rodada aberta é devolvida, nenhuma questão se repete) e consolida → colega recebe 404 → painel mostra "pronto para avançar" → professor libera → aluno passa à habilidade seguinte |
| `catalogo-e-revisao.test.mjs` (7) | gestão verifica as fontes → aprova com a conferência e devolve com comentário → autor corrige com nova versão, troca a habilidade e completa a resolução do item do Enem → gestão aprova → professor da escola vê os itens do catálogo rotulados e publica uma lista → aluno vê tabela e figura, erra e lê a devolutiva da alternativa → a figura não chega a outra escola nem a quem está sem sessão |

**Dados de teste**: todos sintéticos e guardados em `tests/e2e/fixtures/`:

- um acervo em `.md`, no formato dos acervos autorais;
- um item no formato do Enem com figura PNG e microdados fictícios.

## Achados na primeira execução (04/10/2026)

1. **Defeito corrigido — a nova versão perdia as figuras.** Corrigir o
   texto de uma questão com figura criava a versão seguinte sem as
   imagens. O aluno via a imagem quebrada e a rota respondia 404. Agora a
   nova versão copia as figuras da anterior, e há um teste com banco real
   para isso (`question-bank-catalog.test.mjs`).
2. **Defeito anterior à reformulação, não corrigido.** No modo real,
   `/professor/turmas` responde **500**, porque a página chama o repositório
   de conhecimento, que não está ativado
   (`KnowledgeDatabaseRepositories: "documents.list" ainda não está disponível`).
   Ele derruba o teste "2. o provisionamento deixou a turma matriculada e
   visível ao professor" de `percurso-pedagogico`. Reproduzi a falha no
   commit `19f5002` (antes da reformulação), com o mesmo erro.

## Resultado

| Suíte | Resultado |
|---|---|
| `test:homologacao` | 36 testes · 35 passam · 1 falha (o defeito anterior do item 2) |
| `test:pilot` | 64 de 64 |
| Unitários | 415 de 415 |

## Limites

- **Sem navegador real.** Não há captura de tela nem execução de
  JavaScript no cliente. As telas novas não dependem de JS no cliente
  (são formulários com Server Actions), mas o visual continua sem
  conferência automática.
- **Podman obrigatório na máquina.** Rodar no Windows exige Podman
  instalado (ver `docs/operations/retomada-homologacao.md`).
