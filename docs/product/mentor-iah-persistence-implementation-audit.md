# Auditoria de Implementação — Persistência do MentorIAH (primeira fatia)

Documento de produto/engenharia — auditoria de leitura do código pendente (não commitado) que implementa a primeira fatia de persistência do MentorIAH: sessão + mensagens, sem síntese pedagógica, sugestão de nota, validação docente ou painel do professor. Nenhum arquivo de código, migration ou banco foi alterado para produzir este documento; a migration auditada não foi aplicada.

## 1. Escopo auditado

Branch `feature/mentor-persistence-summary-grade-mvp`, working tree no estado em que a auditoria foi solicitada:

- `app/src/components/mentor/mentor-iah.tsx` (modificado)
- `app/src/modules/mentor/index.ts` (modificado)
- `app/src/modules/mentor/infrastructure/demo-mentor-provider.ts` (modificado)
- `app/src/modules/mentor/domain/mentor-session.ts` (novo)
- `app/src/modules/mentor/domain/repositories.ts` (novo)
- `app/src/modules/mentor/infrastructure/database/database-repositories.ts` (novo)
- `app/src/modules/mentor/infrastructure/mentor-actions.ts` (novo)
- `app/src/modules/mentor/infrastructure/repository-factory.ts` (novo)
- `app/src/modules/mentor/infrastructure/seed/seed-repositories.ts` (novo)
- `app/src/modules/mentor/services/mentor-session-service.ts` (novo)
- `app/supabase/migrations/20260727000100_mentor_sessions.sql` (novo)
- `app/tests/mentor-session-persistence.test.mjs` (novo)

`git status`, `git diff --stat` e `git diff --check` confirmam exatamente este conjunto (nenhum arquivo a mais, nenhum a menos) e nenhum erro de espaço em branco. Nenhum documento já commitado (`docs/product/*.md` da nomenclatura oficial, commit `5709843`) foi tocado novamente.

## 2. Arquitetura encontrada

Módulo `modules/mentor` ganhou uma camada de persistência própria, seguindo exatamente o mesmo padrão já estabelecido em `modules/platform` e `modules/assessment` (D-023): `domain/` (entidades + contratos de repositório) → `infrastructure/` (`seed/` em memória, `database/` Supabase via service role, `repository-factory.ts` decidindo entre as duas) → `services/` (`mentor-session-service.ts`, orquestra sessão + mensagens) → `infrastructure/mentor-actions.ts` (Server Actions, `"use server"`, derivam identidade da sessão autenticada) → `components/mentor/mentor-iah.tsx` (cliente, consome as Server Actions).

Isolamento de módulo (D-001) respeitado: `MentorSession`/`MentorMessageRecord` são entidades próprias de `modules/mentor`, não foram adicionadas às 13 entidades de `modules/platform`. O `mentor-session-service.ts` só importa `MissionAssignment` (tipo) de `modules/platform` para a função pura `findAssignmentForMission` — dependência de leitura, não de escrita, aceitável.

## 3. Modelo de dados

Migration `20260727000100_mentor_sessions.sql` cria duas tabelas:

**`mentor_sessions`** — `id` (PK, texto determinístico `mentor-session-{institutionId}-{assignmentId}-{studentId}`), `institution_id` → `institutions`, `mission_id` → `missions`, `assignment_id` → `mission_assignments`, `student_id` → `students`, `mentor_version`, `status` (`active`/`completed`, CHECK), `started_at`, `updated_at`, `completed_at` (opcional), `maximum_support_level` (opcional), `requires_teacher_intervention` (boolean, default `false`), `created_at`. `unique (student_id, assignment_id)`. Índices em `institution_id`, `assignment_id`, `student_id`.

**`mentor_messages`** — `id` (PK), `institution_id` → `institutions`, `session_id` → `mentor_sessions` (`on delete cascade`), `role` (`student`/`mentor`, CHECK), `content`, `pedagogical_stage`/`support_level` (opcionais), `created_at`, `sequence_number`. `unique (session_id, sequence_number)`. Índices em `institution_id`, `session_id`.

Tipos: texto + CHECK constraint para enums, igual a toda a base (nenhuma migration do projeto usa `enum` nativo do Postgres). Timestamps em `timestamptz`, coerente. `on delete cascade` de mensagens ao apagar a sessão é a única cascata do schema — apropriada e sem precedente contrário.

**Denormalização deliberada:** `mentor_sessions` carrega `mission_id` e `assignment_id` juntos, embora `mission_id` seja derivável de `mission_assignments.mission_id`. Não há checagem SQL cruzada garantindo que os dois sempre coincidam — a garantia é só de código (`mentor-actions.ts` deriva os dois do mesmo `assignment` resolvido). Mesmo padrão de confiança na camada de serviço que o resto do schema já usa (`mission_reviews.classroom_id`, por exemplo, também não tem FK composta contra instituição) — não é uma lacuna nova, é o padrão já documentado em D-023/D-041.

**Reversibilidade conceitual:** comentário de rollback manual ao final (`drop table mentor_messages; drop table mentor_sessions;`, ordem de dependência correta) — mesmo formato exato das migrations 0006 e 0010.

**Compatibilidade com o padrão existente:** nomenclatura de colunas (`snake_case`), aviso "NÃO APLICADA AUTOMATICAMENTE", nenhum `insert`, RLS habilitada sem políticas — todos idênticos às 11 migrations anteriores.

## 4. RLS e autorização

RLS habilitada em `mentor_sessions` e `mentor_messages`, **sem nenhuma política permissiva** — mesmo modelo deny-by-default de toda a base (D-041): `anon`/`authenticated` não leem nem escrevem nada; o acesso é exclusivamente via `service_role`, só no servidor (`getSupabaseAdminClient()`, reaproveitado de `modules/platform`, nunca instanciado fora de `database-repositories.ts`, nunca em modo demonstração). Este é o comportamento correto e deliberado do projeto — políticas RLS por tenant só seriam criadas se houvesse acesso direto do navegador ao banco, que não existe aqui (D-023: "política não exercida não é criada").

Verificação item a item:

| Item | Resultado |
|---|---|
| Aluno acessa só as próprias sessões | ✅ `findActiveByAssignment` filtra por `studentId` derivado da sessão autenticada |
| Aluno acessa só as próprias mensagens | ✅ `listMessages`/`listBySession` só recebem o `sessionId` já resolvido para o aluno autenticado |
| Outro estudante não acessa a sessão | ✅ `sendMentorMessageAction` recalcula a sessão correta via `getOrCreateSession(scope)` e rejeita se o `sessionId` do cliente não bater — testado (`mensagens não são visíveis fora da instituição correta...`, isolamento por estudante) |
| Outra instituição não acessa os registros | ✅ toda leitura/escrita filtra por `institutionId`; testado explicitamente |
| IDs do cliente não são confiados sem validação | ✅ `sessionId` do cliente é sempre confrontado com o `sessionId` derivado do servidor antes de qualquer escrita |
| Instituição resolvida no servidor | ✅ `workspace.institution.id`, nunca parâmetro do cliente |
| Atribuição pertence ao aluno autenticado | ✅ resolvida via `missionAssignments.listByClassroom(institutionId, classroomId)` da turma do próprio aluno, nunca por id arbitrário vindo do cliente |
| Missão pertence à instituição correta | ⚠️ `missions` é catálogo global sem `institution_id` (exceção deliberada, D-023) — o isolamento real vem da atribuição (`mission_assignments`, tenant-scoped), não da missão em si. Comportamento esperado do schema, não uma lacuna desta fatia. |
| Service role não usada desnecessariamente | ✅ só instanciada dentro de `database-repositories.ts`, só quando `isAuthConfigured()` |

**Riscos classificados:**

- **Baixo** — `content` da mensagem não tem limite de tamanho validado no servidor (só `maxLength={600}` no `<textarea>`, contornável chamando a Server Action diretamente). Não é uma falha de isolamento, é um vetor de abuso de armazenamento sem controle de quota.
- **Baixo** — janela de corrida em `mentor_messages.append` (implementação `database`): entre checar se o `id` já existe, calcular `sequence_number` (max+1) e inserir, duas escritas verdadeiramente concorrentes na mesma sessão (ex.: o mesmo aluno com duas abas abertas enviando ao mesmo instante) podem colidir no `unique(session_id, sequence_number)` com um `id` diferente do que está sendo tratado como "já existe" — o código só re-consulta por `id`, não por esse conflito específico, e nesse caso a chamada falha com erro genérico em vez de se recuperar sozinha. Não há duplicação nem corrupção de dado (a constraint do banco impede isso), só uma falha visível ao aluno num cenário raro. Detalhado na Seção 8.

## 5. Fluxo de persistência

1. **Abrir o Mentor** (`openMentorSessionAction`) → resolve `institutionId`/`studentId`/`assignmentId` da sessão autenticada → `getOrCreateSession` (reaproveita se já existir) → `listMessages` em ordem (`sequence_number`) → cliente mostra saudação só se a lista vier vazia.
2. **Enviar mensagem** (`sendMentorMessageAction`) → revalida a sessão do aluno → persiste a mensagem do estudante (`append`, id gerado no cliente via `crypto.randomUUID()`) → chama `demoMentorProvider.sendMessage` → persiste a resposta (`append`, id `${clientMessageId}-reply`) → `touch` no `updated_at` da sessão → devolve as duas mensagens ao cliente, que atualiza a UI.

A ordem "persistir aluno → acionar Mentor → persistir resposta" é exatamente a exigida — a mensagem do aluno está gravada **antes** de qualquer chance de falha do provedor.

**Regra de sessão ativa (Fase 4):** confirmada — `unique (student_id, assignment_id)` no banco + `id` determinístico do lado do código fazem de "uma sessão por aluno×atribuição" uma garantia dupla (constraint física + convergência de id). Reabrir a Missão sempre localiza a mesma sessão (testado); nenhuma sessão nova é criada a cada abertura do painel (o carregamento só ocorre uma vez por montagem do componente, guardado por `sessionLoadStartedRef`).

**Nota de compatibilidade futura:** a constraint `unique (student_id, assignment_id)` impede *qualquer* segunda linha para o mesmo par, não só uma segunda sessão **ativa** — hoje isso é exatamente o comportamento certo, porque esta fatia nunca encerra uma sessão (`status` nunca sai de `active`). Quando uma fatia futura implementar encerramento + nova sessão para o mesmo par, essa constraint precisará virar um índice único parcial (`where status = 'active'`). Risco **baixo** hoje, vira bloqueio arquitetural conhecido no dia em que "encerrar sessão" for implementado — vale registrar para não ser redescoberto do zero.

**Idempotência:** `clientMessageId` gerado uma única vez no cliente e reaproveitado em cada tentativa de reenvio — `append` idempotente por `id` em ambas as implementações (seed e database). Testado (`falha ao persistir a resposta do Mentor não perde a mensagem do estudante já enviada`).

## 6. Tratamento de falhas

| Cenário | Comportamento observado |
|---|---|
| Mensagem do aluno salva, provedor falha | Mensagem já persistida no servidor (passo 1 ocorre antes do passo 2); UI mostra erro amigável com "Tentar novamente", mensagem do aluno permanece visível — nunca afirma sucesso que não ocorreu |
| Provedor responde, gravação da resposta falha | A ação inteira rejeita; a mensagem do aluno já persistida não é reprocessada no retry (idempotente); a resposta do Mentor, se gerada mas não salva, é regenerada no retry (aceitável — motor determinístico, sem custo real) |
| Requisição repetida | `append` idempotente por `id` em ambas implementações — sem duplicata |
| Sessão não existe | `getOrCreateSession` cria; nunca "não existe" para o próprio fluxo — só existiria uma sessão de *outro* aluno, e nesse caso o `id` não bateria (ver Seção 4) |
| Atribuição não existe | `requireMentorScope` lança erro explícito ("Esta Missão ainda não foi atribuída à sua turma"); testado (`findAssignmentForMission`) e validado ao vivo na tarefa anterior (POST 500 tratado sem quebrar a página) |
| Usuário não autorizado | Papel ≠ aluno, sem `studentId`, sem turma ou `sessionId` não correspondente → erro explícito, nunca leitura/escrita |
| Motor determinístico de demonstração | Passa pela mesma `mentor-session-service.ts` que um provedor real usaria — nenhum caminho de armazenamento paralelo (Fase 6 confirmada) |

Nenhum cenário faz a interface afirmar que uma mensagem foi salva quando não foi — o estado `"error"` só aparece quando a chamada de fato rejeitou, e a mensagem do aluno some da tela **somente** se ela nunca tiver sido adicionada ao estado local (o que só acontece se o próprio `sendMessage` retornar antes do `setMessages` otimista, o que não ocorre no fluxo normal).

**Achado (Fase 6, componente):** se o aluno, depois de uma falha, digitar e enviar uma mensagem **nova** em vez de clicar "Tentar novamente", o botão de reenvio da mensagem antiga desaparece (o estado de erro é único, não por mensagem) — a mensagem antiga **não se perde** (já está persistida) e continua visível no histórico, mas fica permanentemente sem resposta do Mentor a menos que seja reenviada manualmente. Risco **baixo** (comportamento comum em apps de chat; não é perda de dado, é uma lacuna de UX).

## 7. Cobertura de testes

`app/tests/mentor-session-persistence.test.mjs`, 13 blocos cobrindo os 15 itens pedidos (dois pares combinados em um teste cada):

| # | Cenário | Coberto |
|---|---|---|
| 1 | Criação de sessão | ✅ |
| 2 | Reutilização | ✅ |
| 3 | Sessão duplicada | ✅ (idempotência sequencial: criar duas vezes não duplica) |
| 4 | Isolamento entre estudantes | ✅ |
| 5 | Isolamento institucional | ✅ |
| 6 | Ordenação das mensagens | ✅ |
| 7 | Persistência da mensagem do aluno | ✅ (combinado com #8) |
| 8 | Persistência da resposta do MentorIAH | ✅ (combinado com #7) |
| 9 | Reabertura | ✅ |
| 10 | Saudação não duplicada | ✅ (na camada de dados — a ausência/presença de histórico, que é o que o componente usa para decidir) |
| 11 | Falha de persistência | ✅ |
| 12 | Atribuição inexistente | ✅ |
| 13 | Acesso não autorizado | ✅ |
| 14 | Fallback determinístico | ✅ (usa `demoMentorProvider` real, sem mock) |
| 15 | Concorrência ou idempotência | ⚠️ **Parcial** — idempotência (mesmo `id`, chamadas sequenciais) testada; concorrência verdadeira (`Promise.all` em escritas simultâneas) não testada. A implementação `seed` é single-threaded por construção (sem `await` entre checagem e escrita — não há corrida possível nela), e a implementação `database` — onde a corrida real existe (Seção 4) — nunca é exercitada por nenhum teste do projeto (nenhuma credencial Supabase neste ambiente, mesma limitação de todos os outros repositórios `database` da base). Gap estrutural do projeto, não desta fatia especificamente. |

## 8. Riscos encontrados

| Risco | Severidade | Descrição |
|---|---|---|
| Corrida em `sequence_number` (implementação database) | **Médio** | Duas escritas verdadeiramente concorrentes na mesma sessão podem colidir sem recuperação automática — falha visível ao aluno, sem duplicação/corrupção. Só relevante em modo real, com múltiplas abas/dispositivos simultâneos. |
| `unique(student_id, assignment_id)` não escopado a `status = 'active'` | **Baixo** | Correto hoje (nenhuma sessão jamais sai de `active`); vira bloqueio de schema quando uma fatia futura implementar encerramento de sessão. |
| Sem limite de tamanho de `content` no servidor | **Baixo** | Só validado no cliente (`maxLength`), contornável fora da UI. |
| Retry de mensagem específica se perde após novo envio | **Baixo** | UX, não integridade — mensagem permanece persistida e visível. |
| Cobertura de concorrência real ausente | **Baixo–Médio** | Estrutural do projeto (nenhum teste toca a implementação `database` de nenhum módulo); não é uma lacuna introduzida por esta fatia. |

Nenhum risco **crítico** ou **alto** foi encontrado. Nenhuma falha de isolamento entre alunos ou instituições. Nenhum dado sensível fora do necessário. Nenhuma confiança indevida em dado vindo do cliente.

## 9. Bloqueadores para aplicar a migration

Nenhum bloqueador técnico. A migration é aditiva, seu formato é idêntico ao das 11 anteriores já aplicadas (segundo a documentação do projeto), tem rollback manual documentado, e RLS segue o mesmo padrão deny-by-default de toda a base. Aplicar localmente não requer nenhuma correção prévia de código — os riscos da Seção 8 são de robustez/UX futura, não de correção ou segurança imediata.

Único ponto de atenção antes de qualquer uso real (não desta auditoria): a implementação `database` nunca foi exercitada contra um projeto Supabase de verdade (mesma ressalva que `docs/PERSISTENCE.md` já registra para todo o modo real do projeto) — a auditoria de código não substitui uma validação ao vivo após a migration ser aplicada.

## 10. Recomendação final

**Aplicar.** A implementação está tecnicamente correta, segura (isolamento por aluno/instituição comprovado por código e por teste) e consistente com a arquitetura já estabelecida do projeto. Os riscos identificados são baixos/médios, não bloqueiam o uso local, e ficam registrados para tratamento numa fatia futura (índice único parcial por `status = 'active'`, tratamento de corrida em `sequence_number`, limite de tamanho de mensagem no servidor, teste de concorrência real quando houver ambiente Supabase disponível).

## Validação local da migration

**Data:** 2026-07-27.

**Ambiente local:** não confirmado como Supabase local — bloqueado antes de qualquer aplicação (ver abaixo). `git status` confirmou a branch `feature/mentor-persistence-summary-grade-mvp` e o conjunto de arquivos pendentes esperado, sem alterações adicionais.

**Migration aplicada:** **não.** A Fase 1 (confirmação do ambiente) não conseguiu estabelecer com segurança que existe um banco Supabase *local* neste projeto:

- Não existe `app/supabase/config.toml` — arquivo indispensável para `supabase start` (stack local via Docker). Sem ele, não há como o CLI subir um Postgres local.
- Nem o Supabase CLI (`supabase`) nem o Docker estão instalados neste ambiente (`command not found` para ambos) — mesmo que `config.toml` existisse, não haveria como executar uma stack local aqui.
- `app/supabase/.temp/` contém `linked-project.json`, `project-ref` e `pooler-url` — evidência de que este repositório já foi vinculado (`supabase link`) a um **projeto remoto** na nuvem. Nenhum desses arquivos foi aberto além da listagem de nomes, para não expor identificadores do projeto.
- `docs/SUPABASE.md` — o único procedimento de aplicação de migration já documentado pelo projeto — descreve explicitamente executar o SQL no **SQL Editor do Supabase**, no console web, contra o projeto criado em supabase.com. Não existe, em nenhum lugar do repositório, um procedimento alternativo para um banco local.
- Confirmar para onde `NEXT_PUBLIC_SUPABASE_URL` aponta exigiria abrir `app/.env.local`, expressamente proibido nesta tarefa.

Diante disso, a única forma **realmente disponível** de "aplicar a migration" neste projeto (SQL Editor do console, ou `supabase db push` contra o link já existente) aponta para o projeto remoto — exatamente o destino que esta tarefa proíbe. Seguindo a instrução explícita da tarefa ("caso não seja possível confirmar com segurança que o banco é local: pare; não aplique a migration; informe o bloqueio"), a aplicação foi interrompida na Fase 1. Fases 2 a 6 (aplicação, validação estrutural no banco, teste ao vivo, isolamento entre contas reais, falhas controladas contra o banco) não foram executadas — todas dependem de uma migration aplicada.

**Tabelas confirmadas:** nenhuma — não há banco local acessível para consultar.

**Teste de persistência / teste após reload / duplicação / isolamento / falhas controladas:** não executados ao vivo por ausência de ambiente local aplicável — ficam como estavam na auditoria de código anterior (Seções 3–8 deste documento), que já cobriram estes pontos por leitura de código e por teste automatizado (`node --test`), não por execução contra um banco real.

**Limitações da validação:** esta rodada validou apenas o que independe de banco de dados — estado do repositório (Fase 1) e a suíte técnica completa (Fase 7: lint, TypeScript, build, testes), todos limpos. Nenhuma validação ao vivo contra Postgres foi possível nem tentada, por não existir ambiente local neste projeto — não por falha de execução.

**Decisão final:** migration **não aplicada** neste ambiente. Para concluir esta validação, é necessário um dos dois caminhos, decidido por quem tem acesso ao projeto Supabase:

1. Inicializar uma stack Supabase genuinamente local (`supabase init` + `config.toml` + `supabase start`, exigindo Docker) e aplicar a migration só ali; ou
2. Aplicar deliberadamente no projeto remoto já vinculado, pelo procedimento já documentado em `docs/SUPABASE.md` (SQL Editor) — o que deixa de ser "validação local" e exige autorização explícita própria, fora do escopo desta tarefa.

---

Esta auditoria não alterou código, migration, banco ou `.env.local`. Nenhum commit foi criado.
