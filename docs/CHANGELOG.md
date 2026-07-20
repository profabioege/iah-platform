# Changelog — IAH Educacional

Histórico de entregas em ordem cronológica reversa. Cada entrada corresponde a uma Sprint ou tarefa concluída. Para o estado atual, ver `STATUS.md`; para o histórico de decisões arquiteturais, ver `DECISIONS.md`.

## 19/07/2026 — Estabilização do build Next.js

Correção estritamente técnica, sem alteração funcional, arquitetural ou de UX.

- **Causa raiz:** `next/font/google` tentava buscar Geist e Geist Mono durante
  o build; o acesso HTTPS ao Google Fonts não estava disponível e os timeouts
  anteriores deixavam processos filhos do compilador ativos.
- **Correção mínima:** o layout raiz deixou de inicializar fontes remotas e os
  tokens tipográficos passaram a usar a pilha local já prevista (`Arial`,
  `Helvetica`, `ui-monospace`). O cache gerado foi reconstruído do zero.
- **Resultado:** build limpo com debug em 40,85 s; build padrão final em 29,86
  s; versão de produção pronta em 831 ms.
- **Validação:** ESLint e TypeScript sem emissão aprovados; 25 páginas geradas;
  rotas públicas, autenticação e rotas principais de Gestor, Professor e Aluno
  aprovadas; console do navegador e stderr do servidor sem erros.

## 19/07/2026 — Product Experience · Epic 01: Executive Experience (D-040)

O antigo hub institucional de `/gestor` foi substituído pelo Dashboard
Executivo aprovado para a principal demonstração comercial do IAH.

- **Leitura imediata:** diagnóstico executivo, implantação em destaque, atenção
  da semana e quatro indicadores centrais.
- **Cinco visões:** Visão geral, Implantação, Professores, Alunos e Disciplina,
  alternadas localmente sem nova rota ou dependência.
- **Dados existentes:** números calculados a partir do Workspace e do seed
  institucional; nenhum analytics, banco ou integração fabricados.
- **Privacidade:** camada executiva apresenta dados agregados, sem lista ou
  produção individual de alunos.
- **Design System preservado:** somente tokens semânticos e cores `chart-*` já
  existentes; nenhuma cor literal ou nova primitiva.
- **Validação:** desktop e mobile (375px), navegação entre visões, console
  limpo, lint e TypeScript aprovados.

## 19/07/2026 — Ambiente Institucional Neutro para Demonstração (D-039)

Toda referência ao Colégio Beryon no ambiente de demonstração passa a ser **Instituto Horizonte** (instituição fictícia, `institutohorizonte.edu.br`) — o produto deixa de exibir nome/dados de um cliente real em demonstrações a outros prospects.

- **`DEMO_INSTITUTION`** (fonte institucional única, `modules/platform/seeds/demo-seed.ts`): `id`/`slug`/`name`/`domain` atualizados; ids derivados (`year-horizonte-2026`, `student-horizonte-NN`, `enroll-horizonte-NN`) e senha de demonstração (`horizonte2026`) acompanham.
- **Professor real mantido**: Fabio Ege, agora `fabio.ege@institutohorizonte.edu.br`.
- **Propagação automática**: como toda a Plataforma já lia `Institution.name`/`.domain` por referência (nunca texto literal, desde D-035/D-036), a troca chegou a login, Painel do Gestor, Painel do Professor, Import Wizard e o wizard de Implantação Institucional (M19) sem editar nenhuma tela — só o dado mudou.
- **Fora do escopo, deliberadamente**: `AUTHENTICATION.md`/`SUPABASE.md`/`.env.example` (processo real de configurar o Colégio Beryon — Cliente Fundador real — no banco real) continuam intocados; são um tenant diferente do seed de demonstração.
- Validado no navegador: login rejeita o domínio antigo (`@colegioberyon.com.br`) e aceita o novo; Painel do Gestor, Painel do Professor, Import Wizard, wizard de Implantação e Dashboard do Aluno mostram "Instituto Horizonte" corretamente; console limpo em desktop e mobile. `npm run lint` e `npm run build` limpos.

## 19/07/2026 — M19: Implantação Institucional (Primeira Venda)

Assistente de implantação do Método IAH® — a experiência de confiança que um diretor escolar percorre para decidir contratar (D-038). Nenhum Mentor IA, IAH Intelligence, Analytics, Dashboard novo, integração ou Engine — exclusivamente a experiência de implantação.

- **Nova rota `/gestor/implantacao`** (aninhada em `/gestor`, herda a proteção admin-only do middleware — zero mudança de autenticação): assistente de 8 etapas — Boas-vindas, Instituição, Estrutura Acadêmica, Equipe, Turmas, Alunos, Currículo, Resumo — com stepper de progresso, mesmo padrão visual do Import Wizard já existente.
- **Dados 100% reais, nada fabricado**: professor, turmas, alunos e domínio institucional exibidos vêm da mesma fonte única (`getWorkspaceContext()`/seeds do Workspace) usada em toda a Plataforma. Campos sem dado real (Cidade, Estado, Logo, Coordenador) ficam honestamente vazios/"Em breve" — nunca inventados.
- **Currículo**: única opção real selecionada (Método IAH®, badges LDB/BNCC/BNCC Computação); outros currículos citados como "futuros", sem nomes inventados.
- **"Onboarding" banido do vocabulário do produto**: trocado por "Implantação Institucional"/"Implantação do Método IAH®" — corrigida a única outra ocorrência (Landing, seção "Implantação em 4 passos").
- Pontos de entrada: item "Implantação Institucional" na sidebar do Gestor e botão "Ver Implantação Institucional" no Painel do Gestor.
- Validado ponta a ponta: Instituição → Equipe → Turmas → Alunos → Currículo → Resumo → "Iniciar utilização da Plataforma" → Painel do Gestor real → Professor acessa `/professor/turmas` normalmente. Desktop, tablet e mobile (375px) sem overflow introduzido pelo wizard — um overflow de header pré-existente (768px, também presente em `/gestor` antes desta Sprint) foi identificado e sinalizado à parte, fora do escopo deste commit. `npm run lint` e `npm run build` limpos.

## 19/07/2026 — M18.3: Sistema Oficial de Identidade Visual

Institucionalização completa da marca (D-036) — fonte única de verdade para todos os ativos, sem alterar arquitetura, banco, autenticação ou fluxos.

- **Master vetorial único**: `src/components/brand/logo.tsx` é a única definição da geometria da marca; toda cópia estática deriva dele (regra documentada e protegida). Versões oficiais nomeadas: **Primary** (fundos claros, `variant="primary"` = `"light"`) e **Reverse** (fundos escuros, `variant="reverse"` = `"dark"`) — aliases aditivos, nenhum consumidor quebrou.
- **Núcleo IAH (símbolo institucional)**: novo `src/components/brand/symbol.tsx` — o "A" com o triângulo ciano como ativo independente, geometria idêntica ao master (só transladada, nenhum ponto redesenhado). Usos futuros: loading, notificações, Mentor IA, certificados, app.
- **Ativos estáticos oficiais**: `public/brand/logo-primary.svg`, `logo-reverse.svg`, `symbol.svg` (cópias geradas e comentadas); favicon (`icon.svg`) regenerado com o path literal do símbolo; novos `apple-icon.tsx` (PNG 180×180 no build) e `manifest.ts`.
- **Logotipo duplicado eliminado**: `opengraph-image.tsx` ainda usava o desenho antigo do "A" (stroke pré-M18.1) — atualizado para a geometria master.
- **Responsividade da marca**: sidebar da Plataforma agora é `collapsible="icon"` — expandida mostra o logo completo, recolhida mostra somente o Núcleo IAH; Landing com `h-6 md:h-7`. Nunca o logotipo completo em tamanho ilegível.
- **BRAND_GUIDELINES.md** (`src/components/brand/`): versões, fundos permitidos/proibidos, área de proteção, tamanhos mínimos, proporções, checklist de regeneração e a regra permanente de ativo protegido (nenhum agente de IA ou desenvolvedor pode redesenhar/reinterpretar a marca). `docs/03_BRAND_GUIDELINES.md` corrigido (descrevia um logótipo antigo de "três barras" inexistente).
- Validado no navegador: Landing (nav + footer), login, sidebar expandida/recolhida (logo ↔ símbolo confirmado via DOM), dashboards dos 3 papéis, desktop/tablet/mobile, 6 endpoints de ativos respondendo 200, console limpo. `npm run lint` e `npm run build` limpos.

## 19/07/2026 — M18.1: Refinamento Institucional e Identidade Visual

Sprint de percepção institucional para a apresentação à mantenedora — sem funcionalidades novas.

- **Reconhecimento institucional no Painel do Gestor**: card "⭐ Instituição Fundadora do IAH®" — "O Colégio Beryon é a primeira instituição parceira na implantação oficial do Método IAH®…", com Ano da implantação, Status do Programa e o rótulo "Escola Parceira de Validação" (termo "Projeto Piloto" evitado, conforme diretriz). Nome/ano/status lidos do contexto institucional, nada fixo em código.
- **Correção do logotipo**: o "A" era desenhado como stroke com juntas arredondadas (raio 17px), transbordando a caixa óptica de I/H — a letra parecia maior. Redesenhado como forma preenchida com contorno explícito (overshoot óptico deliberado de 2px no ápice, padrão tipográfico), triângulo interno reposicionado. Favicon alinhado à mesma forma.
- **Dados do piloto alinhados** (ajuste da mesma janela): professor principal atualizado para o usuário real — **Fabio Ege**, `fabio.ege@colegioberyon.com.br` — mantendo vínculo com a Instituição e as 5 turmas (referência derivada, sem duplicidade); texto de exemplo do login passa a citar `WORKSPACE_TEACHER.email`.
- Validado: login (rejeição de domínio antigo/aceite do novo), Painel do Professor, Painel do Gestor (banner + professor real), Import Wizard, desktop e mobile, console limpo. `npm run lint` e `npm run build` limpos.

## 19/07/2026 — M18: Arquitetura Institucional Multi-Instituição

Sprint exclusivamente arquitetural (D-035): elimina o último acoplamento de nome de escola no código, sem tocar em Curriculum Engine, Knowledge Engine, Lesson Composer, Mission Flow, Mentor IA, AI Gateway ou UX. Nenhum fluxo Professor/Gestor/Aluno mudou de comportamento.

- **Domínio institucional padronizado**: todo e-mail de demonstração passa a usar `@colegioberyon.com.br` (antes `@beryon.edu.br`) — `Professor Fábio`, `diretor@`, `aluno01–10@`. Nenhum e-mail retipado: todos derivados de `DEMO_INSTITUTION.domain`.
- **`Institution` ganha `slug`/`domain`** (`modules/platform/domain/entities.ts`): a instituição real (banco, migration `0003`) já tinha essas colunas desde D-025 — o domínio de código estava atrasado em relação ao schema. `institutionId` continua sendo a única identidade do tenant; `domain` é só um atributo.
- **`modules/workspace/seeds/beryon-seed.ts` → `institution-seed.ts`, `BERYON_*` → `WORKSPACE_*`**: os 8 símbolos (`WORKSPACE_INSTITUTION`, `WORKSPACE_TEACHER`, `WORKSPACE_STUDENTS`, `WORKSPACE_CLASSROOMS`, `WORKSPACE_ENROLLMENTS`, `WORKSPACE_SUBJECT`, `WORKSPACE_USERS`, `WORKSPACE_SCHOOL_YEAR`) e os 5 arquivos que os consumiam (`session.ts`, `session-cookie.ts`, `local-auth-provider.ts`, o barrel `workspace/index.ts`, `gestor/page.tsx`) foram atualizados — puro rename, TypeScript garantiu cobertura completa.
- **Login local de demonstração agora valida o domínio institucional**: `local-auth-provider.ts` só aceita e-mails cujo domínio bata com `WORKSPACE_INSTITUTION.domain` — regra lida do dado, não fixa no código; preparado para quando houver mais de uma instituição seedada.
- **`entrar/page.tsx` sem texto literal**: placeholder e texto de ajuda ("contas simuladas do Colégio Beryon...") passam a interpolar `WORKSPACE_INSTITUTION.name`/`.domain`.
- Validado no navegador: login rejeita `@beryon.edu.br` (domínio antigo) e aceita `@colegioberyon.com.br`; Painel do Professor, Painel do Gestor (nome do diretor derivado: "Direção Colégio Beryon") e Import Wizard renderizam a instituição corretamente em desktop e mobile (375px), console limpo. `npm run lint` e `npm run build` limpos.

## 18/07/2026 — M17: Learning Lifecycle (Fluxo Completo Professor → Aluno)

Conecta todos os módulos já existentes (Institutional Workspace, Curriculum Engine, Lesson Composer, Knowledge Engine, Mission Flow) num único fluxo de aprendizagem — nenhum módulo novo criado, sem IA, sem Google Classroom/NotebookLM, sem alterar autenticação.

- **Nova rota `/professor/turmas`** — o hub do fluxo Professor: seleciona uma Turma real do Colégio Beryon (chips) → vê as Lessons daquela turma → abre uma Lesson (reaproveita `LessonPreview`: Objetivos, Competências, Mission Flow, Materiais, Tempo) → **"Publicar Mission para a turma"**.
- **`Lesson.classroomId` real** (`modules/lesson`): a Etapa 1 do Lesson Composer troca o único valor fixo "Turma de demonstração" pelas 5 turmas reais do Colégio Beryon (`modules/workspace`/`modules/platform`). Chave de armazenamento migrada para `iah:lesson:v3`.
- **`MissionPublishingService` implementado de verdade** (`modules/platform/services/mission-publishing-service.ts`): o contrato `MissionAssignment`/`MissionPublishingService` existia desde D-023 como "arquitetura apenas" — publicar exigia Atividade, persistência e autenticação; as três já existem agora (Workspace, M15). Novo `MissionAssignmentRepository` (seed em memória + banco stub, D-019).
- **Dashboard do Aluno ganha "Minha Lesson"**: quando existe uma Lesson publicada para a turma do aluno, um card mostra Tema/Objetivo antes da Missão — "Minha Missão"/Status/Iniciar/Concluir/Entregar seguem no Mission Flow já existente (M08), **intocado**.
- **`simulated-class-monitor` eliminado definitivamente** (`modules/classroom`, arquivo removido): novo `createInstitutionalClassMonitor` (`modules/platform/services/institutional-class-monitor.ts`) implementa o mesmo contrato `ClassMonitorReader` sobre `Student`/`Enrollment`/`MissionProgress`/`Production`/`Reflection` reais — `ClassPanel` (UI) não mudou uma linha, só a fonte trocou (D-001). `/professor` (painel geral) também migrou para essa fonte.
- **Seed institucional ganhou conteúdo**: `DEMO_PRODUCTIONS`/`DEMO_REFLECTIONS` (mesmo texto fictício rico que vivia em `simulated-class-monitor`, migrado — nenhum texto novo) e novos métodos `listByClassroomMission` em `ProductionRepository`/`ReflectionRepository`.
- **Painel do Professor pós-entrega** (`/professor/turmas`): quantidade de alunos, quantos iniciaram, quantos concluíram, pendentes, percentual da turma, lista de entregas e abertura de entrega individual (produção + reflexão) — tudo com dados reais do seed institucional.
- **Correção de bug real, achada na validação**: as factories de repositórios seed (`modules/platform`, `modules/knowledge`, `modules/curriculum`) criavam uma instância nova a cada chamada — sem uma referência compartilhada, nenhuma escrita sobrevivia à leitura seguinte, mesmo dentro do mesmo processo Node (Server Actions e Server Components do Next.js podem carregar o mesmo módulo em instâncias separadas). Corrigido com singleton em `globalThis` (mesmo padrão usado para o singleton do Prisma Client em apps Next.js) nas três factories.
- Validado manualmente o fluxo completo (Professor publica → Aluno vê "Minha Lesson" e faz a Missão → Professor acompanha, abre entrega individual) em desktop e mobile (375px), sem overflow, console limpo; confirmado que Mission Flow, Curriculum Engine e o gate de papéis (`/gestor`, `/professor`) não sofreram regressão. `npm run lint` e `npm run build` limpos.

## 18/07/2026 — M16: Unificação Institucional Beryon

Resolve o achado registrado na M15: o Painel do Professor misturava duas instituições (header/hub Colégio Beryon vs. Turmas nos seeds antigos da "Escola de Demonstração IAH"). Sprint de unificação de fontes — nenhuma funcionalidade nova.

- **`modules/platform/seeds/demo-seed.ts` virou a fonte institucional canônica**: Colégio Beryon (`inst-beryon`), Ano Letivo 2026 (`year-beryon-2026`), Professor Fábio, as 5 turmas do piloto (1º EM A/B, 2º EM A/B, 3º EM A) e os 10 alunos de demonstração (2 por turma — os mesmos das contas de login do Workspace), com progresso da Missão 01 por aluno (base do futuro indicator-service).
- **`modules/workspace/seeds/beryon-seed.ts` deixou de duplicar dados institucionais**: importa Instituição/Ano/Professor/Turmas/Alunos/Matrículas do seed do platform (import direto do arquivo de seed, não do barrel — que puxa o cliente Supabase e quebraria o middleware edge) e mantém só a camada de identidade: contas, papéis, disciplina, senha de demonstração. Direção de dependência workspace → platform, já existente.
- **Fim do hardcode `"inst-demo"`**: `/professor` e `/professor/curriculo` resolvem a instituição de `repositories.institutions.list()` (regra "não realizar hardcode" da M15); o seed do Curriculum Engine aponta para `year-beryon-2026`.
- **Resultado visível**: a seção Turmas do Painel do Professor lista as 5 turmas Beryon (2 alunos cada) — coerente com o hub do Workspace, com `/gestor` e com o Import Wizard.
- **Pendência preservada e honesta**: o acompanhamento da turma (ClassPanel) segue no roster simulado de 11 alunos do `simulated-class-monitor` (`modules/classroom`), rotulado "Turma de demonstração" — aposentá-lo em favor dos dados do platform é o item 7 do checklist Mock → Banco Real (`PERSISTENCE.md`), agora destravado pelos dados Beryon.
- Validado no navegador (login professor → Turmas Beryon; Currículo; Import Wizard; gate do `/gestor` intacto) em desktop e mobile (375px), sem overflow, console limpo. `npm run lint` e `npm run build` limpos.

## 18/07/2026 — M15: Institutional Workspace (Fundação Institucional)

A Plataforma vira um ambiente institucional com login: autenticação **local simulada** (sem Google OAuth, sem Supabase Auth, sem APIs externas), autorização por papel e contexto pedagógico automático. Novo módulo `modules/workspace`.

- **Entidades**: `WorkspaceUser`, `Role` (admin/teacher/student), `Permission` (capacidades nomeadas), `Subject` — novas; `Institution`, `SchoolYear` (=`AcademicYear`), `Teacher`, `Student`, `Classroom`, `Enrollment` **reaproveitadas de `modules/platform`** (nenhum segundo modelo institucional; multi-instituição por arquitetura, nada pressupõe uma única escola).
- **Seed Colégio Beryon** (pedido explícito da Sprint, revendo a reserva de D-024 sobre o nome da escola real): Ano Letivo 2026, disciplina Inteligência Artificial & Humanidades, 5 turmas (1º EM A/B, 2º EM A/B, 3º EM A), 12 usuários — diretor@beryon.edu.br (Administrador Institucional), fabio@beryon.edu.br (Professor), aluno01–10@beryon.edu.br (2 por turma). Senha única de demonstração (`beryon2026`), exibida na própria tela de login — dados 100% simulados e rotulados (D-015).
- **Login único** (`/entrar`): e-mail + senha, papel identificado automaticamente pelo sistema — jamais escolhido na tela. Erro de credenciais inline. Com a autenticação real (Auth.js, M07) configurada, o login com Google tem precedência — fluxo intacto.
- **Contexto pedagógico automático**: após o login, Instituição, Ano Letivo, perfil, permissões, Turmas e Disciplinas acompanham toda a navegação (carregados no layout da Plataforma) — instituição no header ("Colégio Beryon · 2026"), identidade real no rodapé da sidebar, nome do usuário como autor no Lesson Composer/Estúdio.
- **Perfis**: Administrador → novo Painel do Gestor (`/gestor`: Instituição, Professores, Turmas, Usuários + Configurações/Dashboard Gestor honestamente "Em breve", D-016); Professor → `/professor` ganhou o hub de Workspace (Minha Disciplina, Minhas Turmas, Planejamento Anual/Curriculum Engine, Lesson Composer, Estúdio de Missões, Mission Flow + Biblioteca Oficial/Avaliação Assistida/Analytics da Turma "Em breve"); Aluno → sidebar mínima (Minha Aula, Minha Missão, Diário do Auditor + Meu Portfólio/Meu Histórico/Meu Feedback "Em breve") — Progressive Disclosure por papel.
- **Proteção de rotas** (middleware): sem sessão → redirect `/entrar`; aluno bloqueado de `/professor` e `/gestor`; `/gestor` exclusivo do admin. Sessão = cookie httpOnly com o id do usuário simulado.
- **Substituível por autenticação real em dois pontos únicos**: contrato `WorkspaceAuthProvider` (preparado para Google OAuth/Workspace, Supabase Auth, Microsoft Entra ID, Sophia by Layers — nenhum implementado, D-019/D-016) e `session-cookie.ts` (cookie simulado → sessão real). Nenhuma tela muda na troca.
- **Consequência técnica**: rotas da Plataforma deixaram de ser estáticas no build (leem o cookie de sessão — agora dinâmicas). Rotas de marketing seguem estáticas.
- **Achado (não resolvido)**: o Painel do Professor mistura instituições — header/hub Beryon (workspace) vs. Turmas/acompanhamento nos seeds antigos ("Escola de Demonstração IAH"); unificação fica para a próxima Sprint.
- Validado nos 3 papéis (login, redirecionamento por papel, bloqueios, logout) em desktop e mobile (375px), sem overflow, console limpo. `npm run lint` e `npm run build` limpos.

## 18/07/2026 — M14: Curriculum Engine (Currículo Vivo)

Novo módulo `modules/curriculum` e nova rota `/professor/curriculo` — primeira navegação curricular da plataforma, transformando o Planejamento Anual numa estrutura navegável. Sem IA, sem NotebookLM, sem Google Classroom, sem alterar autenticação.

- **Estrutura Disciplina → Ano Letivo → Unidades → Temas → Lessons → Mission Flow**: `Discipline`/`CurriculumUnit`/`CurriculumTheme` são entidades novas; **Ano Letivo reaproveita `AcademicYear` de `modules/platform`** (sem duplicar entidade), Lessons vêm de `modules/lesson` e Mission Flow de `modules/library`.
- **Cada Tema carrega**: Objetivos, Competências BNCC e BNCC Computação, Tempo previsto, Lessons vinculadas, Mission Flows vinculadas e Recursos do Knowledge Engine. **Avaliação** é derivada das Mission Flows do Tema (mesmo parser/`RubricCard` do Mission Flow — sem duplicar critérios); **Portfólio** segue rotulado honestamente como conceitual (D-028), nenhum dado fake.
- **Navegação em árvore**: o Professor visualiza o ano inteiro (Unidades), expande qualquer Unidade para ver seus Temas, expande qualquer Tema para ver o detalhe completo, e abre qualquer Lesson (`/professor/aulas/[id]`) ou Mission Flow (`/missoes/[id]`) nas rotas reais — sem duplicar telas.
- **Timeline do currículo** (`modules/curriculum/domain/timeline.ts`, projeção calculada, nunca persistida — mesmo princípio de `indicator-service.ts`, `modules/platform`): aulas concluídas/pendentes derivadas de `Lesson.savedAt`, competências desenvolvidas = união das competências de todas as Lessons salvas.
- **Preparação para o Currículo Vivo**: `CurriculumUnit`/`CurriculumTheme` já carregam `status`/`version`, mesmo padrão de versionamento de `StudioMission` (D-022/D-026) — pronto para quando "atualizações automáticas" e "novas versões" ganharem uma Sprint própria; arquitetura seed + banco stub + factory idêntica a `modules/knowledge` (D-034).
- Link "Currículo" adicionado ao cabeçalho de `/professor`, ao lado de "Estúdio de Missões" e "Minhas Aulas".
- **Limite conhecido desta Sprint**: só navegação — não há tela para o Professor criar/editar Unidades/Temas (hoje só existem no seed de demonstração) nem para vincular uma Lesson nova a um Tema automaticamente.
- Validado ponta a ponta (árvore expansível, Timeline, links para Lesson/Mission Flow reais) em desktop e mobile (375px), sem overflow, console limpo; confirmado que o Mission Flow não sofreu regressão. `npm run lint` e `npm run build` limpos.

## 18/07/2026 — M13: Intelligent Lesson Composer (Método IAH)

Evolução do Lesson Builder MVP (M12) — sem IA externa, sem APIs, sem NotebookLM, sem Google Classroom, sem alterar autenticação. Usa exclusivamente os componentes já implementados (Lesson Architecture, Mission Flow, Knowledge Engine, Lesson Builder, Governança Curricular).

- **Assistente "Nova Lesson" cresce de 6 para 7 etapas**, cada uma com sugestão automática por **regra simples, sem IA** (`modules/lesson/domain/composer.ts` — funções puras, isoladas de propósito para uma futura substituição por IA):
  1. **Quem é minha turma?** — Série, Turma, Tempo disponível.
  2. **O que quero ensinar?** — Tema, Objetivo, **Eixo do Planejamento Anual** (novo campo, derivado dos `module` reais das Missões existentes — sem taxonomia inventada), Competências BNCC e BNCC Computação.
  3. **Como meus alunos irão aprender?** (nova etapa) — sugere um dos 7 formatos do Método IAH (Investigação, Debate, Estudo de Caso, Oficina, Projeto, Laboratório, Produção) por palavra-chave no Tema/Objetivo; "Investigação" é o padrão quando nada combina, coerente com o próprio Método (Auditor da Realidade).
  4. **Com quais recursos?** — materiais do Knowledge Engine agora **agrupados por categoria** (`KNOWLEDGE_RESOURCE_TYPE_LABEL`, novo em `modules/knowledge`) e ordenados por relevância ao Tema/Competências; o primeiro material relevante é pré-selecionado automaticamente.
  5. **Como será a missão?** — associação automática da Mission Flow por sobreposição de palavras entre Tema/Objetivo/Eixo e título/pergunta norteadora/módulo da Missão; segue oferecendo criar uma nova no Estúdio quando nenhuma existe.
  6. **Avaliação** (nova etapa) — Critérios e contagem de Evidências herdados automaticamente da Mission Flow selecionada (mesmo parser do Mission Flow), Competências avaliadas = as já coletadas na etapa 2, nota opcional do Professor.
  7. **Preview do Pacote Pedagógico completo** — Objetivo, Competências, Tempo, Metodologia, Mission Flow, Recursos, Avaliação, Critérios, Materiais e Portfólio (rotulado honestamente como conceitual, D-028 — nenhum dado fake).
- **Mesmos 5 componentes da M12** (`LessonWizard`, `LessonPreview`, `LessonSummary`, `LessonHeader`, `LessonStep`) e a mesma reutilização de `MissionNavigation` do Mission Flow — nenhum componente novo além do pedido.
- **Chave de armazenamento migrada** para `iah:lesson:v2` (o shape da `Lesson` mudou: `objective` substitui `objectives[]`, mais `planningAxis`, `format`, `assessmentNotes`).
- **Preparação para o futuro**: as funções de sugestão (`suggestLessonFormat`, `rankKnowledgeDocuments`, `suggestMission`) são o ponto de extensão para IA real; a lista de materiais já vem do Knowledge Engine, então NotebookLM/outras integrações (M11, stubs) aparecem no mesmo lugar quando ativadas; nenhuma tela de Adaptação para Neurodivergentes foi criada (D-028 mantém essa pendência sensível — LGPD — em aberto).
- Validado ponta a ponta (as 7 etapas, sugestões automáticas, Preview, Salvar) em desktop e mobile (375px), sem overflow, console limpo; confirmado que o Mission Flow (`/missoes/[id]`) segue funcionando sem regressão. `npm run lint` e `npm run build` limpos.

## 18/07/2026 — M12: Lesson Builder MVP

Primeira tela funcional do conceito `Lesson` (D-028) — sem IA, sem NotebookLM, sem Google Classroom, sem banco externo, usando só arquitetura já existente.

- **Novo módulo `modules/lesson`**: entidade `Lesson` (subconjunto do Pedagogical Package completo de D-028: Planejamento, Currículo, Mission Flow, Materiais) e `LessonRepository`, implementação localStorage rotulada — mesmo padrão do Mission Studio.
- **Fluxo "Nova Lesson"** em `/professor/aulas` (listagem "Minhas Aulas") e `/professor/aulas/[id]` (assistente), 6 etapas:
  1. **Planejamento** — Série, Turma, Tempo, Tema.
  2. **Currículo** — Competências BNCC, Competências BNCC Computação, Objetivos da Aula (entrada livre — catálogo formal de códigos ainda não existe, D-029/D-030).
  3. **Mission Flow** — seleciona uma Missão existente (`modules/library`) ou linka para o Estúdio de Missões para criar uma nova (sem duplicar o formulário de criação).
  4. **Materiais** — seleciona documentos do Knowledge Engine (`modules/knowledge`, dados de demonstração).
  5. **Preview** — Plano da Aula, Mission, Materiais, **Critérios** (reaproveita `parseMissionContent` do Mission Flow para extrair os Critérios de Auditoria da Missão selecionada) e Tempo previsto.
  6. **Salvar Lesson** — grava no dispositivo, com confirmação.
- **5 componentes novos**: `LessonWizard`, `LessonPreview`, `LessonSummary`, `LessonHeader`, `LessonStep`. A navegação entre etapas **reaproveita `MissionNavigation`** do Mission Flow em vez de duplicar (mesmo padrão "Voltar"/"Continuar", uma ação principal por tela).
- Link "Minhas Aulas" adicionado ao cabeçalho de `/professor`, ao lado de "Estúdio de Missões".
- Validado ponta a ponta (as 6 etapas, autosave a cada etapa, retomada ao reabrir uma Lesson salva) em desktop (1280px) e mobile (375px) — sem overflow horizontal, console limpo. `npx tsc --noEmit`, `npm run lint` e `npm run build` limpos.
- **Limites conhecidos desta Sprint (MVP)**: sem retomada inteligente de etapa (sempre abre na Etapa 1); Materiais selecionados não geram `KnowledgeReference` formal (vínculo direto por id, não pelo registro do Knowledge Engine); sem publicação/versionamento (só rascunho → salva).

## 18/07/2026 — M11: Knowledge Engine (Biblioteca Inteligente)

Sprint de arquitetura — novo módulo `modules/knowledge`, zero mudança visual (mesmo padrão de M04/`modules/platform`; nenhuma página consome o módulo). Nenhuma IA, nenhuma API externa integrada, nenhuma autenticação alterada, nenhuma tabela existente modificada.

- **6 entidades** materializando a `Biblioteca` de `DOMAIN_MODEL.md`: `KnowledgeSource`, `KnowledgeDocument` (título + 15 campos de metadados — tipo, autor, fonte, ano, idioma, resumo, palavras-chave, competências BNCC e BNCC Computação, ano escolar, tempo estimado, nível de dificuldade, licença), `KnowledgeCollection`, `KnowledgeTag`, `KnowledgeTopic`, `KnowledgeReference`.
- **13 categorias iniciais** de recurso (`KnowledgeResourceType`): Artigos, PDFs, Slides, Vídeos, Estudos de Caso, Leis, Normativas, Pesquisas, Infográficos, Sites, Livros, Materiais do Professor, Materiais do Aluno.
- **Mecanismo de busca**: `KnowledgeDocumentRepository.search()` cobre as 6 pesquisas pedidas (tema, competência, habilidade, ano, tipo, texto) — filtros combináveis, filtragem real na implementação seed.
- **7 contratos de integração futura** (`KnowledgeIntegrationProvider`, um stub por origem): NotebookLM, Google Drive, Google Docs, YouTube, OpenAlex, SciELO, Crossref — nenhuma chamada de rede, mesmo padrão D-019.
- **`KnowledgeReference`** é o vínculo direto entre um Documento e uma `Lesson` (D-028, por id solto) ou uma `Mission` (`modules/library`, com foreign key real) — a relação Biblioteca ↔ Lesson ↔ Mission Flow pedida pela Sprint.
- **Schema versionado** (`app/db/migrations/0004_knowledge_engine.sql`, 10 tabelas, sem nenhum INSERT); banco stub até haver credenciais, reaproveitando `isDatabaseConfigured` de `modules/platform` — nenhum cliente Supabase novo.
- **Escopo global/institution**: a maioria dos recursos nasce `global` (catálogo oficial IAH), mesma exceção multi-tenant já aplicada a `Mission`; `institution` fica pronto para quando uma escola quiser curar sua própria coleção.
- Novo `docs/KNOWLEDGE_ENGINE.md`. `npx tsc --noEmit` e `npm run lint` limpos.
- Ver `DECISIONS.md` D-034.

## 18/07/2026 — Strategic Curriculum Alignment (Alinhamento Normativo)

Sprint só de documentação — nenhum código, arquitetura implementada, funcionalidade ou banco de dados alterado.

- **Inclusão oficial da LDB** como referência normativa da Plataforma IAH®.
- **Inclusão oficial da BNCC** como referência curricular.
- **Inclusão oficial da BNCC Computação** como referência para o ensino de Computação e IA.
- **Consolidação do Método IAH®** como metodologia proprietária incorporada à Plataforma IAH® — complementa e operacionaliza LDB/BNCC/BNCC Computação, não os substitui.
- Novo `STATUS.md` "Alinhamento Normativo" e `ROADMAP.md` "Iniciativa transversal — Governança Curricular" (mapeamento de competências/habilidades BNCC e BNCC Computação, associação automática entre `Lesson`/Mission Flow e competências, relatórios pedagógicos por competência — nenhum item implementado ainda).
- Ver `DECISIONS.md` D-029 a D-033 (metadados curriculares obrigatórios em `Lesson`, vínculo BNCC em toda Mission Flow, rastreabilidade de competência em avaliação, visualização de alinhamento antes de publicar, relatórios pedagógicos por competência).

## 17/07/2026 — M10: Lesson Architecture (Fundação da Aula Inteligente)

Sprint só de documentação — nenhum código, componente React, página, rota ou banco de dados alterado.

- **`Lesson` (Aula) definida como unidade pedagógica central do IAH**: um Pedagogical Package completo que o Professor usa para conduzir uma aula, agrupando Planejamento, Objetivos, Competências BNCC, Série, Tempo, Pré-requisitos, **Mission Flow** (a Missão existente, referenciada — não substituída), Slides, Material NotebookLM, Biblioteca Oficial, Estudos de Caso, Exercícios, Rubricas, Avaliação Assistida, Adaptações para Neurodivergentes, Portfólio e Analytics.
- **Seis contratos nomeados, descritos em prosa** (`Lesson`, `LessonBuilder`, `LessonResources`, `LessonMaterial`, `LessonAssessment`, `LessonAccessibility`) — nenhum arquivo `.ts` criado nesta Sprint, por instrução explícita da Sprint M10. Reaproveitam entidades já existentes onde fazem sentido: `LearningObjective`/`Competency`/`EvaluationCriteria`/`DidacticMaterial` (`AUTHORING_MODEL.md`), `Indicadores` (`DOMAIN_MODEL.md`).
- **`LessonBuilder`** já nasce como o ponto de extensão onde o IPE (D-026, hoje "só contratos") vai crescer para montar esse pacote automaticamente no futuro — sempre com revisão do Professor, mesmo invariante já registrado para sugestões de campo.
- **Achado a decidir, não resolvido nesta Sprint**: `LessonAccessibility` tocaria em dado sensível de um menor (condição de saúde/diagnóstico) se modelada com rótulos clínicos — precisa de revisão pedagógica e jurídica (LGPD) antes de qualquer implementação.
- `DOMAIN_MODEL.md` não foi alterado (fora da lista de documentos autorizados pela Sprint) — `Missão` continua descrita como hoje; ver a "Nota de coerência" em `DECISIONS.md` D-028.
- Ver `DECISIONS.md` D-028.

## 17/07/2026 — M09: Mission Flow 3.0 (experiência cognitiva)

Refinamento visual das 9 etapas do Mission Flow (M08) — investigação guiada em vez de formulário dividido em telas. Sem rotas novas, sem schema novo, sem IA, sem banco, sem autenticação, sem dependência nova (reaproveita `tw-animate-css`, já instalado).

- **Indicador de tempo estimado**: novo `mission-timing.ts` — heurística fixa por etapa (mesma escala usada em `ROTEIRO-DEMONSTRACAO.md` para o Dossiê), exibida como "~X min restantes" ao lado de "Etapa X de 9" (`ProgressIndicator`) e como "Cerca de X minutos de investigação" na Capa. Rotulado como estimativa, não promessa de tempo — mesmo cuidado já registrado como risco em `STATUS.md`.
- **Transição entre etapas**: novo `StepTransition` — rolagem ao topo + fade/slide curto (`tw-animate-css`, respeita `prefers-reduced-motion` via `motion-reduce:animate-none`) a cada troca de etapa ou de evidência dentro da Investigação. Corrige um corte seco herdado da M08 (trocar de etapa numa tela longa deixava o aluno no meio da página seguinte).
- **Capa**: ganhou tempo estimado, as Competências Desenvolvidas (movidas do rodapé, que existia em todas as 9 telas) e o botão renomeado para "Começar investigação"; visual do ícone (Compass) ampliado com glow em degradê — continua sem foto (D-027 permanece válido: uma imagem "realista" colidiria com o próprio critério de coerência de imagem que a Missão ensina a checar).
- **Investigação (tela cheia)**: `EvidenceCard` ganhou uma faixa superior em degradê com o ícone (Dual Coding) fazendo as vezes de "imagem" do item, título em destaque maior — mantendo a regra de nunca mostrar mais de uma evidência por tela. Versão `compact` (usada só na Comparação) preservada como cartão simples.
- **Contexto**: parágrafos (máx. 2, chunking já existente) agora dentro de um cartão com fundo neutro, reduzindo a sensação de bloco de texto solto.
- **Critérios / Guia de Investigação**: `RubricCard` ganhou selo colorido por índice (Dual Coding), sem acoplar a nenhum rótulo específico de conteúdo — genérico para qualquer Missão futura.
- **Entrega**: estado "entregue" reformulado como painel de confirmação (mesmo padrão visual do encerramento da Reflexão), botão "Entregar relatório" com o mesmo peso visual do botão da Capa (`size="lg"`).
- **Reflexão Final**: `mission.reflection` agora é decomposto em perguntas metacognitivas individuais (`splitQuestions`, reconhece o "?" de fechamento — sem novo dado, só apresentação) exibidas como lista numerada acima do campo de resposta; card de encerramento renomeado para "Investigação concluída".
- Validado no navegador ponta a ponta (Capa → 4 evidências → Comparação → Produção → Critérios → Entrega → Reflexão), incluindo o estado de retomada (reflexão já registrada), em desktop (1280px) e mobile (375px) — sem overflow horizontal, console limpo. `npx tsc --noEmit`, `npm run lint` e `npm run build` limpos.

## 17/07/2026 — M08: Mission Flow UX 2.0 (baixa carga cognitiva)

Refatoração completa da experiência do aluno em `/missoes/[id]` — sem funcionalidades novas, sem IA, sem banco, sem autenticação. Nenhuma dependência nova.

- **`/missoes/[id]` deixa de ser página única** e passa a ser um fluxo de 9 microetapas: Capa → Contexto → Objetivo → Investigação (uma evidência por tela) → Comparação → Produção → Critérios → Entrega → Reflexão Final. Aplica Cognitive Load Theory, chunking, progressive disclosure, dual coding (ícone + texto), 1 ação principal por tela e "Etapa X de 9" sempre visível.
- **7 componentes reutilizáveis**: `MissionHeader`, `ProgressIndicator`, `MissionStep`, `EvidenceCard`, `RubricCard`, `ReflectionCard`, `MissionNavigation`.
- **Sem schema novo**: `parse-mission-content.ts` decompõe o `didacticMaterials` já existente pelos prefixos já usados na escrita ("DOSSIÊ · Item N", "GUIA DE INVESTIGAÇÃO ·", "CRITÉRIOS DE AUDITORIA ·") em cartões — mesma lacuna documentada em D-022, agora com um adaptador de apresentação por cima, sem alterar o domínio.
- **`modules/classroom` 100% intocado**: mesmo `StudentWork`, mesmo `loadStudentWork`/`saveStudentWork`, mesmos gates (reflexão só após entrega). `mission-workspace.tsx` removido, substituído por `mission-flow/` + `use-student-work.ts` consumindo os mesmos dados.
- **Retomada inteligente sem novo storage**: a etapa inicial é derivada do `StudentWork` já existente (produção entregue → Entrega/Reflexão; produção com texto → Produção; senão → Capa).
- **Imagem via ícone + cor, não foto**: uma foto "realista" da manchete confundiria com o próprio critério de coerência de imagem que a Missão ensina a checar.
- Validado no navegador ponta a ponta (todas as 9 etapas, incluindo as 4 evidências), reload retomando na etapa certa, Diário do Auditor refletindo a reflexão, sem overflow em mobile (375px) e desktop (1280px), console limpo, build/lint/typecheck limpos.
- **Achado, não resolvido nesta Sprint:** a meta de tempo da demonstração (`ROTEIRO-DEMONSTRACAO.md`) precisa ser reensaiada — mais telas pode mudar o tempo percebido mesmo com menos carga cognitiva por tela. Ver `DECISIONS.md` D-027.

## 16/07/2026 — M07: Mission Studio (Estúdio de Missões)

Ambiente oficial de criação, edição, versionamento e publicação de Missões — sem IA nesta Sprint (contratos do IPE apenas). Nenhuma dependência nova.

- **Novo módulo `modules/authoring`**: `StudioMission` (todos os campos da Sprint: título, descrição, pergunta norteadora, objetivos, competências, ano escolar, disciplina, carga horária, dificuldade, tempo estimado, rubrica, critérios, materiais, links, arquivos-referência, estudos de caso, desafio, produção esperada, reflexão, bibliografia, versão, status, autor, datas), contrato `MissionStudioRepository` e implementação localStorage — **missões salvas neste dispositivo, rotulado na interface**; banco entra pelo ponto único `getMissionStudioRepository()` quando o Supabase existir (checklist `PERSISTENCE.md`).
- **Biblioteca de Missões** (`/professor/estudio`): pesquisa + filtros por ano, disciplina, competência, autor e status; Nova Missão; duplicar (nova linhagem); cada versão é uma linha transparente (v1, v2…).
- **Editor em 6 etapas** (`/professor/estudio/[id]`): Identificação → Pedagogia → Investigação → Avaliação → Materiais → Visualizar & Publicar; autosave com debounce; visualização formatada; publicação com pré-condições verificáveis (título, pergunta norteadora, desafio, produção esperada).
- **Versionamento em código** (regras de `AUTHORING_MODEL.md`): versão publicada é imutável (repositório recusa `save`; campos travam), edição pós-publicação = "Nova versão" (v+1, mesma linhagem), exclusão não existe (só arquivada).
- **"Publicar" honesto**: declara na interface o alcance real — publicada na Biblioteca do Estúdio; levar ao aluno (runtime `/missoes`, hoje em arquivos) é etapa futura documentada.
- **IPE (IAH Pedagogical Engine)**: só contratos (`IpePedagogicalEngine`, `IpeFieldSuggestion` com `rationale` e `requiresTeacherReview: true`; o IPE nunca grava) — cada campo do editor já é "sugerível" por construção (`IpeSuggestableField` deriva dos campos). Nenhum botão de IA na interface.
- **Correção (bug real da M07 anterior, achado na validação)**: middleware lançava `MissingSecret` sem `AUTH_SECRET` — gate `isAuthConfigured()` movido para antes da invocação do Auth.js.
- Novo `docs/MISSION_STUDIO.md` (arquitetura, fluxo, versionamento, publicação, integração futura com IPE). Ver `DECISIONS.md` D-026.

## 16/07/2026 — M07: Primeiro Usuário Real — autenticação definitiva (Auth.js + Google)

Infraestrutura completa de login implementada; ativação depende só dos passos de console do fundador (Google Cloud + Supabase), roteirizados em `AUTHENTICATION.md` e `SUPABASE.md`. Única dependência nova: `next-auth@5 (beta)`, pedida na Sprint.

- **Auth.js v5, Google exclusivo**: config dividida (`auth.config.ts` edge-safe para o middleware; `auth.ts` completa com provisionamento), endpoints em `/api/auth/[...nextauth]`, sessão JWT persistente (sem tabela de sessões — decisão documentada), logout no header (`SessionControls`, só aparece com sessão ativa).
- **Middleware de rotas privadas** (`src/middleware.ts`): `/dashboard`, `/missoes`, `/diario`, `/professor` exigem sessão quando a autenticação está configurada; sem credenciais, tudo passa — modo demonstração intacto.
- **Provisionamento automático do primeiro login** (`modules/identity` + migration `0003_identity.sql`): criar Usuário → criar Professor (ligado ao usuário) → criar Perfil professor → associar à Instituição → Dashboard. Idempotente; queries Supabase reais (admin client com service role, só servidor). Allowlist fechada por padrão (`AUTH_ALLOWED_EMAILS`); Instituição nunca criada automaticamente — a linha do Colégio Beryon é inserida pelo próprio responsável (`SUPABASE.md`).
- **Contrato `AuthProvider` (D-019) ganhou a implementação real** (`authJsAuthProvider`) e o seletor `getAuthProvider()`; nenhum componente importa `next-auth` diretamente.
- **`/entrar`**: botão "Entrar com Google" quando configurado (sessão existente vai direto ao Dashboard); sem credenciais, o acesso direto de sempre.
- **`.env.example` reorganizado** por seções (Auth, Supabase, Resend, Site, futuras) — nenhuma credencial hardcoded.
- **Item "remover simulados" da Sprint**: nada removido de propósito — todos os mocks seguem sustentando o modo demonstração; aposentadoria amarrada ao checklist de `PERSISTENCE.md` (D-025).
- Validado: typecheck/lint/build limpos (middleware 87.3 kB edge; bundles de página inalterados), modo demonstração idêntico no navegador (/entrar, /dashboard, /professor), console limpo. O fluxo autenticado ponta a ponta será validado no primeiro login real do fundador. Ver `DECISIONS.md` D-025.

## 16/07/2026 — M06: Google Classroom + Import Wizard (sem OAuth, sem banco)

Camada de integração com o Google Classroom, plugável. Sem autenticação OAuth e sem persistência ainda — dados simulados e rotulados. Nenhuma dependência nova instalada.

- **Novo módulo `modules/integrations/google-classroom`** (subpastas types/dto/contracts/mappers/repositories/services/mock): entidades `GoogleClassroom`/`GoogleCourse`/`GoogleStudent`/`GoogleTeacher`/`GoogleAssignment`; `ClassroomService` (listar turmas/alunos/professores/atividades + fotografia completa); DTOs crus da Classroom API separados das entidades por mappers; `repositories/` como stub até haver OAuth; `mockClassroomService` com dados fictícios rotulados. Nada fora do módulo conhece tipos Google — a fronteira é o adapter para o contrato genérico `ImportProvider`.
- **`ClassroomSyncService`** (em `modules/platform`, genérico — não conhece Google): compõe o `ImportService` (não duplica) e registra `ClassroomSyncState` — nova entidade (data da última sincronização, nº de alunos, nº de atividades, status) + migration `app/db/migrations/0002_classroom_sync_state.sql`.
- **Import Wizard** (`/professor/importar`, 6 passos: Instituição → Conectar Google → Turmas → Alunos → Confirmação → Resumo) sobre dados simulados, com aviso explícito no topo e Resumo declarando que nada foi gravado (D-015). Fluxo percorrido ponta a ponta na validação.
- **Painel do Professor — seção Turmas**: nome, ano letivo, nº de alunos, status de sincronização, última atualização e botão Visualizar (destino real). Lê do módulo `platform`; turmas sem sincronização aparecem como "Cadastro manual". Corrigida a concordância "1 atividade"/"1 aluno".
- **Estrutura preparada, não implementada** (`modules/platform/domain/mission-delivery.ts`): contratos `MissionAssignment`/`MissionPublishingService`/`AssistedEvaluationService` para o fluxo Missão → turma → publicar → entregas → avaliação assistida (a IA sempre exige revisão do professor).
- **Novo `docs/GOOGLE_CLASSROOM_INTEGRATION.md`**: arquitetura, fluxo, sincronização, importação, expansão futura. Sobre o Beryon: entregue a infraestrutura, sem fabricar seeds com o nome da escola real.
- Validado: typecheck/lint/build limpos (17 rotas), wizard nos 6 passos, sem overflow mobile, console limpo. Ver `DECISIONS.md` D-024.

## 16/07/2026 — M04: Núcleo da Plataforma (persistência multi-tenant, sem tocar na UI)

Sprint de arquitetura: código novo, zero mudança visual — nenhuma página, rota ou componente alterado; bundles idênticos aos do build anterior. Nenhuma dependência nova instalada.

- **Novo módulo `modules/platform`** — núcleo institucional multi-tenant: `domain/entities.ts` (12 entidades, todas as operacionais com `institutionId`), `domain/repositories.ts` (contratos que exigem `institutionId` como primeiro parâmetro de todo método — isolamento de tenant imposto no contrato), `services/` (`computeClassIndicators`, projeção pura nunca persistida; `ImportService` com preview separado da gravação), `infrastructure/` (`SeedRepositories` em memória funcionais; `DatabaseRepositories` como stub padrão D-019 até haver credenciais; `repository-factory` como único ponto de troca seed↔banco).
- **Stack decidida: Supabase (PostgreSQL), sem Prisma** — justificativa em `docs/PERSISTENCE.md` (dependência já instalada, alinhada ao plano de auth do ROADMAP; Prisma adiável sem retrabalho graças aos contratos).
- **Schema inicial versionado** em `app/db/migrations/0001_initial_schema.sql`: 11 tabelas (institutions, academic_years, teachers, classrooms, classroom_teachers, students, enrollments, missions, mission_progress, productions, reflections, classroom_integrations), índices por `institution_id`, sem nenhum `INSERT`. `Indicator` não tem tabela (projeção calculada); `IntegrationProvider` não tem tabela (é contrato); `missions` é registro de metadados — conteúdo segue em arquivo.
- **Seeds desacoplados**: `modules/platform/seeds/demo-seed.ts` — escola/ano letivo/professor/turma/11 alunos de demonstração, rotulados, carregados só em memória pelas `SeedRepositories`; nunca entram em migration nem no banco real (que nasce vazio).
- **`ImportProvider` implementado** (`modules/integrations/import`): contrato só-leitura + 6 provedores — `createManualImportProvider` funcional, CSV/Google/Microsoft/Moodle/API como stubs. `IMPORT_ARCHITECTURE.md` atualizado: a gravação saiu do provider e virou responsabilidade do `ImportService` (melhoria sobre o contrato original).
- **Novo `docs/PERSISTENCE.md`**: camadas, fluxo, estratégia multi-tenant (contrato + query + futura RLS), estratégia de seeds e o checklist de 7 passos para a troca Mock → Banco Real.
- Validado: typecheck, lint e build limpos; fluxo na Vercel revalidado em desktop/tablet/mobile com console limpo. Ver `DECISIONS.md` D-023.

## 16/07/2026 — Sistema de Autoria: motor de autoria de Missões decomposto

Sprint só de documentação — nenhum código, componente React, página, rota ou banco de dados alterado.

- **Novo `docs/AUTHORING_MODEL.md`**: decompõe o `Mission` plano de hoje em 10 entidades — `MissionTemplate`, `MissionSection`, `Evidence`, `Challenge`, `EvaluationCriteria`, `ReflectionGuide`, `TeacherGuide`, `Competency`, `LearningObjective`, `DidacticMaterial` — com responsabilidades, relacionamentos, fluxo de criação (nasce → evolui → é publicada) e estratégia de versionamento (unidade de versão = `MissionTemplate` inteiro; `EvaluationCriteria`/`Competency`/`DidacticMaterial` reutilizáveis, com ciclo de vida próprio).
- **Achado concreto**: ao inspecionar `01-a-fabrica-de-noticias.ts`, os 4 itens do Dossiê de Auditoria e o Guia de Investigação/Critérios de Auditoria hoje são strings soltas dentro de `didacticMaterials`, e a chave de correção (`groundTruth`) existe só como comentário de código, nunca visível ao Professor na Plataforma — exatamente a lacuna que a decomposição em `Evidence`/`EvaluationCriteria`/`TeacherGuide` resolve.
- **`DOMAIN_MODEL.md`** ganhou referência cruzada para `AUTHORING_MODEL.md` como deep-dive do contexto Currículo & Autoria, sem duplicar conteúdo.
- Ver `DECISIONS.md` D-022.

## 16/07/2026 — Fundação da Plataforma (multiescola): novas entidades + arquitetura de importação

Sprint só de documentação — nenhum código, componente React, página, rota ou banco de dados alterado.

- **`DOMAIN_MODEL.md`**: novas entidades `ClassroomIntegration` (especialização de Integração — registro de uma sincronização de turma configurada), `IntegrationProvider` (contrato-guarda-chuva de `AuthProvider`/`ClassroomProvider`/`ImportProvider`) e `Indicadores` (projeção agregada, derivada de Progresso/Produção/Reflexão — base do futuro Painel do Gestor). Nova seção 0 reforçando "Instituição é a raiz", com a leitura linear Instituição→Ano Letivo→Professor→Turma→Aluno→Missão→Produção→Reflexão→Indicadores (com ressalva explícita de que é simplificação didática, não a topologia real). Nova lista de "Relacionamentos-chave" e nova seção "Pontos de extensão".
- **Novo `docs/IMPORT_ARCHITECTURE.md`**: contrato conceitual `ImportProvider` (`listClassrooms`/`listStudents`/`importClassroom`), as 5 implementações futuras previstas (`ManualImportProvider`, `CSVImportProvider`, `GoogleClassroomProvider`, `MicrosoftTeamsProvider`, `MoodleProvider`), fluxo de revisão humana obrigatória antes de qualquer gravação, e reconciliação de identidade por e-mail entre origens.
- **`MASTER.md` não foi criado** — não existe no projeto; `HANDOFF.md` já cumpre esse papel desde D-018. Ver `DECISIONS.md` D-021.

## 16/07/2026 — Modelo Institucional (Domain Model consolidado)

Sprint só de documentação — nenhum código, componente React, página ou rota alterado; nenhum banco de dados implementado.

- **`docs/DOMAIN_MODEL.md` consolidado** como modelo conceitual institucional único, incorporando o que vivia em `06_DOMAIN_MODEL.md` (agora redirecionamento) — contextos Identidade & Acesso, Instituição, Currículo & Autoria, Aprendizagem & Entrega, Integrações Externas, Colaboração, Acervo, Operação & Transversais.
- **Nova entidade `Ano Letivo`** (antes só um atributo solto de `Turma`) — necessária para suportar múltiplos períodos letivos sem confundir dados.
- **Novas seções**: "Fluxo completo: Instituição → Professor → Turma → Aluno → Missão" (com mapeamento do que já existe em código vs. o que falta) e "Origens de dados futuras" (cadastro manual, CSV, Google Classroom, Microsoft Teams — todas convergindo para o mesmo modelo interno via `ClassroomProvider`, conectando com o módulo `integrations` da Sprint anterior).
- **Tabela de equivalência** entre os nomes de entidade em português (convenção do domínio de produto) e os identificadores em inglês que o código usará quando implementado (`Institution`, `AcademicYear`, `Teacher`, `Classroom`, `Student`, `Mission`, `MissionProgress`, `Reflection`, `Production`).
- Links corrigidos em `03_BRAND_GUIDELINES.md` e `MISSION_TEMPLATE.md`, que ainda apontavam para `06_DOMAIN_MODEL.md`.
- Ver `DECISIONS.md` D-020 para o porquê da consolidação em vez de um documento novo do zero.

## 16/07/2026 — M03: Infraestrutura Google Workspace (sem dependência externa)

Sprint de arquitetura pura — nenhuma credencial, pacote ou chamada externa. Objetivo original (login Google real + Classroom real) foi reduzido após análise de risco (ver `DECISIONS.md`, D-019).

- **Novo módulo `modules/integrations`**: contratos `AuthProvider` (`signIn`/`signOut`/`getSession`) e `ClassroomProvider` (`listCourses`/`listStudents`/`publishMission`), cada um com implementação simulada (`mockAuthProvider`, `mockClassroomProvider`, usadas hoje) e stub do provedor real (`googleAuthProvider`, `googleClassroomProvider` — lançam erro se chamados, nenhuma chamada de rede existe). `isGoogleWorkspaceConfigured()` é o único ponto que decide se há credencial real (hoje sempre falso).
- **Painel do Professor**: novo card "Integrações" mostrando "○ Google Workspace — Não configurado" e a mensagem "Infraestrutura preparada. Configure OAuth quando o projeto Google Cloud estiver disponível."
- **Novo `docs/GOOGLE_WORKSPACE.md`**: credenciais necessárias, APIs e escopos previstos (Classroom API), passos futuros no Google Cloud Console (projeto, tela de consentimento, test users, verificação de escopos restritos) e como ativar quando as credenciais existirem.
- Nenhuma dependência nova instalada (nem SDK do Google, nem NextAuth/Auth.js). `/entrar` e o fluxo de demonstração de agosto permanecem exatamente como estavam.
- Validado em desktop (1280px), tablet (768px) e mobile (375px) — sem overflow horizontal, console limpo.

## 16/07/2026 — Ensaio cronometrado da demonstração de agosto

Sprint de validação, sem funcionalidades novas — nenhuma alteração de código foi necessária.

- Percurso completo validado na Vercel de produção: Landing → `/demonstracao` → Entrar → Dashboard → Missão 01 → Dossiê de Auditoria (4 itens, hipótese + veredito) → manchete gerada por IA → entrega do Relatório → Reflexão → Diário do Auditor → Painel do Professor — sem erro de console, sem tela quebrada.
- Responsividade validada em 5 larguras (desktop 1280px, notebook 1366×768, projetor 1024×768, tablet 768×1024, mobile 375px): sem overflow horizontal em nenhuma das 6 telas do fluxo. Nenhuma correção de código foi necessária.
- Novo documento `ROTEIRO-DEMONSTRACAO.md`: roteiro de apresentação por etapa, com tempo estimado (~13–14 min) calibrado pelo volume de conteúdo — não uma medição de fala humana; ensaio humano com cronômetro ainda pendente.
- **Achado, não corrigido:** a Landing promete "uma demonstração de 20 minutos" no CTA final, divergente da meta interna de 15 minutos registrada em `ROADMAP.md`/`STATUS.md`. Decisão de qual é a meta real fica para o próximo ciclo.

## 16/07/2026 — M02: Comercialização (página /demonstracao)

Nova página de conversão comercial — funil principal da Landing.

- **`/demonstracao`**: Hero própria ("Tecnologia sozinha não ensina IA. Metodologia sim." / "Solicite uma demonstração personalizada do IAH para sua escola."), formulário de 8 campos (Nome, Escola, Cargo, Cidade/Estado, Nº de alunos, E-mail institucional, Telefone, Mensagem) e e-mails institucionais no corpo da página.
- **Confirmação profissional**: após o envio, tela inline "Recebemos sua solicitação." / "Entraremos em contato em até 1 dia útil."
- **CTAs unificados**: todo "Solicitar demonstração" do site (Hero, faixa pós-Hero, nav desktop/mobile, rodapé, CTA final) agora aponta para `/demonstracao`; `/contato` (formulário mais simples) permanece no ar, sem mais nenhum link apontando para ele.
- **Arquitetura pronta para Resend**: `/api/contato` estendida para aceitar os novos campos (cidadeEstado, numeroAlunos, telefone); o formulário novo usa `mailto:` por ora (mesmo padrão do `ContactForm`), documentado para troca futura sem mudar nomes de campo.
- **SEO**: title, description, canonical (`/demonstracao`) e Open Graph próprios; rota incluída no `sitemap.xml` (prioridade 0.9).
- Validado em mobile (375px), notebook (1366px) e desktop (1920px) — sem overflow, grade do formulário em coluna única no mobile, console limpo.
- Observação registrada em `STATUS.md`: páginas do bloco `(marketing)` fora da home não herdam o sufixo "| IAH Educacional" no `<title>` — padrão pré-existente, não introduzido por esta Sprint.

## 16/07/2026 — M01: Experiência do Mantenedor (Landing como pitch comercial)

Sprint de copy/UX na Landing, sem funcionalidades técnicas novas, para que a página sozinha já conte a história do produto a um gestor escolar.

- **Hero desambiguada**: linha de clareza logo abaixo da descrição — "Não é um AVA" / "Não é um chatbot" / "É um sistema completo de ensino" — visível nos primeiros segundos, sem esperar a seção de contraste mais abaixo na página.
- **CTA logo após a Hero**: faixa "Solicitar demonstração" antes da trust-bar, para quem já decidiu não precisar rolar a página inteira.
- **Nova seção "Tudo o que a escola precisa para ensinar IA"**: substitui a antiga grade "Por que o IAH" por 6 pilares (Metodologia pronta, Material autoral, Missões investigativas, IA integrada, Formação do pensamento crítico, Implantação rápida) — descartados os dois cartões que prometiam integrações inexistentes (Google Classroom, Canva/Agenda).
- **Seção "Como o IAH funciona na prática"**: retitulação da seção de fluxo existente (Professor planeja → Aluno investiga → IA auxilia → Aluno produz → Professor acompanha), agora nomeada explicitamente como pedido.
- **Nova seção "Implantação em 4 passos"**: Conhecer → Capacitar professores → Aplicar Missões → Acompanhar resultados — nova variante clara do componente de fluxo (`.flow-list-4`), sem duplicar CSS.
- **Novo bloco de confiança**: citação sobre o fundador já lecionar a disciplina em sala real, antes da seção de recursos.
- Validado em desktop (1920px), notebook (1366px), tablet (820px) e mobile (375px) — sem overflow horizontal, sem sobreposição na Hero, grade de implantação em 4 colunas no desktop e empilhada no mobile, console limpo.

## 16/07/2026 — Experiência de demonstração comercial

Sprint focada em continuidade e polimento visual, sem funcionalidades novas — preparação para a demonstração ao mantenedor.

- **Landing**: copy revisada com foco em benefício para gestores (diretor, mantenedor, coordenação); os dois diferenciais que prometiam integrações inexistentes (Google Classroom, Canva/Agenda) foram substituídos por diferenciais reais e demonstráveis hoje (Painel do Professor, metodologia validada em sala real); CTA final reforçado ("veja o aluno concluindo uma aula real, não um slide").
- **Continuidade do fluxo**: banner "Aula concluída" na Missão ganhou links diretos para `/diario` e `/dashboard`, fechando o laço da jornada do aluno.
- **Estados de carregamento**: `MissionWorkspace` (produção/reflexão na Missão) e `DiarioList` (`/diario`) paravam de renderizar nada (`return null`) enquanto liam o dispositivo; agora mostram esqueleto (`Skeleton`) equivalente ao layout final.
- **Consistência do header**: o título da seção no header da Plataforma não reconhecia `/professor` e mostrava "Dashboard" por engano; corrigido.
- **Linguagem do Painel do Professor**: "dados simulados para demonstração" (tom de aviso/desculpa) trocado por "Turma de demonstração" (tom profissional, igualmente honesto).
- Validado em notebook (1366×768) e projetor (1920×1080): Landing, `/entrar`, `/dashboard`, `/missoes`, `/missoes/[id]`, `/diario`, `/professor` — sem overflow horizontal, sem sobreposição na Hero, console limpo.

## 16/07/2026 — Dossiê de Auditoria da Missão 01

- Missão 01 ganhou o Dossiê completo dentro da estrutura de 11 blocos existente: 4 itens de investigação (2 autênticos, 2 fabricados — chave de correção apenas em comentário de código), Guia de Investigação (5 critérios) e Critérios de Auditoria explícitos.
- Desafio e Produção do Aluno passaram a exigir hipótese inicial + veredito final justificado por item.
- Ver `DECISIONS.md` para o registro completo.

## 16/07/2026 — Consolidação da documentação

- Criados os 5 documentos oficiais (`VISION.md`, `PRODUCT.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md`) como única memória do projeto. Documentos fragmentados anteriores viraram redirecionamentos.

## 16/07/2026 — Auditoria de demonstração (3 ajustes)

- Link "Entrar" adicionado à navegação da Landing (antes não havia caminho da Landing para a Plataforma).
- Sidebar: itens não construídos ganharam selo "Em breve" e ficaram desabilitados.
- Dashboard: esqueleto de carregamento no lugar do flash de tela em branco.

## 16/07/2026 — Painel do Professor

- `/professor`: acompanhamento da turma com 8 estados, contadores-filtro, último acesso, abertura de produção/reflexão. Turma simulada (arquitetura pronta para banco via `ClassMonitorReader`).

## 16/07/2026 — Identidade visual oficial

- Componente `Logo` reutilizável (variantes clara/escura, wordmark), aplicado em sidebar, header/rodapé da Landing, `/entrar`, favicon e Open Graph.

## 16/07/2026 — Dashboard conectado à Missão real

- Fim dos cards estáticos ("Radar IA", "Caso da Semana", "Missão 04"); Missão ativa e progresso real do dispositivo; estados iniciada/em andamento/concluída.

## 16/07/2026 — Registro de Aprendizagem (Reflexão + Diário)

- `MissionWorkspace` unifica produção e reflexão num único registro (evita sobrescrita); `/diario` lista as reflexões registradas.

## 16/07/2026 — Produção do Aluno

- Autosave, entrega datada e reabertura, persistidos no dispositivo (localStorage).

## 15/07/2026 — Navegação real da Plataforma

- `/missoes` e `/missoes/[id]` substituem a navegação decorativa da Sprint 1; Missão 01 "A Fábrica de Notícias" implementada com os 11 blocos (conteúdo ainda sem o Dossiê completo, adicionado depois).

## 14–15/07/2026 — Infraestrutura de publicação

- Git, GitHub (`profabioege/iah-platform`, privado) e Vercel conectados; deploy contínuo ativo em `iah-platform.vercel.app`.

## 13–14/07/2026 — Fundação do produto

- Estrutura inicial do projeto, App Shell da Plataforma (sidebar, header, tema Premium Dark), Site Institucional (Landing) com formulário de contato, Design System unificado (`tokens.css`), módulo `library` com a entidade `Mission`.
