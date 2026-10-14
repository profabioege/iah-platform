# 09 — Prontidão para o diagnóstico real (14/10/2026)

Branch `feature/prontidao-diagnostico-real`, criada a partir de
`feature/diagnostico-plano-semanal` (`7d54724`). **Não publicada.**
Decisão: `DECISIONS.md` D-055.

Objetivo: preparar o **primeiro diagnóstico não demonstrativo** da 1ª
série. Dois passos dependem de pessoas e ficam com elas: a **revisão
docente item a item no sistema** e o **planejamento real da escola**.
Este incremento entrega as ferramentas para os dois e mostra, na tela,
o que ainda falta.

## 1. O que muda

| Peça | O que faz | Onde |
|---|---|---|
| Carga do planejamento da escola | Lê a planilha da escola, confere série, período, componente e o código de cada habilidade na BNCC de referência (mesma área do componente), simula por padrão e grava como `approved` só com `--validado-pela-escola`. Com `--substituir-provisorio`, aposenta as linhas provisórias que não estão na planilha (status `retired`; nada é apagado). | `scripts/planejamento-escolar-carga.mjs`, `src/modules/question-bank/seeds/school-plan-import.ts` |
| Modelo da planilha | `serie;periodo;rotulo_periodo;componente;habilidade;observacao`. As linhas de EXEMPLO são recusadas se ficarem na planilha. | `db/reference/modelo-planejamento-escolar.csv` |
| Prontidão do diagnóstico | Por habilidade planejada: questões **revisadas** (aprovadas no sistema, fonte não sintética, vínculo oficial ou confirmado), demonstrativas, quantas faltam (mínimo 3) e se o planejamento está validado. Atalho "revisar" para a fila filtrada. | `/professor/diagnostico` (painel "Prontidão para um diagnóstico real"), `src/modules/study/domain/diagnostic-readiness.ts` |
| Fila de revisão filtrada | Filtros por **série sugerida** do item (1ª, 2ª, 3ª) e por **habilidade** (código BNCC), mantendo a situação. A contagem por situação respeita os filtros. | `/professor/revisao` e `/gestor/revisao` (`?serie=em1&habilidade=EM13CHS106`) |

Nenhuma migration nova. O banco já impunha o essencial: revisor ≠
autor, fonte com direitos verificados para aprovar (0017/0018), escopo
do planejamento (0016) e marca demonstrativa calculada (0022).

## 2. Como liberar o primeiro diagnóstico real (passo a passo)

1. **Planejamento real.** A escola preenche o modelo para a 1ª série
   (pelo menos o período do diagnóstico). Rode na pasta `app`, em CMD:

   ```
   node --experimental-strip-types scripts\planejamento-escolar-carga.mjs --arquivo=<planilha.csv> --escola=<id> --ano-letivo=<id>
   ```

   Corrija o que a simulação apontar. Depois grave na homologação,
   confirmando o projeto: `--validado-pela-escola --substituir-provisorio --execute --confirm-project=<ref>`.
2. **Fonte do lote.** Na conta de gestão do Catálogo IAH, em
   `/gestor/fontes`, verifique a fonte do lote piloto (os itens aparecem
   com "direitos pendente" até isso).
3. **Revisão docente.** Em `/gestor/revisao?serie=em1` (ou pelo atalho
   "revisar" do painel), revise **item a item**: gabarito, habilidade,
   direitos e linguagem. Aprovar exige conta diferente da autora.
4. **Itens que faltam.** O painel mostra, por habilidade do
   planejamento validado, quantas questões revisadas faltam (mínimo 3).
   O lote tem 1 por habilidade na 1ª série: faltam questões novas, a
   escrever **depois** que o planejamento real disser quais habilidades.
5. Com todas as habilidades do diagnóstico prontas, o painel mostra
   **"Pronto para diagnóstico real"** e o diagnóstico criado nasce **sem a
   marca demonstrativa** (calculada pelo banco).

## 3. Validação

| Suíte | Resultado | Cobre |
|---|---|---|
| `npm test` | 463/463 | Planilha (formatos de série, `;`/`,`/aspas, código inexistente, área trocada, LP fora de Língua Portuguesa, período e série inválidos, repetição, linhas de EXEMPLO); prontidão; filtros da fila |
| `npm run test:pilot` | 84/84 | `tests/pilot/school-plan.test.mjs`: substitui o provisório sem apagar (atualiza, acrescenta, aposenta), mantém o id da linha coincidente, não duplica ao repetir, não mexe em outra escola, recusa ano letivo de outra escola, não grava planilha com problema; professor vê o planejamento validado e a prontidão continua exigindo questões revisadas |
| `npm run test:homologacao` | 60/60 | `tests/e2e/prontidao-e-revisao.test.mjs`: painel de prontidão e fila do catálogo filtrada por série e habilidade, pela rede |
| `tsc`, `lint`, `migrations:check` | sem erros; 22 migrations | |
| Telas 390 e 1280 px | sem rolagem horizontal | painel de prontidão, fila filtrada |

Com o lote carregado na demonstração, a fila da 1ª série mostra 16
itens em revisão (os 14 do lote + 2 do acervo sintético de teste).

Ambiente local; **não mede capacidade da Vercel**.

## 4. Bloqueios (decisão ou ação humana)

- **Planejamento real da escola** — não disponível.
- **Revisão docente dos itens** — só pode ser feita por pessoa, no
  sistema.
- **Novos itens** — dependem das habilidades do planejamento real.
- **Conferência de EM13CHS106 no portal do MEC** — acesso ao portal não
  autorizado nesta sessão.
- **Projetos Supabase de homologação e produção pausados** — nada foi
  aplicado; a carga exige confirmação explícita do projeto.
