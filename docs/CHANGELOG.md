# Changelog — IAH Educacional

Histórico de entregas em ordem cronológica reversa. Cada entrada corresponde a uma Sprint ou tarefa concluída. Para o estado atual, ver `STATUS.md`; para o histórico de decisões arquiteturais, ver `DECISIONS.md`.

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
