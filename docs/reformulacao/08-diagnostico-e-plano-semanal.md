# 08 — Diagnóstico por etapas, plano semanal e Missão 02 de Geografia (14/10/2026)

Branch `feature/diagnostico-plano-semanal`, criada a partir de
`feature/dois-eixos-ia-trilhas` (`9ccad95`). **Não publicada.**
Decisão: `DECISIONS.md` D-054.

Fluxo entregue para a 1ª série do Ensino Médio:

```
diagnóstico por etapas → necessidades de estudo (evidências iniciais)
  → plano semanal ajustável → atividades → acompanhamento docente
```

## 1. Dependências resolvidas antes de construir

| Dependência | Situação verificada | Consequência |
|---|---|---|
| 40 itens do lote piloto | Aprovados pela coordenação **em bloco** em 06/10 (declaração do Professor Fabio, sem parecer item a item). Rascunho gerado por IA sob coordenação editorial. No sistema entram **em revisão** (importador D-053); nenhum está aprovado no sistema. Na 1ª série são 14, **1 por habilidade**. | Não servem ao diagnóstico agora: exigem aprovação no sistema por revisor humano e pelo menos 3 questões por habilidade. Revisão assistida por IA não conta como aprovação docente. |
| Questões do diagnóstico | Construído e testado com **questões demonstrativas** (sintéticas, escritas pela equipe IAH, fonte marcada `synthetic`) | Todo diagnóstico com elas é marcado **demonstrativo pelo banco** e a tela avisa: "não use os resultados para decisões sobre alunos reais". **Não está pronto para alunos reais.** |
| Planejamento curricular | Continua o **recorte provisório** (1ª série, 1º bimestre, 4 habilidades: EM13MAT101, EM13CNT101, EM13CHS101, EM13LGG101) | Diagnóstico, plano e percursos mostram o aviso de provisório. Substituição: §6. |
| Migrações aplicadas | `iah-beryon-homolog` e `iah-platform`: **pausados** (INACTIVE) em 14/10; `iah-platform-dev`: ativo, mas a consulta às migrações expirou por conexão. Último registro verificado (03/10): homologação com 0001–0015. | 0016–0022 **não foram aplicadas em nenhum projeto**. Nada foi aplicado nesta etapa. |
| `0016_item_bank` + seed de 06/10 | Nunca aplicados. Movidos (09/10) no worktree `iah-pilot-beryon` para `app/db/obsoleto-2026-10-06/*.obsoleta`, com `LEIA-ME.md` e SHA-256 do conteúdo original. Nada apagado. | `npm run migrations:check` **recusa** um `0016_item_bank.sql` em `db/migrations/`. O lote entra pelo importador do Catálogo (D-053). |

## 2. Diagnóstico por etapas

**Reaproveita** listas `diagnostica`, tentativas, correção no banco e
devolutiva por alternativa (0017–0020). Cada **etapa** é uma lista
diagnóstica de **uma habilidade** do planejamento (até 12 etapas).

- **Professor** (`/professor/diagnostico`): escolhe as habilidades com
  questões elegíveis (aprovadas, vínculo oficial ou confirmado), cria o
  diagnóstico em rascunho e publica. Rascunho não chega ao aluno.
- **Aluno** (`/dashboard/diagnostico`): etapas curtas (4 questões),
  **progresso salvo** a cada resposta e retomada depois de sair ou
  recarregar; a próxima etapa aparece primeiro. Pode entregar com
  questões em branco.
- **Registro**: questão e **versão**, alternativa marcada, **acerto
  calculado pelo banco** na entrega e **habilidade** de cada item
  (`practice_list_items` + `attempt_answers`).
- **Distinções**: questão **incorreta** (respondida e errada) ≠ **não
  respondida** (em branco numa etapa entregue) ≠ etapa **pendente** →
  diagnóstico **incompleto**.

### Regra de evidências `diag-v1` (sem TRI, sem "domínio")

| Situação | Leitura mostrada |
|---|---|
| Etapa não iniciada ou em andamento | Etapa pendente — ainda sem evidência |
| Menos de **3** respostas, ou mais brancos que respostas | **Evidência insuficiente** |
| Acertos ≥ 75% das respondidas | Indícios favoráveis — "não é domínio confirmado" |
| Acertos < 40% | Prioridade de estudo |
| Entre 40% e 75% | Em desenvolvimento |

Uma única questão nunca classifica a habilidade, nem acertando.

## 3. Plano semanal ajustável

- **Formulário breve**: dias disponíveis e minutos por dia (10–240).
- **Regra `plano-v1`** (função pura, versionada), com o **motivo** de cada
  atividade mostrado ao aluno:

| Regra | Atividade | Fonte |
|---|---|---|
| R1 | Etapa pendente do diagnóstico | Diagnóstico |
| R2 | Lista publicada pelo professor e não entregue | Professor |
| R3 | Missão da Trilha IA & Humanidades não entregue | Professor |
| R4 | Revisar devolutivas — habilidade em "prioridade de estudo" | Evidências |
| R5 | Revisar devolutivas — habilidade "em desenvolvimento" | Evidências |
| R6 | Prática com questões novas no circuito | Circuito |

  A proposta também cita o **planejamento da escola** do período e diz
  quais habilidades dele ficaram sem atividade na semana.
- **Orçamento**: nunca passa dos minutos do dia nem usa dia indisponível
  ou que já passou; o que não cabe vai para "o que ficou de fora", com
  motivo. **O banco confere de novo** (0022): soma de minutos por dia,
  dia disponível, semana do plano, origem compatível com quem cria.
- **Sem repetição sem finalidade**: revisão = reler resolução e
  devolutivas (não refazer a mesma questão), no dia seguinte à etapa;
  prática nova = rodada do circuito (só questões inéditas para o aluno,
  0019), depois da revisão; nunca duas atividades da mesma habilidade no
  mesmo dia; atividade em aberto não duplica (índice único).
- **Ajustes**: o aluno conclui, adia, reagenda, remove, reabre e refaz o
  plano (concluídas e orientações ficam). O **professor da turma** ajusta e
  acrescenta orientações dentro do orçamento. **Histórico** de cada
  alteração (só inserção, com autor e papel).
- Evidência insuficiente **não** gera revisão: vira observação ("converse
  com o professor").

## 4. Acompanhamento docente

`/professor/diagnostico`: diagnóstico da turma com marcas
demonstrativo/provisório; por habilidade, quantos alunos em cada leitura;
por aluno, a situação de cada etapa; planos da semana e, por aluno,
`/professor/diagnostico/plano/[id]` para ajustar e orientar. Professor de
outra turma ou escola não alcança (RLS).

## 5. Missão 02 — "Quem Conferiu Este Dado?" (Geografia)

| Campo | Conteúdo |
|---|---|
| Objetivo de Geografia | Ler criticamente tabela, gráfico e mapa sobre a distribuição da população brasileira (procedência, recorte, escala, legenda) |
| Habilidade | **EM13CHS106** (BNCC) — ver verificação abaixo |
| Competência de IA | ia-usar-01, ia-avaliar-01, ia-avaliar-02 (referencial IAH **provisório**) |
| Instrução prática | Perguntar a um assistente de IA a população das Grandes Regiões no Censo 2022, conferir cada número na fonte, registrar o que confirmou e o que corrigiu; não usar a IA para conferir a IA |
| Material e procedência | Item 1 **real**: IBGE, *Censo Demográfico 2022: População e domicílios — Primeiros resultados*, Tabela 2, p. 33 (valores conferidos no PDF do IBGE). Itens 2–4 **sintéticos**, identificados no texto (resposta "de IA", gráfico com eixo truncado, mapa sem legenda) |
| Produção | Relatório de Conferência: classificação dos 4 itens; tabela afirmação da IA × fonte × confirmei/corrigi; título ou legenda corrigido |
| Reflexão | O que teria aceitado sem conferir, o que despertou a desconfiança, o que vai procurar primeiro |
| Critérios docentes | 3 de Geografia, 4 de IA, 3 da reflexão — separados (dois eixos, D-053) |

**Verificação curricular**: código e texto de EM13CHS106 conferidos na
base de dados abertos da BNCC usada pelo projeto (`db/reference`, que
remete ao PDF oficial do MEC, p. 574). **A conferência direta no portal
do MEC ficou bloqueada** nesta sessão (acesso ao portal não autorizado);
registrar a conferência antes de usar com alunos reais. A Missão está
marcada **pendente de revisão docente**.

## 6. Substituir o planejamento provisório pelo real

O planejamento é `school_curriculum_plans` (escola × ano letivo × série
× período × componente × habilidade, `status`). Para trocar:

1. A escola informa, por série e período, componentes e habilidades.
2. A carga grava linhas com `status = 'approved'` (as provisórias podem
   ser substituídas no mesmo ano letivo).
3. Diagnósticos novos passam a nascer sem a marca de provisório (o banco
   calcula a marca a partir das listas). Diagnósticos já publicados
   mantêm o registro de como nasceram.

Bloqueio: **falta o planejamento real da escola** (decisão pedagógica).

## 7. Validação

| Suíte | Resultado | Cobre |
|---|---|---|
| `npm test` | 455/455 | Regras `diag-v1` e `plano-v1` (200 combinações de disponibilidade sem estouro), dados ausentes, evidência insuficiente, planejamento da escola, serviço do plano |
| `npm run test:pilot` | 79/79 | `tests/pilot/study.test.mjs`: retomada após interrupção; incorreta ≠ branco ≠ pendente; banco recusa estouro, dia indisponível, origem falsa e alteração do histórico; colega, outra escola e gestão não alteram; professor da turma ajusta |
| `npm run test:homologacao` | 58/58 | `tests/e2e/diagnostico-e-plano.test.mjs` (9 passos pela rede, incluindo Missão 02 com os dois eixos avaliados e outra escola sem acesso) + suítes anteriores |
| `migrations:check` | 22 válidas; recusa `0016_item_bank` | |
| `tsc`, `lint` | sem erros (3 avisos anteriores) | |
| Telas 390 e 1280 px | sem rolagem horizontal | diagnóstico, etapa, plano, painel docente, plano do aluno (professor), Missão 02 |

Ambiente local efêmero (PostgreSQL + PostgREST). **Não mede capacidade
da Vercel**; as reprovações de latência de 28/09 continuam registradas
(`00-inventario-2026-10-03.md`).

## 8. Limitações editoriais e curriculares

- Diagnóstico **demonstrativo**: questões sintéticas, aprovadas no fluxo
  por conta sintética de gestão — **pendentes de revisão docente**.
- 40 itens do lote: em revisão no sistema; 1 por habilidade na 1ª série.
- Planejamento **provisório** (1 habilidade por área).
- Missão 02: pendente de revisão docente; conferência de EM13CHS106 no
  portal do MEC pendente.
- Referencial de competências em IA **provisório**.
- 2ª e 3ª séries: o modelo aceita, mas não há conteúdo.

## 9. Demonstração

```
cd app
npm ci
npm run demo:dois-eixos
```

Endereço: `http://127.0.0.1:3016/entrar` (Podman necessário). O script
imprime o arquivo de contas sintéticas e o roteiro (dois eixos +
diagnóstico e plano).

## 10. Próximo incremento recomendado

Revisão docente, no sistema, dos itens da 1ª série (lote piloto + novos
itens até ≥ 3–4 por habilidade do planejamento real), para liberar o
**primeiro diagnóstico não demonstrativo**; junto, a carga do
planejamento real da escola.
