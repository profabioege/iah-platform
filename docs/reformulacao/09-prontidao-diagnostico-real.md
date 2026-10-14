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

| Etapa sem questões demonstrativas | Com o mínimo de questões revisadas de fonte não sintética, a etapa usa só elas (as demonstrativas ficam de fora). Antes, as sintéticas da escola entravam primeiro e o diagnóstico continuaria demonstrativo. | `pickDiagnosticItems` em `diagnostic-service.ts` |
| Migration 0023 | A etapa aceita questão cuja habilidade foi **confirmada por revisão humana** (ex.: itens do Enem, classificados pela Matriz). A 0022 recusava a etapa nesse caso — defeito encontrado ao homologar o diagnóstico real. | `db/migrations/0023_diagnostic_block_confirmed_skill.sql` |

O banco já impunha o resto: revisor ≠ autor, fonte com direitos
verificados para aprovar (0017/0018), escopo do planejamento (0016) e
marca demonstrativa calculada (0022).

## 2. Como liberar o primeiro diagnóstico real (passo a passo)

1. **Planejamento real.** A escola preenche o modelo para a 1ª série
   (pelo menos o período do diagnóstico). Rode na pasta `app`, em CMD:

   ```
   node --experimental-strip-types scripts\planejamento-escolar-carga.mjs --arquivo=<planilha.csv> --escola=<id> --ano-letivo=<id>
   ```

   Corrija o que a simulação apontar. Depois grave na homologação,
   confirmando o projeto: `--validado-pela-escola --substituir-provisorio --execute --confirm-project=<ref>`.
2. **Fonte do lote.** Na conta de gestão do Catálogo IAH, em
   `/gestor/fontes`, verifique as fontes do lote piloto e do lote
   complementar (os itens aparecem com "direitos pendente" até isso).
3. **Revisão docente.** Em `/gestor/revisao?serie=em1` (ou pelo atalho
   "revisar" do painel), revise **item a item**: gabarito, habilidade,
   direitos e linguagem. Aprovar exige conta diferente da autora.
4. **Itens que faltam.** O painel mostra, por habilidade do
   planejamento validado, quantas questões revisadas faltam (mínimo 3).
   O lote complementar (§5) já leva as 14 habilidades da 1ª série a 4
   itens cada — falta revisá-los. Habilidades do planejamento real que
   não estejam entre essas 14 ainda pedirão itens novos.
5. Com todas as habilidades do diagnóstico prontas, o painel mostra
   **"Pronto para diagnóstico real"** e o diagnóstico criado nasce **sem a
   marca demonstrativa** (calculada pelo banco).

## 3. Lote complementar da 1ª série (42 itens)

O planejamento real só chega no início do próximo ano. Como as
habilidades da BNCC do Ensino Médio são organizadas por área (não por
série), questões escritas agora continuam valendo quando a escola
decidir em que série e período cada habilidade entra.

| Item | Situação |
|---|---|
| Itens | 42 originais (`IAH-LC-011…022`, `IAH-CH-011…022`, `IAH-CN-011…019`, `IAH-MT-011…019`), 3 por habilidade das 14 da 1ª série do lote piloto → 4 por habilidade com os do piloto |
| Formato | O do lote piloto: texto-base, comando, 5 alternativas, resolução, análise de cada distrator, dificuldade editorial (não é TRI), acessibilidade, notas para revisão |
| Equilíbrio | Gabaritos A 8 · B 8 · C 8 · D 9 · E 9; dificuldade fácil 15 · média 17 · difícil 10; pelo menos dois níveis por habilidade |
| Revisão independente (IA) | Todos os gabaritos conferidos; 0 bloqueantes; 3 análises de distrator com conta errada corrigidas; alternativas reordenadas, pistas de tamanho reduzidas, rótulos de dificuldade e habilidades do Enem ajustados. **Não equivale a aprovação docente.** |
| Originalidade | Conferida contra os 40 itens do piloto e entre os próprios itens (maior sequência comum e Jaccard). **Comparação com os cadernos do Enem pendente** (feita pelo navegador em 05/10 para o piloto; não refeita) |
| Habilidades do Enem | 38 itens com texto conferido no PDF oficial em 05/10; 4 (LC-022 → H21, CH-016 → H22, MT-011 e MT-018 → H3) com texto da transcrição de referência do projeto, marcados **pendentes de conferência** |
| Status | `pendente_revisao_docente` em todos; no sistema entram **em revisão** |
| Carga | `scripts/catalogo-iah-lote-piloto-carga.mjs --complementar` (simula por padrão; fonte própria `iah-lote-complementar-1serie`; só aceita itens pendentes). Na demonstração: `npm run demo:dois-eixos -- --lote-complementar=<arquivo>` |
| Arquivos | Fora do repositório, como os acervos: `iah_lote5_complementar_1serie_v1.json` e `.csv` (gerador em `banco-iah/src/construir_complementar.py`) |

Com os dois lotes carregados, a fila da 1ª série no Catálogo mostra 58
itens em revisão (14 do piloto + 42 complementares + 2 sintéticos de
teste) e, por habilidade, 4 itens (ex.: EM13CHS106).

## 4. Validação

| Suíte | Resultado | Cobre |
|---|---|---|
| `npm test` | 466/466 | Planilha (formatos de série, `;`/`,`/aspas, código inexistente, área trocada, LP fora de Língua Portuguesa, período e série inválidos, repetição, linhas de EXEMPLO); prontidão; filtros da fila |
| `npm run test:pilot` | 87/87 | `tests/pilot/school-plan.test.mjs`: substitui o provisório sem apagar (atualiza, acrescenta, aposenta), mantém o id da linha coincidente, não duplica ao repetir, não mexe em outra escola, recusa ano letivo de outra escola, não grava planilha com problema; professor vê o planejamento validado e a prontidão continua exigindo questões revisadas |
| `npm run test:homologacao` | 64/64 | `tests/e2e/prontidao-e-revisao.test.mjs`: painel e fila filtrada; `tests/e2e/zz-diagnostico-real.test.mjs`: planilha validada carregada pelo script → painel "Pronto" → diagnóstico nasce **sem marca demonstrativa** e sem questões sintéticas |
| Integração do diagnóstico real | (em `test:pilot`) | `tests/pilot/diagnostic-real.test.mjs`: provisório + sintéticas → demonstrativo; revisão de 4 questões (uma por correspondência confirmada, 0023) + planejamento validado → diagnóstico sem marcas |
| `tsc`, `lint`, `migrations:check` | sem erros; 23 migrations | |
| Telas 390 e 1280 px | sem rolagem horizontal | painel de prontidão, fila filtrada |

Com o lote carregado na demonstração, a fila da 1ª série mostra 16
itens em revisão (os 14 do lote + 2 do acervo sintético de teste).

Ambiente local; **não mede capacidade da Vercel**.

## 5. Bloqueios (decisão ou ação humana)

- **Planejamento real da escola** — não disponível.
- **Revisão docente dos itens** — só pode ser feita por pessoa, no
  sistema.
- **Planejamento real** — chega no início do próximo ano. Os 42 itens
  complementares (§3) já cobrem as 14 habilidades da 1ª série do lote.
- **Comparação dos novos itens com os cadernos do Enem** — exige o
  navegador (o portal do Inep bloqueia acesso direto), como em 05/10.
- **Projetos Supabase de homologação e produção pausados** — nada foi
  aplicado; a carga exige confirmação explícita do projeto.
