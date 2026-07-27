# Auditoria de Prontidão Operacional — MVP IAH Educacional

Auditoria somente de leitura — nenhum código, tela, migration ou banco foi alterado para produzir este documento. As duas alterações pendentes no working tree (`components/mentor/mentor-iah.tsx`, `docs/product/mentor-iah-fluxo-pedagogico-mvp.md`) não foram tocadas, descartadas nem commitadas. `.env.local` não foi aberto nem exibido em nenhum momento.

## 1. Resumo executivo

O MVP tem um núcleo sólido e bem testado (autenticação, controle de acesso por perfil, isolamento institucional, geração de material do DocentIAH, tratamento de erro/fallback de IA) — build, lint, TypeScript e a suíte de 197 testes de domínio passam limpos. Não é, porém, demonstrável **sem ressalvas** hoje: o MentorIAH está atrás de uma feature flag desligada neste ambiente e nunca foi validado ao vivo; a reabertura de planejamentos gerados pelo Planejador Conversacional (Plano de aula, Infográfico, Mapa mental) não existe; e a produção/reflexão real do aluno na Missão persiste só em `localStorage` do dispositivo, não no banco, mesmo com o modo real ativo. Nenhum desses três pontos impede uma demonstração **bem roteirizada** (evitando esses caminhos), mas todos impedem uma demonstração **livre/interativa** sem risco.

## 2. Estado do repositório

- **Branch atual:** `feature/docentiah-conversational-planner`.
- **Working tree:** limpo, exceto as duas alterações pendentes já sinalizadas pelo usuário (não tocadas nesta auditoria).
- **Estrutura da aplicação:** Next.js App Router, dois grupos de rotas — `(marketing)` (Landing, `/demonstracao`, `/contato`) e `(platform)` (autenticada: `/dashboard`, `/missoes`, `/diario`, `/avaliacoes`, `/professor/*`, `/direcao/*`, `/coordenacao/*`, `/mantenedor/*`) — mais `/entrar` fora dos dois grupos. 58 arquivos `page.tsx` mapeados.
- **Perfis de usuário:** `teacher` (professor), `student` (aluno), `maintainer`, `director`, `pedagogical_coordinator` — cada um com menu e home próprios (`roleHome()`), sem papel "gestor" genérico (D-046).
- **Autenticação:** dois modos mutuamente exclusivos por uma única flag (`isAuthConfigured()` = `AUTH_SECRET` + Supabase configurados): modo demonstração (cookie httpOnly local, senha única visível na tela) e modo real (Auth.js v5 Credentials + Google opcional, sessão JWT). Confirmado empiricamente nesta sessão que o modo **real está ativo** neste ambiente (login bem-sucedido como professor e como aluno contra o banco real).
- **Banco de dados:** Supabase/PostgreSQL, acessado exclusivamente pelo servidor via `service_role` (D-041) — nunca exposto ao cliente.
- **Migrations:** 11 arquivos em `supabase/migrations/`, a mais recente `20260724001500_docentiah_planner_materials.sql`. O comentário no código (`domain/entities.ts`) afirma que essa migration "existe mas não foi aplicada"; **isso está desatualizado** — o salvamento de `lesson_plan`/`infographic`/`mind_map` foi exercitado ao vivo nesta mesma linha de trabalho contra o banco real e funcionou, o que só é possível se a migration já estiver aplicada. Documentação (`STATUS.md`) também afirma "este ambiente não tem projeto Supabase" — igualmente desatualizado frente à evidência empírica desta sessão.
- **Seeds:** seeds em memória por módulo (`platform`, `workspace`, `docentiah`, `curriculum`, `knowledge`) para o modo demonstração; nenhum seed é gravado no banco real automaticamente.
- **Testes existentes:** 25 arquivos, 197 casos, `node --test` (nativo, sem Jest/Vitest). Cobrem: autorização/isolamento (docentiah, assessment, conexões IAH), geração determinística de material, extração de brief, circuit breaker/resiliência de IA, anonimização de dados pessoais, limites de uso diário, feature flags.
- **Framework de teste de interface:** nenhum configurado (sem Playwright, sem Cypress, sem `jsdom`/`@testing-library`) — a suíte inteira é lógica de domínio, sem renderização de componente.
- **Integrações de IA:** um único gateway (`lib/ai/gateway.ts`) roteia por capability; só `docentiah.improve_context` pode ir para a DeepSeek real (`IAH_AI_DEEPSEEK_ENABLED`), com wrapper resiliente (circuit breaker + fallback para o motor demonstrativo); todas as outras capabilities (slides, plano de aula, avaliação, conexões IAH, MentorIAH) usam sempre o motor determinístico/demonstrativo, mesmo com a flag da DeepSeek ligada (confirmado por teste).
- **Componentes do DocentIAH:** grade de tarefas clássica (padrão, sempre disponível) + Planejador Conversacional (`docente-iah/planejador/`, atrás de `NEXT_PUBLIC_FEATURE_DOCENTIAH_CONVERSATIONAL_PLANNER` — **flag que esta mesma sequência de tarefas ligou manualmente**, com autorização do usuário, para permitir os testes já realizados; não foi desligada desde então).
- **Componentes do MentorIAH:** um componente único (`components/mentor/mentor-iah.tsx`), botão flutuante + painel de chat (desktop/mobile), atrás de `NEXT_PUBLIC_FEATURE_MENTOR_IAH` (**desligada** neste ambiente — confirmado ao vivo: o botão não é renderizado numa Missão real). Não implementa síntese pedagógica, microdefesa nem persistência de conversa — esses conceitos existem só como documento de produto (`docs/product/mentor-iah-*.md`), ainda sem código.
- **Fluxo de Missões:** lista → detalhe (9 microetapas: Capa, Contexto, Objetivo, Investigação com Dossiê de 4 evidências, Comparação, Produção, Critérios, Entrega, Reflexão) — confirmado ao vivo nesta sessão (login do aluno → Missões → Missão 01 → "Começar investigação" → Etapa 2 de 9 renderizada corretamente).
- **Persistência de dados:** dupla — DocentIAH (planos, slides, infográficos, mapas mentais) grava no Supabase real quando o modo real está ativo (confirmado); a Produção/Reflexão do aluno na Missão (`modules/classroom`) grava só em `localStorage` do dispositivo, por instituição+usuário+missão, **mesmo no modo real** — não migrou para o banco.
- **Tratamento de erros:** nenhum `error.tsx`/`not-found.tsx`/`global-error.tsx` customizado em nenhuma rota (comportamento padrão do Next.js, sem identidade da marca, em caso de exceção não tratada ou 404). Em contrapartida, os fluxos de IA têm tratamento de erro explícito e testado (gateway resiliente, mensagens nunca expõem segredo/config ao usuário).
- **Estados de loading e vazio:** nenhum `loading.tsx` de rota; estados vazios são tratados manualmente por componente (ex.: "Nenhuma Missão publicada" no dashboard do aluno, confirmado ao vivo; "Habilidades curriculares... não encontramos correspondência" no DocentIAH, honesto, sem inventar dado).

## 3. Funções operantes

Confirmadas por evidência direta (execução ao vivo nesta sessão ou em sessões desta mesma linha de trabalho, teste automatizado, ou leitura de código sem ambiguidade de comportamento):

- Login e logout (modo real, professor e aluno).
- Redirecionamento por perfil (middleware + `authorized()` do Auth.js).
- Dashboard do professor (`/professor`, 3 cartões: Turmas, Missões, DocentIAH).
- Visualização de turmas (`/professor/turmas`).
- Visualização de missões (lista + as 9 etapas do Mission Flow).
- DocentIAH — Planejador Conversacional (extração, perfil da turma, honestidade sobre habilidades curriculares, Conexões IAH, geração de Plano de aula/Slides/Infográfico/Mapa mental).
- Salvamento de planejamento (confirmado persistindo no banco real).
- Reabertura de planejamento — **só para Apresentação de slides** (geração, salvamento, reabertura e reedição confirmados ao vivo).
- Acesso do aluno a uma missão.
- Isolamento entre instituições (código + testes automatizados).
- Controle de acesso por perfil (código + validação ao vivo: aluno redirecionado ao tentar `/professor`).
- Tratamento de erro da IA (testado: erros de configuração nunca vazam ao usuário).
- Fallback quando o provedor de IA falha (testado: circuit breaker abre e desvia para o motor demonstrativo).

## 4. Funções parciais

- **Dashboard do aluno** — renderiza corretamente e trata o estado vazio com honestidade, mas só foi observado com uma missão publicada e sem missão publicada; jornadas com múltiplas missões/turmas não foram exercitadas.
- **Criação e visualização de missões** — visualização plena; a criação (Estúdio de Missões, `/professor/estudio`) existe em código (biblioteca + editor de 6 etapas com autosave) e está documentada como validada em sprint anterior, mas **não foi reexecutada ao vivo nesta auditoria**; persiste em `localStorage`, não no banco.
- **Reabertura de planejamento** — operante só para Slides; Plano de aula, Infográfico e Mapa mental não têm tela de detalhe (achado já registrado em auditoria anterior desta mesma linha de trabalho, não corrigido até agora, fora do escopo desta tarefa).
- **Registro de tentativa do estudante / Persistência das interações** — o mecanismo existe e é usado em 4 telas (`local-student-work-store.ts`), mas não foi exercitado ao vivo nesta auditoria (nenhuma resposta foi registrada); e, mesmo quando funciona, persiste só no dispositivo, não no banco — um dado que hoje é apresentado como "modo real" ativo, mas cuja jornada do aluno continua com a mesma limitação do modo demonstração.
- **Tratamento de rota não autorizada** — o redirecionamento por papel funciona; a experiência de erro genérico (404/exceção) não tem tela própria da marca.
- **Responsividade básica** — fortemente documentada como validada em sprints anteriores (várias larguras, sem overflow) e parcialmente reconfirmada nesta linha de trabalho; não foi possível revalidar 375px ao vivo nesta auditoria especificamente (limitação da ferramenta de automação de navegador usada, não indício de regressão da aplicação).

## 5. Funções ausentes ou quebradas

- **MentorIAH** — componente de chat existe e parece bem construído, mas está atrás de uma flag desligada neste ambiente; **não foi possível validar nenhuma interação real** (a própria tarefa proíbe tocar `.env.local`). A síntese pedagógica para o professor e a microdefesa adaptativa — ambas especificadas em `docs/product/mentor-iah-fluxo-pedagogico-mvp.md` — **não existem em código**, só como documento de produto.
- **Síntese pedagógica para o professor** — não implementada (ver acima).
- **Reabertura de Plano de aula / Infográfico / Mapa mental** — não implementada (linhas da lista em "Meus materiais" sem link).
- **Tela de erro/404 com identidade da marca** — não existe.

## 6. Matriz de prontidão

| Função | Status | Evidência encontrada | Risco | Bloqueio p/ demo | Próximo ajuste necessário |
|---|---|---|---|---|---|
| 1. Login e logout | Operante | Login real bem-sucedido como professor e aluno nesta sessão; `middleware.ts`/`auth.config.ts` | Baixo | Não | — |
| 2. Redirecionamento por perfil | Operante | `roleHome()`, `authorized()`, redirecionamento observado ao vivo | Baixo | Não | — |
| 3. Dashboard do professor | Operante | `/professor` renderizado com dados reais (Fabio Ege, 5 turmas, 10 alunos) | Baixo | Não | — |
| 4. Dashboard do aluno | Parcialmente operante | `/dashboard` renderizado, estado vazio honesto | Baixo | Não | Validar com múltiplas missões/turmas |
| 5. Visualização de turmas | Operante | `/professor/turmas` com 5 turmas reais | Baixo | Não | — |
| 6. Criação e visualização de missões | Parcialmente operante | Visualização confirmada; criação só por código/documentação, não reexecutada | Médio | Não, se o roteiro evitar criar missão ao vivo | Reexecutar criação de missão no Estúdio ao vivo |
| 7. DocentIAH | Operante (condicional) | Fluxo completo testado ponta a ponta; depende de flag ligada manualmente | Médio | Sim, se a flag for revertida sem aviso | Decidir se a flag fica ligada por padrão para a demo |
| 8. Salvamento de planejamento | Operante | Persistência real confirmada (Supabase) | Baixo | Não | — |
| 9. Reabertura de planejamento | Parcialmente operante | Slides: completo. Plano de aula/Infográfico/Mapa mental: sem tela de detalhe | Alto | Sim, se o roteiro tentar reabrir esses 3 tipos | Construir tela de detalhe para os 3 tipos |
| 10. MentorIAH | Não foi possível validar | Componente existe; flag desligada; não exercitado | Crítico | Sim | Ligar a flag e validar a conversa ao vivo antes de qualquer demo que o inclua |
| 11. Acesso do aluno a uma missão | Operante | Fluxo completo até "Etapa 2 de 9" confirmado ao vivo | Baixo | Não | — |
| 12. Registro de tentativa do estudante | Parcialmente operante | Código existe e é usado em 4 telas; não exercitado nesta auditoria | Médio | Não, se não testado ao vivo na demo | Validar autosave/entrega ao vivo antes da demo |
| 13. Persistência das interações | Parcialmente operante | DocentIAH: banco real. Missão do aluno: `localStorage` do dispositivo | Alto | Sim, para demo entre dispositivos diferentes | Decidir se isso é aceitável para a demo ou requer migração a banco |
| 14. Síntese pedagógica para o professor | Não implementada | Só existe como documento de produto | Alto | Sim, se prometida na demo | Implementar ou remover da promessa da demo |
| 15. Isolamento entre instituições | Operante | `institution_id` em todo schema; `assertMaterialOwnership`; testes automatizados | Baixo | Não | — |
| 16. Controle de acesso por perfil | Operante | Middleware + `authorized()`; aluno bloqueado de `/professor` ao vivo | Baixo | Não | — |
| 17. Tratamento de rota não autorizada | Parcialmente operante | Redirecionamento por papel funciona; sem tela 404/erro com marca | Médio | Não | Criar `not-found.tsx`/`error.tsx` com a identidade da marca |
| 18. Tratamento de erro da IA | Operante | Testado; erro de config nunca exposto ao usuário | Baixo | Não | — |
| 19. Fallback quando IA falha | Operante | Circuit breaker + fallback testados (12 casos) | Baixo | Não | — |
| 20. Responsividade básica | Parcialmente operante | Documentada como validada em sprints anteriores; não revalidada 375px nesta auditoria | Médio | Não | Revalidar 375px ao vivo antes da demo |

## 7. Bloqueadores críticos

1. **MentorIAH sem validação ao vivo** — se a demonstração institucional incluir o MentorIAH, isso é hoje um bloqueador crítico: a flag está desligada e nenhuma conversa real foi observada nesta linha de trabalho.
2. **Reabertura ausente para Plano de aula/Infográfico/Mapa mental** — qualquer roteiro que planeje "gerar, salvar, fechar e reabrir" um desses 3 tipos vai travar publicamente.
3. **Síntese pedagógica para o professor inexistente em código** — se a demonstração prometer esse recurso (documentado em `docs/product/mentor-iah-fluxo-pedagogico-mvp.md`), não há nada para mostrar.

## 8. Riscos de demonstração

- **Persistência do aluno em `localStorage`**: uma demonstração que troque de navegador/dispositivo no meio perde o progresso do aluno na Missão — risco alto se não for evitado no roteiro.
- **Flag do DocentIAH Conversacional**: a experiência "nova" (chat) só aparece porque uma flag foi ligada manualmente numa tarefa anterior; se alguém resetar o ambiente sem saber disso, a home do DocentIAH volta silenciosamente para a grade antiga — risco médio, fácil de mitigar documentando a dependência.
- **Sem tela de erro/404 com marca**: qualquer link quebrado ou rota digitada errada durante uma demo ao vivo mostra a página padrão do Next.js — risco médio, baixo custo de correção.
- **Migration/documentação desatualizada** (`entities.ts`, `STATUS.md`) descrevendo o banco real como não aplicado/não existente, quando a evidência empírica desta sessão mostra o contrário — risco de alguém tomar decisão errada confiando na documentação desatualizada.
- **Ausência de testes de interface**: nenhuma regressão visual/de fluxo é pega automaticamente; toda validação de UI depende de execução manual.

## 9. Resultado de lint, TypeScript, build e testes

- **`npm run lint`**: limpo, sem erros nem avisos.
- **`npx tsc --noEmit`**: limpo, sem erros.
- **`npm run build`**: limpo, `exit code 0`, todas as rotas compiladas.
- **Suíte de testes (`node --test`)**: **197/197** aprovados, 0 falhas, 25 arquivos. Nenhum framework de teste de interface (Playwright/Cypress) configurado para executar.

## 10. Ordem recomendada de correção

1. Ligar `NEXT_PUBLIC_FEATURE_MENTOR_IAH` e validar a conversa do MentorIAH ao vivo (ou remover o MentorIAH do roteiro da demo até validar).
2. Construir a tela de detalhe/reabertura para Plano de aula, Infográfico e Mapa mental (ou remover "reabrir" do roteiro da demo para esses 3 tipos).
3. Decidir e comunicar explicitamente o que fazer com a Síntese pedagógica para o professor: implementar antes de prometer, ou retirar da promessa da demonstração.
4. Validar ao vivo, uma vez, a criação de uma nova Missão no Estúdio e o registro de uma tentativa do aluno (autosave/entrega) — hoje sustentados só por código e por documentação de sprints anteriores.
5. Corrigir `docs/DOMAIN_MODEL.md`/`entities.ts`/`STATUS.md` para refletir que o banco real está de fato ativo e a migration do Planejador Conversacional está aplicada — evita decisão errada por confiar em documentação desatualizada.
6. Criar `not-found.tsx`/`error.tsx` com a identidade da marca.
7. Revalidar responsividade em 375px ao vivo antes da demonstração.
