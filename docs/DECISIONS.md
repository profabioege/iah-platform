# Decisões Arquiteturais — IAH Educacional

Histórico cronológico de toda decisão arquitetural relevante, conforme exigido por `CLAUDE.md`. Fonte oficial única — substitui `07_DECISIONS.md` e `ARCHITECTURE.md` (mantidos como redirecionamento). Formato de cada entrada: **decisão · motivo · alternativas descartadas · impacto futuro**.

## D-001 — Arquitetura modular por domínio (13/07/2026)

**Decisão:** Código de domínio organizado em `app/src/modules/`, um diretório por contexto, com camada `domain/` (entidades + contratos) separada de `infrastructure/` (implementação). Domínio não conhece banco, framework ou UI.

**Motivo:** Início do módulo Biblioteca (Missões). Precisava de um padrão replicável antes de o segundo módulo existir.

**Alternativas descartadas:** Colocar tipos direto nos componentes de página (mais rápido, mas acopla domínio a UI e impede trocar a fonte de dados sem tocar em interface).

**Impacto futuro:** Todo módulo novo (`classroom` foi o segundo) segue este padrão. Banco de dados pode ser adicionado depois sem retrabalho no domínio.

## D-002 — App Shell da Plataforma (13/07/2026)

**Decisão:** `SidebarProvider` + sidebar + header como layout da Plataforma, tema Premium Dark como padrão. Menus iniciais estáticos (sem rota real ainda).

**Motivo:** Sprint 1 pedia só estrutura visual, sem funcionalidades.

**Alternativas descartadas:** Nenhuma — primeira decisão de shell, sem alternativa concorrente avaliada.

**Impacto futuro:** Estabeleceu a identidade "laboratório de IA", referência para todo desenho posterior. Os menus decorativos foram substituídos por navegação real ao longo das Sprints seguintes (D-007 em diante).

## D-003 — Menu de Acessibilidade (14/07/2026)

**Decisão:** Componente `AccessibilityMenu`, ícone `Accessibility` (Lucide) em vez do símbolo ♿. Três seções (Aparência, Leitura, Acessibilidade) com pontos de conexão (`updatePreference`, `adjustFontSize`) já definidos para quando os efeitos forem implementados.

**Motivo:** Símbolo ♿ associa-se só a deficiência física; o produto quer representar inclusão ampla (leitura, foco, cognição).

**Alternativas descartadas:** Ícone ♿ tradicional (rejeitado por estreiteza semântica).

**Impacto futuro:** Interface pronta; efeitos e persistência ainda não implementados (pendência aberta em `STATUS.md`).

## D-004 — Landing sozinha na raiz *(superada por D-007)*

**Decisão, na época:** Rota raiz passou a renderizar só a Landing, sem os componentes de App Shell da Plataforma.

**Motivo:** A aplicação ganhou uma página institucional para apresentação comercial.

**Por que foi superada:** Deixou a Plataforma órfã — sem nenhuma rota que a servisse.

## D-005 — Exportação estática para WordPress *(superada por D-008)*

**Decisão, na época:** `output: "export"` no Next.js, gerando HTML/CSS/JS estático para a hospedagem WordPress contratada.

**Motivo:** Domínio já tinha hospedagem WordPress; a Landing, no momento, não usava recursos de servidor.

**Por que foi superada:** Export estático é incompatível com formulário de conversão com envio real de e-mail e com a própria Plataforma (autenticação, banco, IA).

## D-006 — Tema WordPress como artefato temporário (14/07/2026)

**Decisão:** Criado `wordpress-theme/iah-educacional/` — tema mínimo, sem plugins, distribuído como `.zip`.

**Motivo:** A hospedagem contratada administra instâncias WordPress (não FTP simples), exigindo um tema para publicar.

**Alternativas descartadas:** Editor visual do WordPress sem tema custom (rejeitado — não reproduzia a identidade visual do IAH).

**Impacto futuro:** Artefato **temporário**, não atualizado automaticamente a partir do Next.js. Mudanças na Landing exigem replicação manual aqui até a virada de domínio (D-008, checklist em `DEPLOY.md`).

## D-007 — Route Groups: Landing e Plataforma coexistem *(supersede D-004)* (14/07/2026)

**Decisão:** Um único projeto Next.js com route groups: `(marketing)` serve `/`, `(platform)` serve a Plataforma sob wrapper `.dark`. Raiz compartilhada só com `<html>`, fontes, metadata base.

**Motivo:** As duas frentes precisavam coexistir sob o mesmo projeto, compartilhando Design System, sem refatoração profunda — opção deliberadamente mínima para um MVP.

**Alternativas descartadas:** Dois projetos/repositórios separados (rejeitado — duplicaria Design System e infraestrutura de deploy).

**Impacto futuro:** Estrutura de rotas vigente até hoje (ver `PRODUCT.md`).

## D-008 — Remoção do `output: export`; aplicação Next com servidor *(supersede D-005)* (14/07/2026)

**Decisão:** Remover `output: "export"`. Projeto passa a ser aplicação Next.js com servidor (Node.js/Vercel), hospedando os dois blocos no mesmo deploy. WordPress (D-006) segue no domínio como solução temporária.

**Motivo:** Formulário de demonstração (envio real de e-mail) e a Plataforma definitiva (autenticação, banco, IA) exigem servidor.

**Alternativas descartadas:** Manter export estático e usar serviço de formulário 100% client-side (rejeitado — não sustenta a Plataforma).

**Impacto futuro:** Deploy-alvo exige runtime Node (Vercel). `/api/contato`, SSR, `robots.txt`, `sitemap.xml`, OG dinâmico funcionam em produção.

## D-009 — Design System unificado, fonte única de verdade (14/07/2026)

**Decisão:** `app/src/styles/tokens.css` como fonte única — primitivas da marca (`--iah-*`) + tokens semânticos (contrato shadcn/ui). Plataforma adotou a marca IAH (primário de violeta para cyan `#42e8f1`).

**Motivo:** Após D-007, Landing e Plataforma tinham dois vocabulários visuais distintos — dívida consciente que precisava ser quitada.

**Alternativas descartadas:** Manter dois sistemas de tokens sincronizados manualmente (rejeitado — historicamente diverge, como já havia acontecido).

**Impacto futuro:** Mudança de marca acontece em um único arquivo e propaga para os dois blocos.

## D-010 — Dark Mode como identidade principal; Light Mode planejado (14/07/2026)

**Decisão:** Premium Dark é a identidade visual principal e único tema efetivamente ativo. Tokens do tema claro existem em `tokens.css` como suporte planejado, sem alternância funcional ainda.

**Motivo:** Precisava de uma posição clara sobre tema visual, tanto para a marca quanto para o menu de Acessibilidade (D-003), que já expõe "Modo Claro" sem efeito.

**Alternativas descartadas:** Implementar alternância funcional imediatamente (adiado — não era prioridade da Sprint; ver critério de simplicidade em `VISION.md`).

**Impacto futuro:** Nenhuma tela nova depende de "modo claro" funcional até a alternância existir; toda cor nova ainda é definida para os dois temas em `tokens.css`.

## D-011 — MVP para sala de aula precede a versão comercial (14/07/2026)

**Decisão:** A Plataforma deve ser utilizável em sala de aula antes de qualquer investimento em escala comercial.

**Motivo:** O IAH está sendo construído como sistema de ensino real, não como demonstração de vendas vazia.

**Alternativas descartadas:** Priorizar onboarding self-service e planos pagos antes de validação pedagógica (rejeitado).

**Impacto futuro:** Superada em parte por D-014 (pivô para "demonstração de agosto" como objetivo organizador mais específico), mas o princípio de fundo permanece.

## D-012 — Git, GitHub e Vercel como fluxo padrão de publicação (14–15/07/2026)

**Decisão:** Repositório Git local com branch `main`, remoto privado `github.com/profabioege/iah-platform`, Vercel conectada com Root Directory `app`. Todo push na `main` gera deploy automático em `iah-platform.vercel.app`. Resolução de URL do site prioriza `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` → `localhost`, para que `canonical`/OG nunca apontem para um domínio ainda não conectado.

**Motivo:** Projeto não tinha controle de versão nem deploy; toda mudança ficava só local. `.git` anterior (herdado de uma cópia em OneDrive) estava vazio — sem histórico real a preservar.

**Alternativas descartadas:** Netlify ou host Node próprio (Vercel escolhida por ser o encaixe nativo de Next.js com servidor).

**Impacto futuro:** Fluxo obrigatório para toda entrega: Desenvolvimento → Git → GitHub → Vercel → Validação → Produção (ver `DEPLOY.md`). Domínio definitivo (`iaheducacional.com.br`) ainda não migrado — checklist em `DEPLOY.md`.

## D-013 — Componente Logo oficial da marca (16/07/2026)

**Decisão:** `components/brand/logo.tsx` — SVG isolado num único arquivo, variantes `dark`/`light`/`auto`, wordmark opcional. Substitui o marcador provisório de três barras usado desde D-002.

**Motivo:** Integrar a identidade visual oficial do IAH (fornecida pelo usuário) em toda a plataforma, com um único ponto de substituição para o vetor definitivo.

**Alternativas descartadas:** Embutir o SVG diretamente em cada ponto de uso (rejeitado — impediria trocar a marca num lugar só).

**Impacto futuro:** Qualquer atualização futura do vetor da marca é uma edição de um arquivo; todos os pontos de uso (sidebar, header, rodapé, `/entrar`, favicon, OG) são automaticamente atualizados.

## D-014 — Pivô de estratégia: MVP de demonstração para agosto/2026 (16/07/2026)

**Decisão:** Toda priorização passa a responder "isso melhora a demonstração/uso real em sala de aula em agosto?". O sequenciamento original de Sprints temáticas (`05_ROADMAP.md`: Missões → Biblioteca → Professor → Aluno → Diário → Integrações → Mentor IA) é substituído por entregas ordenadas pela jornada mínima de uma aula completa.

**Motivo:** Confirmação de um piloto comercial real em agosto/2026 com o mantenedor de uma escola onde o fundador já leciona a disciplina — prazo e interlocutor concretos, não hipotéticos.

**Alternativas descartadas:** Manter o roadmap temático original (rejeitado — construiria Biblioteca/Integrações antes de o aluno conseguir concluir uma única aula de ponta a ponta).

**Impacto futuro:** Módulos foram entregues fora da ordem original: navegação de Missão, Produção, Reflexão/Diário, identidade de marca, conexão do Dashboard, Painel do Professor (simulado), auditoria de demonstração — nessa ordem. Backlog temático original passa a ser pós-piloto (ver `ROADMAP.md`).

## D-015 — Dados simulados como padrão de transição para o Painel do Professor (16/07/2026)

**Decisão:** `ClassMonitorReader` como contrato de domínio; `simulated-class-monitor` como única implementação hoje, com turma fictícia de 11 alunos autorizada e identificada na interface ("dados simulados para demonstração").

**Motivo:** Autenticação e banco de dados ainda não existem; o Painel do Professor precisa existir para a demonstração de agosto mesmo assim.

**Alternativas descartadas:** Adiar o Painel do Professor até haver banco real (rejeitado — o piloto de agosto precisa da experiência completa, incluindo o professor).

**Impacto futuro:** Trocar a fonte real de dados é substituir a implementação injetada em `professor/page.tsx`, sem alterar `ClassPanel` nem qualquer componente de interface.

## D-016 — Itens de navegação não construídos ficam explicitamente "Em breve" (16/07/2026)

**Decisão:** Itens da sidebar sem rota implementada (Laboratório, Biblioteca, Projetos, Mentor IA, Agenda, Perfil) recebem selo "Em breve", ficam desabilitados e sem cursor de clique.

**Motivo:** Auditoria da demonstração de agosto identificou que itens clicáveis sem efeito nenhum passam a impressão de protótipo malfeito diante de um gestor.

**Alternativas descartadas:** Remover os itens da sidebar até serem construídos (rejeitado — esconde a visão de produto completa, que é parte do discurso comercial).

**Impacto futuro:** Todo novo item de menu nasce com `href` (navegável) ou explicitamente marcado "Em breve" — nunca um meio-termo silencioso.

## D-017 — Esqueleto de carregamento para telas que leem estado no cliente (16/07/2026)

**Decisão:** Toda tela cujo conteúdo depende de leitura client-side (localStorage) — hoje o Dashboard — mostra um `Skeleton` com o layout final antes de os dados carregarem, em vez de retornar `null`.

**Motivo:** Auditoria de demonstração encontrou um flash de tela em branco no primeiro carregamento do Dashboard (SSR não tem acesso a localStorage).

**Alternativas descartadas:** Mover a leitura de progresso para o servidor (rejeitado — exigiria banco de dados, fora de escopo antes do piloto).

**Impacto futuro:** Padrão a repetir em qualquer tela futura que dependa de estado do dispositivo antes de haver banco de dados.

## D-018 — Consolidação da documentação em 5 arquivos oficiais (16/07/2026)

**Decisão:** `docs/VISION.md`, `docs/PRODUCT.md`, `docs/ROADMAP.md`, `docs/STATUS.md` e `docs/DECISIONS.md` passam a ser a única memória oficial do projeto, consultada antes de qualquer implementação e atualizada ao final de cada tarefa. Os documentos fragmentados anteriores (`01_PRODUCT_VISION.md` a `07_DECISIONS.md`, `ARCHITECTURE.md`) tornam-se redirecionamentos; `DOMAIN_MODEL.md`, `DESIGN_SYSTEM.md`, `03_BRAND_GUIDELINES.md`, `MISSION.md`, `MISSION_TEMPLATE.md` e `DEPLOY.md` permanecem como referências técnicas complementares, linkadas a partir de `PRODUCT.md`/`STATUS.md`.

**Motivo:** Reduzir permanentemente o consumo de contexto nas próximas sessões de trabalho — 16 arquivos de documentação parcialmente sobrepostos e, em alguns pontos, desatualizados em relação ao código real.

**Alternativas descartadas:** Manter todos os documentos fragmentados anteriores como igualmente oficiais (rejeitado — é exatamente a causa do problema que esta decisão resolve).

**Impacto futuro:** Toda decisão, status e visão nova é registrada nestes 5 arquivos, não em novos documentos soltos. Documentos técnicos complementares (Design System, Domain Model, Brand, Deploy) continuam existindo, mas não duplicam o que já está nos 5 oficiais.

## D-019 — Módulo `integrations` com abstração de provedor, sem dependência externa (16/07/2026)

**Decisão:** Novo módulo `modules/integrations`, com dois contratos de domínio — `AuthProvider` (login) e `ClassroomProvider` (cursos, alunos, publicação de Missão) — cada um com uma implementação simulada (`mock*`, usada hoje) e um stub do provedor real (`google*`, lança erro se chamado). `isGoogleWorkspaceConfigured()` é o único ponto que decide se há credencial real; hoje sempre `false`. Nenhum pacote novo foi instalado (nem SDK do Google, nem NextAuth/Auth.js) — a Sprint foi escopada para não depender de Google Cloud, OAuth ou qualquer API externa.

**Motivo:** Sprint M03 pediu "preparar toda a arquitetura para Google Workspace" para o piloto institucional, mas a análise de risco (aviso de "app não verificado", verificação de escopos restritos do Google podendo levar semanas, necessidade de credenciais reais que não existem) levou a reduzir o escopo para infraestrutura pura — arquitetura pronta, zero risco externo antes de agosto.

**Alternativas descartadas:** Implementar OAuth real com o Google agora (rejeitado — dependeria de credenciais que não existem e poderia introduzir a tela de "app não verificado" bem na frente do mantenedor, o oposto do que a demonstração precisa). Colocar os contratos dentro de `modules/classroom` existente (rejeitado — esse módulo já tem um significado específico, acompanhamento de turma via `ClassMonitorReader`; misturar geraria ambiguidade de nome com "sala de aula do Google").

**Impacto futuro:** Quando as credenciais do Google Cloud existirem (ver `GOOGLE_WORKSPACE.md`), a ativação é: definir as variáveis de ambiente, implementar de fato os dois stubs, e trocar a injeção de `mock*` para `google*` nos pontos que os consomem — nenhum componente de UI muda. O mesmo par de contratos comporta um terceiro provedor futuro (ex.: Microsoft Teams) sem alterar `AuthProvider`/`ClassroomProvider`.

## D-020 — Modelo institucional consolidado em `DOMAIN_MODEL.md`, com `Ano Letivo` como entidade (16/07/2026)

**Decisão:** `docs/DOMAIN_MODEL.md` passa a ser o modelo conceitual institucional completo (Identidade & Acesso, Instituição, Currículo & Autoria, Aprendizagem & Entrega, Integrações, Colaboração, Acervo, Operação), incorporando o conteúdo que antes vivia em `06_DOMAIN_MODEL.md` (agora um redirecionamento). Nova entidade `Ano Letivo` (antes só um atributo solto de Turma) para suportar múltiplos períodos letivos sem confundir dados. Novas seções: "Fluxo completo: Instituição → Professor → Turma → Aluno → Missão" e "Origens de dados futuras" (cadastro manual, CSV, Google Classroom, Microsoft Teams — todas alimentando o mesmo modelo interno via `ClassroomProvider`, D-019). Nomes de entidade permanecem em português (convenção do domínio de produto); tabela de equivalência mapeia para os nomes em inglês que o código usará quando implementado (`Institution`, `AcademicYear`, `Teacher`, `Classroom`, `Student`, `Mission`, `MissionProgress`, `Reflection`, `Production`). Nenhum código, UI, página ou rota foi alterado.

**Motivo:** a Sprint "Modelo Institucional" pediu a criação de `docs/DOMAIN_MODEL.md`, mas um modelo conceitual já existia — mais completo — em `06_DOMAIN_MODEL.md`, um dos arquivos numerados que D-018 previu tornarem-se redirecionamentos (e que `PRODUCT.md` já linkava como `DOMAIN_MODEL.md`, nome que nunca chegou a receber o conteúdo real). Criar um terceiro documento do zero repetiria exatamente a fragmentação que D-018 corrigiu.

**Alternativas descartadas:** Escrever um novo `DOMAIN_MODEL.md` do zero com só as 9 entidades pedidas na Sprint, ignorando `06_DOMAIN_MODEL.md` (rejeitado — duplicaria conteúdo já pensado com mais profundidade, incluindo separação Identidade/Papel e template/instância, essenciais para não repetir erro de modelagem depois). Nomear as entidades em inglês no documento conceitual (rejeitado — quebra a convenção já registrada de português no domínio de produto; a tabela de equivalência resolve sem abrir exceção).

**Impacto futuro:** Qualquer nova Sprint de modelagem de domínio edita `DOMAIN_MODEL.md` diretamente, nunca cria um documento paralelo. Ao implementar Autenticação real/Persistência em banco (`ROADMAP.md`, itens 2–3), os módulos `identity`, `institution` e `curriculum` nascem seguindo os contextos já definidos aqui, com identificadores de código em inglês conforme a tabela de equivalência.

## D-021 — Entidades `ClassroomIntegration`/`IntegrationProvider`/`Indicadores` e arquitetura de importação (`ImportProvider`) (16/07/2026)

**Decisão:** `DOMAIN_MODEL.md` ganha três entidades: `ClassroomIntegration` (especialização de `Integração`, o registro de uma sincronização de turma configurada), `IntegrationProvider` (contrato-guarda-chuva que nomeia a família `AuthProvider`/`ClassroomProvider`/`ImportProvider`, já reconhecível como o módulo `modules/integrations`) e `Indicadores` (projeção agregada e derivada — nunca persistida diretamente — base do futuro Painel do Gestor). Novo documento `docs/IMPORT_ARCHITECTURE.md` define o contrato conceitual `ImportProvider` (`listClassrooms`/`listStudents`/`importClassroom`) e as 5 implementações futuras previstas (`ManualImportProvider`, `CSVImportProvider`, `GoogleClassroomProvider`, `MicrosoftTeamsProvider`, `MoodleProvider`), com fluxo de revisão humana obrigatória antes de qualquer gravação e reconciliação de identidade por e-mail. Nenhum código, UI, página, rota ou banco de dados foi alterado.

**Motivo:** a Sprint "Fundação da Plataforma" pediu explicitamente essas entidades e uma camada de importação formal, que a Sprint anterior (D-020) só havia esboçado como uma seção dentro de `DOMAIN_MODEL.md`. Também pediu atualizar um `MASTER.md`, que não existe no projeto — `HANDOFF.md` já cumpre esse papel ("documento único de transição de contexto") desde D-018; criar um `MASTER.md` paralelo recriaria a fragmentação que D-018 e D-020 já corrigiram duas vezes nesta mesma sessão. Decisão: não criar `MASTER.md`; `HANDOFF.md` foi atualizado no lugar dele.

**Alternativas descartadas:** Manter a arquitetura de importação só como uma subseção de `DOMAIN_MODEL.md` (rejeitado — o pedido explícito de um documento dedicado, e o volume de conteúdo próprio — 5 implementações, fluxo, reconciliação de identidade — justificam um arquivo próprio, como já ocorreu com `GOOGLE_WORKSPACE.md`). Criar `MASTER.md` do zero espelhando `HANDOFF.md` (rejeitado — dois documentos com o mesmo propósito divergem com o tempo; é exatamente o problema que D-018 resolveu).

**Impacto futuro:** Quando um novo provedor de importação for implementado (Sprint futura), a checklist é: implementar `ImportProvider` em `infrastructure/` (ou especializar `ClassroomProvider`, se tiver API), sem alterar `Turma`/`Aluno`/`Matrícula` nem qualquer tela — ver "Pontos de extensão" em `IMPORT_ARCHITECTURE.md`. Se o usuário pedir novamente um `MASTER.md`, a resposta é apontar para `HANDOFF.md`, não duplicar.

## D-022 — Motor de autoria: decomposição de `Mission` em 10 entidades, com versionamento (16/07/2026)

**Decisão:** Novo `docs/AUTHORING_MODEL.md`, deep-dive do contexto Currículo & Autoria (já mapeado em alto nível em D-020/`DOMAIN_MODEL.md`). Formaliza 10 entidades — `MissionTemplate`, `MissionSection`, `Evidence`, `Challenge`, `EvaluationCriteria`, `ReflectionGuide`, `TeacherGuide`, `Competency`, `LearningObjective`, `DidacticMaterial` — e uma estratégia de versionamento (unidade de versão = `MissionTemplate` inteiro; `EvaluationCriteria`/`Competency`/`DidacticMaterial` têm ciclo de vida próprio, por serem reutilizáveis entre Missões). Nomes em inglês (diferente de D-020): são nomes já formatados como identificador de código, não conceitos de produto em português como Escola/Turma/Aluno. Nenhum código, UI, página ou rota foi alterado.

**Motivo:** Ao inspecionar `app/src/content/missions/01-a-fabrica-de-noticias.ts` para fundamentar o modelo, ficou evidente que os 4 itens do Dossiê de Auditoria (`Evidence`) e o Guia de Investigação + Critérios de Auditoria (`EvaluationCriteria`) hoje são strings soltas dentro de `didacticMaterials`, e a chave de correção (`groundTruth`) existe **só como comentário de código** ("CHAVE DO PROFESSOR") — nunca como dado, nunca visível ao Professor na Plataforma. Essa é a lacuna concreta que motivou a decomposição, não um exercício abstrato.

**Alternativas descartadas:** Manter tudo dentro do campo único `Mission` (rejeitado — é exatamente o que gera a mistura Evidence/EvaluationCriteria dentro de `didacticMaterials` hoje). Versionar cada sub-entidade independentemente do `MissionTemplate` pai (rejeitado — cria uma matriz combinatória de versões impossível de auditar; a unidade de versão é o template inteiro).

**Impacto futuro:** A Missão 02 (`ROADMAP.md`, backlog item 4) pode nascer com o `Mission` plano de hoje sem esperar por este modelo — a decomposição é aditiva, não bloqueante. Quando um editor de autoria (fora do arquivo TypeScript direto) for necessário, este é o esquema a implementar; a prioridade entre isso e os demais itens do backlog não foi decidida.

## D-023 — Núcleo de persistência multi-tenant: Supabase/PostgreSQL sem Prisma, banco como stub até haver credenciais (16/07/2026)

**Decisão:** Novo módulo `modules/platform` — o núcleo institucional multi-tenant do IAH — com as camadas: `domain/` (12 entidades com `institutionId` + contratos de repositório que exigem `institutionId` como primeiro parâmetro de todo método), `services/` (`computeClassIndicators`, projeção pura nunca persistida; `ImportService`, com preview separado de gravação), `infrastructure/` (`SeedRepositories` em memória, em uso; `DatabaseRepositories` como stub padrão D-019; `repository-factory` como único ponto de troca), `seeds/` (dados de demonstração rotulados, nunca persistidos). Schema inicial em SQL puro versionado (`app/db/migrations/0001_initial_schema.sql`), sem nenhum `INSERT`. Contrato `ImportProvider` implementado em `modules/integrations/import` com 6 provedores (manual funcional + 5 stubs: CSV, Google, Microsoft, Moodle, API). Stack escolhida: **Supabase (PostgreSQL), sem Prisma** — justificativa completa em `PERSISTENCE.md`. Nenhuma página consome o módulo ainda; a UI segue nos stores atuais.

**Motivo:** Sprint "Núcleo da Plataforma" pediu a arquitetura de persistência definitiva sem tocar na UI. Supabase já era dependência instalada e previsto no `ROADMAP.md` para autenticação — zero pacote novo (regra do `CLAUDE.md`); Prisma adicionaria codegen e peso sem benefício no volume atual de queries. Reconciliações com o modelo já documentado, feitas antes de codificar: `Indicator` não vira tabela (é projeção, `DOMAIN_MODEL.md`); `IntegrationProvider` não vira tabela (é contrato, D-019/D-021 — persiste-se `ClassroomIntegration` com coluna `provider`); `Mission` continua conteúdo em arquivo com tabela-registro só de metadados; `Enrollment` entrou no schema (entidade de pleno direito no `DOMAIN_MODEL.md`); `ImportProvider` ficou só-leitura, com a gravação movida para o `ImportService` (`IMPORT_ARCHITECTURE.md` atualizado).

**Alternativas descartadas:** Prisma (codegen + dependência nova sem ganho agora; os contratos permitem adotá-lo depois trocando só `database-repositories.ts`). PostgreSQL auto-hospedado (custo operacional sem equipe). Implementar as queries Supabase de verdade já (rejeitado — não existe banco/credencial contra o qual testá-las; query nunca executada é código especulativo apresentado como pronto). Um banco por escola (rejeitado — isolamento é lógico, por `institution_id` + contrato + futura RLS).

**Impacto futuro:** A troca seed → banco real acontece só na `repository-factory`, seguindo o checklist de 7 passos em `PERSISTENCE.md` (credenciais → migrations → implementar os stubs → auth → RLS → migrar páginas → aposentar `simulated-class-monitor`). A duplicação transitória entre o seed de demonstração e o `simulated-class-monitor` é deliberada e documentada — desaparece quando o Painel do Professor passar a ler do `platform`.

## D-024 — Camada Google Classroom plugável e Import Wizard sem OAuth/banco (16/07/2026)

**Decisão:** Novo módulo `modules/integrations/google-classroom` (types/dto/contracts/mappers/repositories/services/mock) que adapta o Google ao contrato genérico `ImportProvider` — nada fora dele conhece tipos Google. `ClassroomService` real (orquestra repo+mappers) já pronto; camada de dados (`repositories/`) é stub até haver OAuth; `mockClassroomService` fornece dados simulados rotulados. `ClassroomSyncService` (em `modules/platform`, genérico) compõe o `ImportService` e registra `ClassroomSyncState` (nova entidade + tabela `0002`). Import Wizard (`/professor/importar`, 6 passos) e seção "Turmas" no Painel do Professor construídos sobre dados simulados, com aviso explícito e Resumo declarando que nada foi gravado. Contratos de entrega de Missão (`mission-delivery.ts`: `MissionAssignment`, `AssistedEvaluationService`) criados como arquitetura, sem implementação.

**Motivo:** Sprint "M06 — Google Classroom + Piloto Beryon" pediu a infraestrutura de importação de turmas reais sem OAuth ainda. Reconciliações antes de codar: (a) o módulo foi para `modules/integrations/google-classroom`, não `src/integrations/...` — evita uma terceira casa paralela de integrações contra D-001/D-019/D-023; (b) `ClassroomSyncService` compõe o `ImportService` em vez de duplicar o fluxo, e ficou genérico (não Google-específico), honrando "a plataforma nunca depende da origem"; (c) o Wizard rotula os dados como simulados e não finge persistência (D-015); (d) o botão "Visualizar" aponta para destino real (D-016).

**Alternativas descartadas:** Criar seeds com o nome "Colégio Beryon" e alunos fictícios atribuídos a ele (rejeitado — fabricar registros de uma instituição real é diferente de uma escola declaradamente de demonstração; a prontidão real depende de OAuth+banco, documentada em `GOOGLE_CLASSROOM_INTEGRATION.md`). Implementar as chamadas HTTP reais à Classroom API já (rejeitado — sem credenciais, seria código nunca executado; o stub em `repositories/` é o único ponto que falta). Dar ao `ClassroomSyncService` poder de gravar direto (rejeitado — a gravação é do `ImportService`, mesma regra de D-023).

**Impacto futuro:** Ativação do Google real segue "Expansão futura" em `GOOGLE_CLASSROOM_INTEGRATION.md` (OAuth → implementar o repository stub → banco → auth → só então entrega de Missão). Microsoft Teams / Moodle entram como módulos irmãos do google-classroom, cada um com seus mappers, sem tocar em `platform`.

## D-025 — Autenticação real: Auth.js v5 + Google, sessão JWT, provisionamento automático fechado por allowlist (16/07/2026)

**Decisão:** Auth.js v5 (`next-auth@beta`, única dependência nova, pedida na Sprint M07) com provider Google exclusivo. Config dividida em `auth.config.ts` (edge-safe, usada pelo middleware que protege `/dashboard`, `/missoes`, `/diario`, `/professor`) e `auth.ts` (Node, com provisionamento). **Sessão JWT** — persistente via cookie assinado; sem tabela de sessões (ela só existe na estratégia "database" do Auth.js; criar tabela morta seria pior que documentar o desvio do pedido original). Primeiro login provisiona automaticamente `users` → `teachers` → `profiles` (migration `0003_identity.sql`), associando à Instituição de `AUTH_DEFAULT_INSTITUTION_SLUG`. **Allowlist fechada por padrão** (`AUTH_ALLOWED_EMAILS`): sem ela, ninguém entra. **Instituição nunca é criada automaticamente** — inserida pelo responsável real via `SUPABASE.md`. Sem credenciais, tudo degrada para o modo demonstração intacto (mesma filosofia `isConfigured` de D-019/D-023). Toda autenticação passa pelo contrato `AuthProvider` (D-019), agora com implementação real (`authJsAuthProvider`) escolhida por `getAuthProvider()`.

**Motivo:** Sprint M07 — primeiro usuário real (o fundador). As queries Supabase do provisionamento foram escritas agora (desvio consciente da regra "sem query especulativa" de D-023): são o núcleo do critério de sucesso da Sprint e serão exercitadas no primeiro login real; o restante dos repositórios de banco continua stub.

**Alternativas descartadas:** Sessão "database" com adapter Supabase (rejeitado — mais uma dependência, service key exposta a mais superfícies e duplicação de identidade entre o schema do adapter e nossas tabelas de domínio). Login aberto a qualquer conta Google (rejeitado — a plataforma do fundador ficaria pública). Criar a Instituição automaticamente no primeiro login (rejeitado — tenant fantasma silencioso; a linha do Colégio Beryon é dado real, inserido pelo usuário real, coerente com a recusa de D-024 a fabricar registros do Beryon). Remover mocks agora (item 11 da Sprint; rejeitado — nada deixou de fazer sentido: sem credenciais, todos sustentam o modo demonstração; a aposentadoria segue o checklist de `PERSISTENCE.md`).

**Impacto futuro:** Ativar login real = executar os passos de console de `AUTHENTICATION.md`/`SUPABASE.md` e definir as variáveis — zero mudança de código. O mesmo OAuth client do Google servirá aos escopos do Classroom na Sprint seguinte. RLS entra quando houver acesso client-side (checklist `PERSISTENCE.md`, passo 5).

## D-026 — Mission Studio: autoria em localStorage rotulado, versão publicada imutável, IPE só contratos (16/07/2026)

**Decisão:** Novo módulo `modules/authoring` materializando o `MissionTemplate` de D-022/`AUTHORING_MODEL.md` como `StudioMission` (documento editável com todos os campos da Sprint M07, incluindo os novos metadados: descrição, ano escolar, disciplina, carga horária, dificuldade, tempo estimado), com contrato `MissionStudioRepository` e implementação localStorage ("salvas neste dispositivo", rotulado) — o banco entra pelo ponto único `getMissionStudioRepository()` quando o Supabase existir. UI em `/professor/estudio` (Biblioteca com filtros ano/disciplina/competência/autor/status + pesquisa) e `/professor/estudio/[id]` (editor em 6 etapas com autosave, duplicar, visualizar, publicar, nova versão). Versionamento por linhagem (`lineageId`, `version`): publicada é imutável (repositório recusa `save`; editor trava campos), edição pós-publicação = nova versão, duplicação = nova linhagem, exclusão não existe (só `archived`). IPE (IAH Pedagogical Engine): **só contratos** (`IpePedagogicalEngine`, sugestões com `rationale` + `requiresTeacherReview: true`, IPE nunca grava) — nenhum botão de IA na interface.

**Motivo:** Sprint M07 — Mission Studio pediu o estúdio com salvamento em banco, mas o projeto Supabase segue não criado (passos de console pendentes desde a Sprint de autenticação); localStorage rotulado segue o padrão já validado do trabalho do aluno (D-015/D-017) sem query especulativa (D-023). "Publicar" foi implementado com o alcance real declarado na interface (publicada na Biblioteca do Estúdio; a ponte para o aluno — trocar a fonte do `MissionReader` — é etapa futura), para não criar botão que finge (D-016). Correção surgida na validação: o middleware do Auth.js lançava `MissingSecret` sem `AUTH_SECRET` mesmo com o callback `authorized` liberando — o gate `isAuthConfigured()` foi movido para antes da invocação do Auth.js no middleware.

**Alternativas descartadas:** Implementar o Estúdio direto sobre Supabase (rejeitado — banco inexistente; código intestável). Reproduzir em código as 10 entidades separadas de `AUTHORING_MODEL.md` (rejeitado — para um editor v1, um documento estruturado com o mesmo shape conceitual é mais simples e a decomposição completa pode nascer na migração para banco, se o schema pedir). Botões de IA desabilitados "em breve" no editor (rejeitado — os contratos bastam; interface só ganha o botão quando o IPE existir).

**Impacto futuro:** A troca para banco (e storage para arquivos reais) acontece só em `getMissionStudioRepository()`. A ponte Estúdio → runtime do aluno fixa versão por Atividade (P2). O IPE nasce sobre `IpeSuggestableField` — que é derivado dos campos do editor, então todo campo novo no editor fica automaticamente "sugerível". Ver `MISSION_STUDIO.md`.

## D-027 — Mission Flow: a Missão vira sequência de microetapas, parser de conteúdo em vez de novo schema (17/07/2026)

**Decisão:** `/missoes/[id]` deixou de ser uma página única e passou a ser um fluxo de 9 etapas (Capa → Contexto → Objetivo → Investigação → Comparação → Produção → Critérios → Entrega → Reflexão Final), aplicando Cognitive Load Theory/chunking/progressive disclosure. Sete componentes reutilizáveis: `MissionHeader`, `ProgressIndicator`, `MissionStep`, `EvidenceCard`, `RubricCard`, `ReflectionCard`, `MissionNavigation`. **Nenhum schema novo**: um parser (`parse-mission-content.ts`) decompõe o `didacticMaterials` existente pelos prefixos já usados na escrita ("DOSSIÊ · Item N", "GUIA DE INVESTIGAÇÃO ·", "CRITÉRIOS DE AUDITORIA ·") em Evidence/Guide cards só na apresentação — a mesma lacuna que D-022/`AUTHORING_MODEL.md` já tinha documentado, agora com um adaptador por cima em vez de um schema novo. "Imagem" por evidência e na Capa é ícone + cor (Dual Coding), não foto — uma foto fabricada da "notícia" confundiria com o próprio critério de autenticidade de imagem que a Missão ensina a checar. Retomada inteligente: a etapa inicial é derivada do `StudentWork` já existente (produção entregue → Entrega/Reflexão; produção com texto → Produção; senão → Capa) — nenhum dado novo persistido. `modules/classroom` (StudentWork, load/save, gates de entrega/reflexão) permanece 100% intocado; `mission-workspace.tsx` foi removido, substituído por `mission-flow/` consumindo os mesmos dados via `use-student-work.ts`.

**Motivo:** Sprint M08 pediu reduzir a carga cognitiva da experiência do aluno, sem adicionar funcionalidades, banco, IA ou autenticação. Reformular o schema de Missão para ter `Evidence[]` reais quebraria essa restrição (seria funcionalidade nova) e exigiria reescrever o conteúdo já autorado da Missão 01; parsear o texto existente entrega a experiência pedida sem tocar em domínio.

**Alternativas descartadas:** Criar entidades `Evidence`/`EvaluationCriteria` reais no domínio agora (rejeitado — schema novo, fora do escopo "sem novas funcionalidades"; fica para quando o Estúdio de Missões passar a autorar estruturadamente esses campos). Gerar/usar fotos ilustrativas para as manchetes do Dossiê (rejeitado — no contexto desta Missão especificamente, uma imagem "realista" da notícia colidiria com o próprio critério pedagógico de "coerência interna de imagem"). Substituir o prompt de reflexão autoral pelas perguntas genéricas de exemplo do brief (rejeitado — descartaria conteúdo pedagógico específico por texto de exemplo, contra o princípio "todo bloco tem propósito", `MISSION_TEMPLATE.md`). Sempre abrir na Capa (rejeitado — forçaria reclicar 8 telas para adicionar uma reflexão; a derivação por dado já existente resolve sem violar "sem funcionalidade nova").

**Impacto futuro:** Qualquer Missão nova que siga a mesma convenção de prefixos em `didacticMaterials` ganha o Mission Flow automaticamente, sem código novo. A meta de tempo da demonstração (`ROTEIRO-DEMONSTRACAO.md`, ~13–14 min) precisa ser reensaiada: mais telas tende a mudar o tempo percebido mesmo com menos carga cognitiva por tela — não medido nesta Sprint. Quando `MissionSection`/`Evidence` reais (`AUTHORING_MODEL.md`) existirem no Estúdio, o parser pode ser substituído por leitura direta da estrutura, sem mudar os 7 componentes.

## D-028 — Lesson como unidade pedagógica central; Missão passa a ser um recurso dentro dela (17/07/2026)

**Decisão:** Sprint só de documentação — nenhum código, componente React, página, rota ou banco de dados alterado (mesmo padrão de D-021/D-022). Define oficialmente que a unidade pedagógica central do IAH deixa de ser só a `Mission` e passa a ser a **Lesson** (Aula): o pacote completo que um Professor usa para conduzir uma aula do início ao fim. Toda Lesson é um **Pedagogical Package** — reúne, num único objeto endereçável, tudo que hoje está espalhado ou ainda não existe: Planejamento, Objetivos (reaproveita `LearningObjective`, `AUTHORING_MODEL.md`), Competências BNCC (reaproveita `Competency`, `AUTHORING_MODEL.md`/`DOMAIN_MODEL.md`, com um campo de código BNCC a acrescentar quando implementado), Série, Tempo estimado, Pré-requisitos, **Mission Flow** (referência à `Mission`/`MissionTemplate` existente — não substituída, é o núcleo de investigação da aula), Slides, Material NotebookLM, Biblioteca Oficial (reaproveita `DidacticMaterial`), Estudos de Caso, Exercícios, Rubricas (reaproveita `EvaluationCriteria`), Avaliação Assistida, Adaptações para Neurodivergentes, Portfólio (referência a uma entidade futura, ainda não modelada) e Analytics (reaproveita `Indicadores`, `DOMAIN_MODEL.md`).

Seis contratos nomeados (descritos abaixo em prosa — nenhum arquivo `.ts` criado nesta Sprint, por instrução explícita):

| Contrato | Responsabilidade | Reaproveita |
|---|---|---|
| `Lesson` | A entidade raiz — todos os 15 campos acima, mais `id`/`status`/`version`/`lineageId` no mesmo padrão de versionamento de `MissionTemplate` (D-022). | `Mission` (via `missionId`), `LearningObjective`, `Competency` |
| `LessonBuilder` | Monta um Pedagogical Package a partir de entradas do Professor. Hoje só o contrato — implementação manual futura (análoga ao editor do Mission Studio); **é o ponto de extensão que o IPE (D-026) implementará no futuro** para montagem automática sugerida, sempre com `requiresTeacherReview: true` (mesmo invariante do IPE de campo). | `IpePedagogicalEngine` (`modules/authoring/domain/ipe.ts`) como precedente de forma, não de código |
| `LessonResources` | Agrupa os materiais de apoio à condução da aula — Slides, Material NotebookLM, Biblioteca Oficial, Estudos de Caso, Exercícios — cada um como uma lista de `LessonMaterial`. | `DidacticMaterial` (`AUTHORING_MODEL.md`) |
| `LessonMaterial` | Formato genérico de referência a um recurso: tipo, título, URL ou referência de arquivo, proveniência/autor, licença. Generaliza o padrão já usado por `DidacticMaterial` para qualquer tipo de material, não só texto de apoio. | `DidacticMaterial` |
| `LessonAssessment` | Agrupa Rubricas e o contrato de Avaliação Assistida — sugestão de correção/feedback ao Professor, nunca nota automática, nunca grava sem revisão (mesmo princípio do IPE). Nenhuma IA implementada nesta Sprint. | `EvaluationCriteria` (`AUTHORING_MODEL.md`) |
| `LessonAccessibility` | Adaptações para neurodivergentes, por tipo de necessidade e por recurso da Lesson (ex.: versão de leitura facilitada do Mission Flow, tempo estendido). Só o contrato — nenhuma adaptação real implementada. **Ponto em aberto, não resolvido nesta Sprint:** qualquer rótulo clínico/diagnóstico é dado sensível de um menor (LGPD) — a modelagem de campo por campo precisa de revisão pedagógica e jurídica antes de qualquer implementação, não só de design técnico. | — (conceito novo, sem precedente no código) |

**Nota de coerência:** `DOMAIN_MODEL.md` não foi alterado nesta Sprint (fora da lista de documentos autorizados) e continua descrevendo `Missão` como entidade central — isso não é uma contradição: a `Mission`/Mission Flow continua sendo exatamente o que é hoje (a experiência de investigação do aluno, D-027, e a unidade de autoria, D-022); `Lesson` é a camada acima, do ponto de vista de planejamento e condução do Professor, que referencia a Missão em vez de substituí-la. `DOMAIN_MODEL.md` será atualizado formalmente quando `Lesson` ganhar a primeira implementação real.

**Motivo:** Sprint M10 pediu definir oficialmente a Lesson como unidade pedagógica central antes de qualquer Sprint de implementação — registrar a arquitetura primeiro, para que os próximos módulos do Roadmap (Biblioteca, Segunda Missão, Avaliação Assistida, Mentor IA, Modo de Acessibilidade) tenham um destino conceitual comum em vez de crescerem como recursos soltos e desconectados.

**Alternativas descartadas:** Criar `modules/lesson` com os 6 contratos como arquivos `.ts` reais agora (rejeitado — instrução explícita da Sprint foi "criar apenas a arquitetura definitiva", com atualização restrita a 5 documentos; código sem nenhum consumidor ainda seria domínio morto, mesmo risco que `AUTHORING_MODEL.md`/D-022 já evitou ao ficar só em documentação). Modelar `Lesson` como substituição de `Mission` (rejeitado — quebraria D-022/D-026/D-027 inteiros e o piloto de agosto depende do Mission Flow existente funcionando exatamente como está). Expor rótulos clínicos de neurodivergência como enum fechado já nesta Sprint (rejeitado — decisão sensível de LGPD/pedagogia, não deve nascer como detalhe técnico incidental).

**Impacto futuro:** Cada um dos 15 componentes da Lesson vira, em princípio, uma Sprint própria de implementação (mesmo padrão aditivo já usado em `AUTHORING_MODEL.md`) — a ordem entra em `ROADMAP.md` conforme o piloto de agosto exigir, não nesta Sprint. `LessonBuilder` é o contrato que dá nome ao lugar onde o IPE crescerá para montagem automática do pacote pedagógico completo, quando o IPE sair de "só contratos" (D-026). `LessonAccessibility` não avança para implementação sem uma revisão pedagógica/jurídica dedicada sobre dado sensível de menor.

## D-029 — Alinhamento Normativo: LDB, BNCC, BNCC Computação e Método IAH® como referenciais permanentes (18/07/2026)

**Decisão:** Sprint só de documentação — nenhum código, arquitetura implementada, funcionalidade ou banco de dados alterado. A Plataforma IAH® passa a adotar oficialmente LDB, BNCC, BNCC Computação e o Método IAH® como referenciais permanentes de todo desenvolvimento pedagógico. O Método IAH® **complementa e operacionaliza** esses referenciais — não os substitui. Como primeira consequência concreta, os metadados curriculares de `Lesson` (Competências BNCC, já previstos em D-028) deixam de ser um campo opcional e passam a ser **obrigatórios**: toda `Lesson` precisa declarar a quais competências/habilidades da BNCC — e, quando aplicável, da BNCC Computação — ela se conecta.

**Motivo:** Registrar formalmente o compromisso normativo do produto antes de qualquer Sprint de implementação curricular, para que Biblioteca, Segunda Missão, Avaliação Assistida, Mentor IA e o próprio `Lesson` (D-028) nasçam já alinhados, em vez de precisarem de uma migração de conformidade depois.

**Alternativas descartadas:** Tratar o vínculo curricular como recomendação/boa prática não obrigatória (rejeitado — contradiz o próprio objetivo de tornar LDB/BNCC referenciais permanentes, não apenas sugeridos). Modelar já um enum fechado de códigos BNCC (rejeitado — exige a tabela oficial completa de competências/habilidades, ainda não mapeada; ver "Governança Curricular", `ROADMAP.md`).

**Impacto futuro:** A obrigatoriedade só passa a valer de fato quando `Lesson` ganhar implementação real (D-028) — até lá é uma regra registrada, não aplicada por nenhuma validação. Bloqueia, por design, qualquer publicação futura de Lesson sem competência BNCC associada.

## D-030 — Toda Mission Flow deve estar vinculada às competências/habilidades da BNCC e, quando aplicável, da BNCC Computação (18/07/2026)

**Decisão:** Estende a obrigatoriedade curricular de D-029 à `Mission` em si, não só à `Lesson` que a envolve: toda `Mission`/`MissionTemplate` deve declarar suas competências e habilidades BNCC correspondentes. Hoje o campo `competencies: string[]` (`modules/library/domain/mission.ts`) existe mas é texto livre, sem vínculo com um código BNCC oficial — nenhuma mudança de schema nesta Sprint.

**Motivo:** Mission Flow é a experiência de aprendizagem em si; sem vínculo curricular explícito na própria Missão — não só na Lesson que a contém — os relatórios pedagógicos por competência (D-033) não conseguiriam atribuir competências no nível de uma aula individual quando uma Lesson futura compuser mais de uma Mission Flow.

**Alternativas descartadas:** Vincular BNCC só no nível de `Lesson`, nunca no de `Mission` (rejeitado — perderia granularidade quando uma Lesson futura compuser mais de uma Mission Flow).

**Impacto futuro:** Quando `Competency` (`AUTHORING_MODEL.md`) ganhar o campo de código BNCC apontado como pendente em D-028, tanto `Mission` quanto `Lesson` passam a referenciá-lo pela mesma entidade compartilhada, sem duplicar modelagem.

## D-031 — Toda avaliação deve indicar quais competências e habilidades está evidenciando (18/07/2026)

**Decisão:** O contrato `LessonAssessment` (D-028) — Rubricas + Avaliação Assistida — passa a exigir que toda avaliação declare explicitamente quais competências/habilidades BNCC (ou do Método IAH®) está evidenciando, não apenas emitir uma nota ou parecer genérico.

**Motivo:** Uma avaliação sem rastreabilidade de competência não serve como evidência pedagógica perante LDB/BNCC nem alimenta os futuros relatórios por competência (D-033).

**Alternativas descartadas:** Deixar essa rastreabilidade como responsabilidade manual do Professor, fora do contrato (rejeitado — sem campo estruturado, o relatório por competência de D-033 dependeria de preenchimento manual não confiável).

**Impacto futuro:** `LessonAssessment`, quando implementado, precisa nascer com esse campo desde a v1 — adicioná-lo depois que houver dado real de avaliação em produção deixaria de ser uma migração trivial.

## D-032 — O Professor poderá visualizar o alinhamento curricular antes de publicar uma aula ou missão (18/07/2026)

**Decisão:** Registra intenção de produto (nenhuma tela criada nesta Sprint): antes de publicar uma `Lesson` ou `Mission`, a interface futura deve mostrar ao Professor um resumo do alinhamento curricular — quais competências/habilidades BNCC estão cobertas. Mesmo espírito das "pré-condições verificáveis antes de publicar" já usadas no Mission Studio (D-026), agora aplicado à dimensão curricular.

**Motivo:** O Professor que autora uma aula precisa conseguir confirmar a cobertura curricular antes de publicar, não descobrir depois — mesmo princípio de "nunca criar botão que finge" (D-016): a visualização deve refletir dado real, não ser decorativa.

**Alternativas descartadas:** Validar o alinhamento curricular só no backend, sem superfície visível ao Professor (rejeitado — é o Professor quem precisa confiar nessa cobertura e explicá-la à coordenação/gestão, não só o sistema).

**Impacto futuro:** Quando o editor do Mission Studio (ou um futuro editor de Lesson) ganhar essa tela, deve reaproveitar as pré-condições de publicação já existentes (`MISSION_STUDIO.md`) como padrão de interação, em vez de inventar um fluxo novo de confirmação.

## D-033 — A Plataforma deve gerar relatórios pedagógicos por competência e habilidade (18/07/2026)

**Decisão:** Registra intenção de produto (nenhum relatório implementado nesta Sprint): relatórios pedagógicos agregados por competência/habilidade BNCC, apoiando Professor, Coordenação e Gestão — extensão natural de `Indicadores` (`DOMAIN_MODEL.md`) e do Painel do Gestor já planejado (`ROADMAP.md`, "Sprint seguinte recomendada").

**Motivo:** Fecha o ciclo do Alinhamento Normativo — declarar competências (D-029/D-030) e evidenciá-las em avaliação (D-031) só tem valor de gestão escolar se puder ser agregado e relatado, não só registrado aula a aula.

**Alternativas descartadas:** Tratar esse relatório como parte do escopo já definido do Painel do Gestor, sem registro próprio (rejeitado — o Painel do Gestor, como planejado hoje em `ROADMAP.md`, agrega adesão/progresso/competências como lista simples, não como relatório por competência com evidência de avaliação; são adjacentes, não idênticos, e merecem decisão própria).

**Impacto futuro:** Quando implementado, deve consumir os mesmos dados agregados que o Painel do Gestor usa (`ClassMonitorReader`/`Indicadores`), evitando uma segunda fonte de verdade para o mesmo tipo de métrica. Entra no Roadmap junto com "Governança Curricular".

## D-034 — Knowledge Engine: Biblioteca Inteligente como módulo próprio, seed em memória + banco stub (18/07/2026)

**Decisão:** Novo módulo `modules/knowledge` — mesmo padrão arquitetural de `modules/platform` (D-023): `domain/` (6 entidades — `KnowledgeSource`, `KnowledgeDocument`, `KnowledgeCollection`, `KnowledgeTag`, `KnowledgeTopic`, `KnowledgeReference` — e contratos de repositório), `infrastructure/` (`seed-repositories.ts` em memória com busca real; `database-repositories.ts` stub; `repository-factory.ts` decidindo entre os dois, reaproveitando `isDatabaseConfigured` de `modules/platform` em vez de criar um segundo cliente Supabase), `seeds/` (dados de demonstração, nunca persistidos). Materializa a entidade `Biblioteca` já mapeada em alto nível em `DOMAIN_MODEL.md` (contexto Acervo). `KnowledgeDocument` carrega os 15 campos de metadados pedidos (título, tipo, autor, fonte, ano, idioma, resumo, palavras-chave, competências BNCC e BNCC Computação, ano escolar, tempo estimado, nível de dificuldade, licença) e as 13 categorias iniciais (`KnowledgeResourceType`). `KnowledgeDocumentRepository.search()` é o mecanismo de busca — um método parametrizado (`KnowledgeSearchQuery`) cobrindo as 6 pesquisas pedidas (tema, competência, habilidade, ano, tipo, texto), já com filtragem real na implementação seed. Sete contratos de integração futura (`KnowledgeIntegrationProvider`, um stub por origem: NotebookLM, Google Drive, Google Docs, YouTube, OpenAlex, SciELO, Crossref) — mesmo padrão D-019, nenhuma chamada de rede. **`KnowledgeReference` é o vínculo direto** entre um Documento e uma `Lesson` (D-028, por id solto — sem tabela própria ainda) ou uma `Mission` (`modules/library`, com foreign key real). Schema versionado em `app/db/migrations/0004_knowledge_engine.sql` (10 tabelas, sem nenhum INSERT). Escopo `global`/`institution` (mesma exceção multi-tenant já aplicada a `Mission`, `PERSISTENCE.md`). Nenhuma página consome o módulo. Documentação completa em `KNOWLEDGE_ENGINE.md`.

**Motivo:** Sprint M11 pediu a primeira versão da arquitetura da Biblioteca Inteligente — núcleo de conhecimento capaz de organizar todos os recursos usados na geração de aulas, preparado (não implementado) para integrações externas e para o vínculo com `Lesson`/Mission Flow definido em D-028.

**Alternativas descartadas:** Modelar a Biblioteca como parte de `modules/platform` em vez de módulo próprio (rejeitado — Biblioteca é um contexto de domínio distinto de Instituição/Turma/Aluno em `DOMAIN_MODEL.md`; um módulo próprio mantém a regra de D-001, um diretório por contexto). Implementar de fato uma das 7 integrações (ex.: YouTube, API pública e simples) já nesta Sprint (rejeitado — instrução explícita "não integrar APIs externas"; qualquer integração real também exigiria decisão de custo/quota e tratamento de erro de rede fora do escopo de uma Sprint de arquitetura). Criar um cliente Supabase próprio para o módulo (rejeitado — duplicaria `modules/platform/infrastructure/database/supabase-client.ts` sem necessidade; reaproveitar `isDatabaseConfigured` mantém um único ponto de conexão, D-001). Modelar `Lesson` com tabela própria nesta Sprint para dar à `KnowledgeReference.lessonId` uma foreign key real (rejeitado — fora do escopo de M11; `Lesson` segue só documentada, D-028).

**Impacto futuro:** Quando `Lesson` ganhar implementação real, `knowledge_references.lesson_id` ganha foreign key formal (hoje é id solto, mesma transição já prevista para outros vínculos incompletos no projeto). Quando o catálogo formal de códigos BNCC/BNCC Computação existir (D-029/D-030), `bnccCompetencies`/`bnccComputacaoCompetencies` deixam de ser `string[]` livre e passam a referenciar essa entidade — mesma migração que `Mission`/`Lesson` também vão precisar. Cada uma das 7 integrações futuras vira Sprint própria quando o piloto de agosto (ou pós-piloto) exigir.

## D-035 — Arquitetura Institucional Multi-Instituição: `Institution.domain`/`slug` como dado, símbolos de código sem nome de escola (19/07/2026)

**Decisão:** `Institution` (`modules/platform/domain/entities.ts`) ganha dois campos: `slug` (identificador curto e estável, ex.: `"beryon"` — mesmo valor já usado por `AUTH_DEFAULT_INSTITUTION_SLUG` na autenticação real) e `domain` (domínio de e-mail institucional, ex.: `"colegioberyon.com.br"`). A identidade do tenant continua sendo `institutionId`/`id` — `domain` é só um atributo consultável, nunca a chave de identificação. O e-mail institucional do piloto padroniza para `@colegioberyon.com.br` em todo o seed de demonstração (`modules/platform/seeds/demo-seed.ts`), derivado por template a partir de `DEMO_INSTITUTION.domain` — nunca retipado em cada e-mail. O seed de identidade do Workspace (antes `modules/workspace/seeds/beryon-seed.ts`, com exports `BERYON_*`) foi renomeado para `institution-seed.ts` com exports `WORKSPACE_*` (`WORKSPACE_INSTITUTION`, `WORKSPACE_TEACHER`, `WORKSPACE_STUDENTS`, `WORKSPACE_CLASSROOMS`, `WORKSPACE_ENROLLMENTS`, `WORKSPACE_SUBJECT`, `WORKSPACE_USERS`, `WORKSPACE_SCHOOL_YEAR`) — nenhum símbolo de código carrega mais o nome de uma escola específica, só os dados populados no seed. `local-auth-provider.ts` (autenticação local de demonstração) passa a validar que o domínio do e-mail submetido bate com `WORKSPACE_INSTITUTION.domain` antes de aceitar a senha — regra lida do dado, nunca uma string fixa no provider. `entrar/page.tsx` deixa de citar "Colégio Beryon"/"beryon.edu.br" como texto literal; placeholder e texto de ajuda passam a interpolar `WORKSPACE_INSTITUTION.name`/`.domain`.

**Motivo:** Sprint M18 — piloto do Colégio Beryon padroniza o domínio institucional oficial (`@colegioberyon.com.br`) e a Plataforma precisa estar pronta para receber outras escolas depois sem exigir uma segunda rodada de busca-e-substituição por "Beryon" em telas, seeds e nomes de constante.

**Alternativas descartadas:** Resolver a instituição pelo domínio do e-mail em vez de por `WORKSPACE_INSTITUTION` fixo no `local-auth-provider.ts` (rejeitado — só existe uma instituição seedada nesta fase; construir resolução multi-tenant sem um segundo tenant real para testar seria funcionalidade especulativa, não arquitetura). Renomear os ids técnicos internos (`inst-beryon`, `year-beryon-2026`, slug `beryon`) (rejeitado — são identificadores estáveis, não a "identidade institucional visível" que a Sprint pediu para eliminar; renomeá-los é risco de regressão sem ganho, já que o princípio "id nunca é o domínio" já valia antes desta Sprint). Criar um segundo tipo `InstitutionConfig` paralelo a `Institution` para hospedar `logo`/`colors`/`timezone` (rejeitado na atualização abaixo — violaria D-001, um contexto nunca tem dois donos de entidade; `Institution` já é a fonte única consumida por Workspace/Professor/Gestor/Import Wizard).

**Atualização (mesma data, mesma Sprint):** a decisão original tinha deixado `logoUrl`/`colors`/`timezone` de fora por não terem consumidor (ver primeira versão deste texto). A pedido explícito de retomar o `InstitutionConfig` conceitual por completo, os três campos foram adicionados ao próprio `Institution` (não a um tipo novo — ver alternativa descartada acima): `logoUrl: string | null`, `colors: InstitutionColors | null` (`{ primary, secondary }`), `timezone: string`. `DEMO_INSTITUTION` popula só `timezone: "America/Sao_Paulo"` (mesmo offset `-03:00` já usado em todo o seed, não é dado novo); `logoUrl`/`colors` ficam `null` — não existe asset real de marca do Colégio Beryon neste projeto, e fabricar um violaria D-015 (nunca dado fictício não rotulado). Nenhuma migration SQL nova: a `migration 0003` só tem `logo_url`, e o repositório real de instituições segue stub — `colors`/`timezone` ganham coluna quando o banco real entrar em uso.

**Impacto futuro:** Quando uma segunda instituição for seedada de fato, `local-auth-provider.ts` troca a checagem de `WORKSPACE_INSTITUTION.domain` fixo por uma busca da instituição pelo domínio do e-mail recebido — mesmo formato de dado (`Institution.domain`), sem migração de schema. A autenticação real (Auth.js + Google, `provisioning-service.ts`) já resolve a instituição por `slug` via `AUTH_DEFAULT_INSTITUTION_SLUG` desde D-025 e não precisou de nenhuma mudança nesta Sprint — o `domain` que a migration `0003` já reserva em `institutions` fica disponível para essa mesma resolução por domínio quando o login real também precisar dela.

## D-036 — Sistema Oficial de Identidade Visual: master vetorial único, símbolo "Núcleo IAH", ativo protegido (19/07/2026)

**Correção de fidelidade visual (19/07/2026):** o fundador reapresentou o
arquivo oficial `logoIAH1.png` e confirmou uma divergência no vetor criado
durante M18.1/M18.3. O master e seus derivados foram corrigidos para reproduzir
as características verificáveis do original: proporção menos horizontal,
ápice e terminais arredondados no “A”, triângulo interno maior e wordmark
`EDUCACIONAL` leve e mais espaçado. O PNG oficial passa a ser a autoridade
visual até a entrega de um SVG/AI oficial; o componente continua sendo a fonte
de implementação da plataforma, não uma autorização para reinterpretar a marca.

**Decisão:** A identidade visual da marca passa a ter uma única fonte de verdade: o componente `src/components/brand/logo.tsx` é o **master vetorial** — toda cópia estática deriva dele e nunca o contrário. Novo componente `src/components/brand/symbol.tsx` ("Núcleo IAH"/IAH Core): o símbolo institucional oficial (o "A" com o triângulo ciano), com a MESMA geometria do master apenas transladada para viewBox quadrado (offset x−60/y+3 — nenhum ponto redesenhado). Ativos estáticos gerados: `public/brand/logo-primary.svg` (fundos claros), `logo-reverse.svg` (fundos escuros), `symbol.svg`; `src/app/icon.svg` (favicon) regenerado com o path literal do símbolo; novos `src/app/apple-icon.tsx` (PNG 180×180 via ImageResponse no build) e `src/app/manifest.ts` (aponta para os ícones oficiais, nenhum desenho novo). O `opengraph-image.tsx` — que ainda carregava o desenho ANTIGO do "A" (stroke pré-M18.1), um logotipo duplicado desatualizado — foi atualizado para a geometria master. Nomes oficiais das versões: **Primary** (`variant="primary"`, sinônimo de `"light"`) e **Reverse** (`variant="reverse"`, sinônimo de `"dark"`) — aliases aditivos, nenhum consumidor quebrou. Regra responsiva implementada: sidebar da Plataforma vira `collapsible="icon"` — expandida mostra o logo completo, recolhida mostra SOMENTE o Núcleo IAH (nunca o logotipo completo reduzido a tamanho ilegível); Landing usa `h-6 md:h-7`. Guia técnico com regra permanente de proteção em `app/src/components/brand/BRAND_GUIDELINES.md`: "O logotipo oficial do IAH é um ativo institucional protegido. Nenhum agente de IA ou desenvolvedor poderá redesenhá-lo ou reinterpretá-lo. Toda implementação deverá utilizar exclusivamente os arquivos mestres aprovados." `docs/03_BRAND_GUIDELINES.md` corrigido (descrevia um logótipo antigo de "três barras verticais" que não existe mais) e apontando para o guia técnico.

**Motivo:** Sprint M18.3 — o fundador entregou as duas versões oficiais da marca (Primary/Reverse) e pediu a institucionalização completa: fonte única, símbolo extraído, favicon/manifest/apple-touch-icon, regras responsivas e proteção formal contra reinterpretação.

**Alternativas descartadas:** Vetorizar os PNGs anexados como nova geometria (rejeitado com aprovação explícita do fundador via pergunta direta — os anexos são raster; traçar por cima seria reinterpretação, não extração exata; o master vetorial da M18.1, que já corresponde visualmente à arte anexada, foi confirmado como autoridade). Criar `src/brand/` como diretório novo (rejeitado — `src/components/brand/` já existia como casa da marca; mover seria churn sem ganho). Gerar PNGs binários de manifest (192/512) no repositório (rejeitado — sem tooling de imagem no build além do ImageResponse; o manifest usa o SVG `any` + apple-icon 180, suficiente para o piloto).

**Impacto futuro:** Se um vetor-fonte oficial (SVG/AI) da marca for entregue, ele substitui o conteúdo do master uma única vez, seguido do checklist de regeneração documentado no guia (public/brand → icon.svg → apple-icon → opengraph-image). O Núcleo IAH está pronto para os usos previstos (loading, notificações, Mentor IA, certificados, ícone de app) sem nenhum redesenho adicional.

## D-037 — Reposicionamento comercial: "Primeira Instituição Parceira" na UI, "Cliente Fundador" reservado a material comercial (19/07/2026)

**Decisão:** O card de reconhecimento institucional do Painel do Gestor (M18.1) passa de "Instituição Fundadora do IAH®"/"Escola Parceira de Validação" para **"Primeira Instituição Parceira"** (ícone `Medal`, lucide-react — consistente com o vocabulário de ícones já usado em toda a Plataforma, nunca emoji). O termo **"Cliente Fundador do Método IAH®"**, definido na atualização estratégica desta data, fica reservado a documentos comerciais, contratos, propostas e material de vendas — nunca à interface da Plataforma, que mantém tom de reconhecimento institucional, não comercial. Escopo desta entrada é deliberadamente mínimo: só o texto da UI e o comentário de código correspondente (`demo-seed.ts`) mudaram; a atualização estratégica completa (missão, modelo comercial Setup+SaaS, filtro de decisão de 5 perguntas) foi registrada em memória do agente para orientar priorização futura, sem reescrever `VISION.md`/`PRODUCT.md`/`ROADMAP.md` agora — o tempo restante desta janela prioriza código sobre documentação; a varredura terminológica completa desses documentos fica para quando houver folga.

**Motivo:** Manter a interface elegante e não-comercial (pedido explícito do fundador) enquanto o vocabulário comercial mais assertivo vive nos materiais de venda.

**Alternativas descartadas:** Usar "Cliente Fundador" também na UI (rejeitado pelo fundador — a Plataforma não deve parecer material comercial). Reescrever `VISION.md`/`PRODUCT.md`/`ROADMAP.md` nesta mesma janela (adiado — prioridade explícita para código/UX no tempo restante).

**Impacto futuro:** Quando houver janela dedicada a documentação, aplicar a atualização estratégica completa a `VISION.md`/`PRODUCT.md`/`ROADMAP.md` (norte atual, modelo comercial, filtro de 5 perguntas) e varrer o termo "piloto" nos documentos vivos (`STATUS.md`, `HANDOFF.md`), preservando o histórico em `DECISIONS.md`/`CHANGELOG.md` como está.

## D-038 — Implantação Institucional como experiência oficial de entrada do Método IAH® (19/07/2026)

**Decisão:** Novo assistente `/gestor/implantacao` (rota aninhada em `/gestor`, herda a proteção de papel admin já existente no middleware — nenhuma mudança de autenticação): 8 etapas (Boas-vindas, Instituição, Estrutura Acadêmica, Equipe, Turmas, Alunos, Currículo, Resumo) com stepper de progresso, seguindo o mesmo padrão de UI do Import Wizard já existente (`professor/importar/import-wizard.tsx`: Card + Stepper + navegação Voltar/Avançar). Termo "Onboarding" banido — usa-se "Implantação Institucional"/"Implantação do Método IAH®" em toda a Plataforma (única outra ocorrência do termo era a Landing, corrigida; a exceção é `onboarding@resend.dev`, endereço técnico de terceiro, fora do vocabulário do produto). **Honestidade dos dados (D-015)**: todo número exibido (1 professor, 5 turmas, 10 alunos, 100% de e-mails no domínio institucional) vem da MESMA fonte única já estabelecida (`getWorkspaceContext()`, `WORKSPACE_TEACHER/CLASSROOMS/ENROLLMENTS`) — nada fabricado. Campos sem correspondente no modelo hoje (Cidade, Estado, Logo, Coordenador) ficam como entrada local não persistida ou honestamente "Em breve"/"nenhum cadastrado ainda", nunca como dado inventado. Etapa de Currículo mostra só a opção real (Método IAH®, com badges LDB/BNCC/BNCC Computação, alinhado a D-029/D-030) — sem inventar nomes de currículos futuros. Botão final "Iniciar utilização da Plataforma" leva ao `/gestor` real, fechando o ciclo sem depender de nenhum flag/gate novo (o ambiente já está "implantado" nos seeds; o wizard é uma experiência de confiança, não um cadastro que persiste).

**Motivo:** Sprint M19 — o objetivo comercial mudou de "validar MVP" para "primeira implantação comercial" (ver atualização estratégica desta mesma data); o diretor escolar precisa perceber um processo estruturado de implantação para decidir contratar, não uma tela de cadastro de usuários.

**Alternativas descartadas:** Construir formulários que de fato criam uma nova instituição/turma/aluno no banco (rejeitado — o núcleo de persistência segue stub, D-023; fabricar uma gravação que não acontece seria pior que mostrar os dados reais existentes, D-015). Adicionar campos novos ao domínio `Institution` (cidade, estado, segmentos, coordenador) para backing real dos inputs (rejeitado nesta Sprint — schema sem consumidor além deste wizard, mesma disciplina já aplicada em D-036 para `logo`/`colors`; entram quando o checklist Mock → Banco Real justificar). Gatear o primeiro login do admin nesta rota (rejeitado — alteraria o fluxo de autenticação já testado; a rota fica descobrível via sidebar/link, sem forçar redirecionamento).

**Impacto futuro:** Quando a persistência real existir (checklist `PERSISTENCE.md`), os campos hoje em estado local (Cidade/Estado/Segmentos) ganham backing real em `Institution`, e as etapas de Equipe/Turmas/Alunos passam a aceitar importação de fato — a estrutura de 8 etapas já reflete esse fluxo, só troca a fonte de dados (mesmo princípio D-001 usado em todo o projeto).

## D-039 — Ambiente Institucional Neutro para Demonstração: Instituto Horizonte (19/07/2026)

**Decisão:** Toda referência ao Colégio Beryon no **ambiente de demonstração** (seeds, UI, Import Wizard, wizard de Implantação Institucional, comentários de código) é substituída por uma instituição fictícia — **Instituto Horizonte** (`institutohorizonte.edu.br`). `DEMO_INSTITUTION` (`modules/platform/seeds/demo-seed.ts`, fonte institucional única desde D-016/M16) muda `id` (`inst-horizonte`), `slug` (`horizonte`), `name` (`Instituto Horizonte`) e `domain` (`institutohorizonte.edu.br`); os ids técnicos derivados (`year-horizonte-2026`, `student-horizonte-NN`, `enroll-horizonte-NN`) e a senha de demonstração (`horizonte2026`) acompanham. O professor principal da demonstração continua sendo **Fabio Ege** (usuário real, D-035/D-037), agora com e-mail `fabio.ege@institutohorizonte.edu.br`. Como toda a Plataforma já consumia `Institution.name`/`.domain`/`WORKSPACE_TEACHER` por referência (nunca texto literal, D-035/D-036), a troca de nome propagou automaticamente para login, Painel do Gestor, Painel do Professor, Import Wizard e o wizard de Implantação Institucional (M19) sem precisar editar UI — confirmado no navegador. Nenhuma decisão arquitetural muda: `Institution` continua com os mesmos campos (`slug`/`domain`/`logoUrl`/`colors`/`timezone`), a arquitetura multi-institucional (D-035), autenticação e permissões seguem intactas.

**Motivo:** Nova decisão estratégica — o ambiente de demonstração é usado para apresentar o produto a **outras** escolas prospects, e não deve expor nome/dados do Colégio Beryon (o Cliente Fundador real, relação comercial tratada à parte). "Instituto Horizonte" deixa a Plataforma com cara de produto comercial pronto para qualquer escola, não de projeto amarrado a um cliente específico.

**Alternativas descartadas:** Genericizar totalmente (remover qualquer nome próprio, só "Escola Demonstração") — rejeitado, a Sprint pediu explicitamente uma instituição fictícia nomeada, não um placeholder genérico. Reescrever `AUTHENTICATION.md`/`SUPABASE.md`/`.env.example` (que descrevem o processo real de configurar a instituição real no banco real) — rejeitado, esses documentos e variáveis (`AUTH_DEFAULT_INSTITUTION_SLUG`) são sobre a implantação real futura do Colégio Beryon, um tenant diferente do seed de demonstração; trocar o exemplo lá misturaria os dois contextos. Reescrever o histórico narrativo de `HANDOFF.md`/`ROADMAP.md`/`STATUS.md` que descreve Sprints passadas (M15–M18) — adiado, mesmo padrão já usado em D-037: histórico de Sprint não é reescrito, só o estado atual.

**Impacto futuro:** Quando o Colégio Beryon (Cliente Fundador real) ganhar seu próprio tenant real (via `AUTH_DEFAULT_INSTITUTION_SLUG`/Supabase, D-025), ele convive com o Instituto Horizonte fictício do ambiente de demonstração — são registros `Institution` distintos, a arquitetura multi-tenant (D-035) já suporta os dois sem conflito.

## D-040 — Product Experience: Executive Experience como tela principal do Gestor (19/07/2026)

**Decisão:** A fase de Product Experience começa pelo Dashboard Executivo de
`/gestor`, que substitui o antigo hub de cards institucionais e se torna a tela
principal da demonstração comercial. A hierarquia responde nesta ordem: estado
geral, implantação, atenção executiva, professores, alunos e disciplina. Cinco
leituras locais (Visão geral, Implantação, Professores, Alunos e Disciplina)
organizam a experiência sem criar rotas ou módulos. A camada executiva exibe
somente dados agregados; granularidade individual permanece no Painel do
Professor. A implementação usa apenas componentes e tokens semânticos do Design
System Premium Dark — nenhuma cor literal ou nova primitiva.

**Fonte e honestidade dos dados:** turmas, matrículas, professor e progresso da
Mission são calculados sobre o Workspace/seed institucional já existente. O
único indicador ainda sem modelo persistente é o progresso da implantação
(75%), por isso aparece explicitamente como demonstrativo. Exportação de resumo
permanece desabilitada e rotulada “Em breve”. Nenhum analytics, IA, banco ou
integração foi fabricado.

**Motivo:** O gestor precisa compreender valor e maturidade em poucos segundos
durante a demonstração comercial: como está a escola, o que foi implantado,
como estão professor e alunos e qual é o estágio da disciplina. A arquitetura já
é suficiente; a prioridade passa a ser valor percebido.

**Impacto futuro:** Quando a implantação e a aprendizagem migrarem para banco,
as mesmas superfícies passam a consumir indicadores persistidos por tenant. A
hierarquia visual e a fronteira de privacidade não mudam; troca-se a fonte, não
a experiência.

## D-041 — Fundação de Produção: Auth.js Credentials + Supabase real, RLS deny-by-default (20/07/2026)

**Decisão:** Persistência e autenticação reais substituem localStorage/seed em
memória como fonte de verdade do ciclo pedagógico, preservando integralmente a
arquitetura existente (D-001, D-023, D-025). Uma única flag decide o modo da
instância — `isAuthConfigured()` (`src/lib/auth-flags.ts`), verdadeira apenas
com `AUTH_SECRET` + `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
**todas** definidas; qualquer subconjunto lança erro explícito de configuração
(`getPlatformConfigError()`), nunca cai em seed silenciosamente (regra já
registrada em D-023, agora aplicada à ativação do modo real inteira).

**Autenticação — Auth.js Credentials, somado ao Google (D-025), nunca dois
sistemas concorrentes.** `auth.ts` ganha um provider `Credentials`: e-mail e
senha verificados contra `users.password_hash` (scrypt, `src/lib/password.ts`,
zero dependência nova) e o papel/instituição vêm de `profiles` — nunca do
cliente. O papel nunca é escolhido na tela de login (D-de-sempre do
Institutional Workspace, M15): é sempre o vínculo persistido. O gate por papel
(`/gestor` exclusivo de administrador, `/professor` vedado a aluno) que antes
só existia no branch de demonstração do middleware passa a existir também no
branch real (`auth.config.ts`, callback `authorized`, lendo o papel do JWT).

**Postura de segurança — acesso ao banco exclusivamente server-side, RLS
deny-by-default.** Todas as tabelas (0001–0004 incluídas) ganham RLS habilitada
sem nenhuma política permissiva: as chaves anon/authenticated não leem nem
escrevem nada; o servidor da aplicação usa a service role (que ignora RLS por
desenho do Postgres) e aplica a autorização por tenant/papel na camada de
serviço — todo contrato de repositório já exige `institutionId` como primeiro
parâmetro (D-023), e cada Server Action deriva esse `institutionId` da sessão,
nunca do cliente. Políticas RLS por tenant para acesso direto do navegador
ficam para quando (e se) existir esse acesso — política não exercida não é
criada (mesmo princípio de D-023 para queries especulativas).

**Ponto único de sessão.** `modules/workspace/infrastructure/session.ts`
(`getWorkspaceContext()`/`getWorkspaceUser()`) passa a resolver usuário, papel,
instituição, permissões e turmas tanto do banco (sessão Auth.js) quanto do seed
local (cookie do Workspace) — nenhuma tela decide isso sozinha; as páginas que
antes faziam `isAuthConfigured() ? null : await getWorkspaceContext()` (um
guard que, no modo real, nunca chamava a função — bug latente que este
levantamento encontrou) passam a chamar `getWorkspaceContext()` incondicionalmente.

**Substituição do localStorage como fonte de verdade pedagógica.** Novo
`createLearningCycleService` (`modules/platform`) grava Produção, Reflexão e
Avaliação nas tabelas reais (`productions`/`reflections`/`mission_reviews`,
migration `0005_production_foundation.sql`) devolvendo o mesmo formato
`StudentWork` que a UI já consumia — nenhuma tela redesenhada (D-001). Server
Actions (`missoes/[id]/mission-flow/actions.ts`, `professor/actions.ts`)
derivam `institutionId`/`classroomId`/`studentId` da sessão, nunca do cliente.
Autosave de texto usa debounce (800 ms) com flush síncrono no blur e antes de
qualquer transição discreta (entregar/registrar), sequenciado (não paralelo)
para nunca sobrescrever o rascunho mais recente com uma gravação atrasada — o
risco concreto de "perder o trabalho do aluno" que a Sprint pediu para evitar.
`Lesson` (`modules/lesson`) segue o mesmo princípio via Server Actions
(`lesson-actions.ts`) expostas atrás do MESMO contrato `LessonRepository` —
`getLessonRepository()` decide sozinho entre remoto e local usando
`NEXT_PUBLIC_IAH_REAL_MODE`, um espelho público (só booleano, calculado em
build time no `next.config.ts`) de `isAuthConfigured()`, necessário porque
componentes "use client" não enxergam variáveis de servidor não prefixadas.
Os espelhos locais do M21 (`local-mission-assignment-store`, merge otimista no
`ExecutiveDashboard`/`ClassPanel`) são desativados no modo real — o banco é a
única fonte; `revalidatePath` já atualiza as rotas quando algo é publicado ou
avaliado.

**Seed de demonstração como script explícito, nunca em migration.**
`app/db/seed/seed-demo.mjs` popula o cenário Instituto Horizonte (D-039) num
projeto Supabase já migrado — idempotente (upsert por id), senha das contas
lida de `IAH_DEMO_PASSWORD` (nunca em código), sem progresso/entregas
fictícias pré-gravadas (a jornada nasce limpa; dados pedagógicos vêm do uso
real, mesmo princípio do ambiente de produção).

**Alternativas descartadas:** Manter duas fontes de verdade (localStorage +
banco) com sincronização — rejeitado, é exatamente o problema que a Sprint
pediu para eliminar. RLS com políticas por tenant desde já — rejeitado sem
usuário autenticado client-side contra o banco para exercitá-las (nenhuma
política não testada, D-023). Um segundo sistema de autenticação para
Lesson/StudentWork — rejeitado; tudo passa pelo mesmo `getWorkspaceContext()`
e pelas mesmas Server Actions.

**Impacto futuro:** Ativar o modo real em produção é só definir as três
variáveis (Vercel) + aplicar as migrations 0001–0005 + rodar o seed — nenhuma
tela muda. RLS por tenant entra quando existir acesso direto do navegador ao
banco. `docs/PERSISTENCE.md` documenta o checklist e os critérios de ativação
atualizados.

## D-042 — Renomeação: "Mentor IA" passa a "Mentor IAH — apoio inteligente à aprendizagem investigativa" (20/07/2026)

**Decisão:** O item de produto até aqui referido como "Mentor IA" (glossário de marca, sidebar "Em breve", pilar da Landing, backlog de `ROADMAP.md`) passa a se chamar oficialmente **"Mentor IAH — apoio inteligente à aprendizagem investigativa"**. Forma curta em uso corrente: **Mentor IAH**. Aplicado a `docs/03_BRAND_GUIDELINES.md` (glossário), `ROADMAP.md`, `STATUS.md`, `HANDOFF.md` (listas de lacunas/pendências, sempre a versão "existente hoje", nunca retroativa) e às três referências de UI/código já existentes como texto (`components/layout/app-sidebar.tsx`, item de sidebar desabilitado "Em breve"; `app/(marketing)/page.tsx`, pilar da Landing; `components/brand/BRAND_GUIDELINES.md`/`symbol.tsx`, menções de uso futuro do símbolo). **Nenhum componente, rota ou entidade foi criado** — segue sendo, como sempre foi, um contrato nomeado sem implementação (mesmo padrão do IPE em D-026, do `LessonBuilder` em D-028).

**Registros históricos não foram alterados.** `DECISIONS.md` (entradas D-014, D-016, D-028 a D-033, D-037), `CHANGELOG.md` (entradas datadas M18/M19) e `05_ROADMAP.md` (documento já superado, mantido só por histórico) continuam citando "Mentor IA" — são registros cronológicos do que foi decidido/nomeado *naquele momento*; reescrevê-los romperia a própria convenção deste arquivo (entradas nunca são editadas retroativamente, só superadas por uma entrada nova — ver D-004/D-005/D-007/D-008). A renomeação vale a partir desta data para toda referência ao estado atual/futuro do produto.

**Motivo:** Pedido explícito do responsável pelo produto, como preparação terminológica antes de uma futura Sprint de implementação do Mentor — nenhuma decisão de escopo, arquitetura ou funcionalidade envolvida.

**Alternativas descartadas:** Retroagir a mudança aos registros históricos (rejeitado — quebra a integridade do histórico cronológico que `DECISIONS.md`/`CHANGELOG.md` existem para preservar).

**Impacto futuro:** Quando o Mentor IAH ganhar a primeira implementação real, o nome oficial já está fixado — nenhuma segunda rodada de renomeação será necessária. Qualquer menção nova ao Mentor em documentação ou código usa "Mentor IAH" (forma curta) ou o nome completo na primeira menção de um documento novo.

## D-043 — LessonAssessment versionada e sondagem diagnóstica supervisionada (20/07/2026)

**Decisão:** O contrato conceitual `LessonAssessment` de D-028/D-031 passa a ter implementação própria em `modules/assessment`, sem reutilizar `MissionAssignment`, `Production`, `Reflection` ou `MissionReview`. O template possui versão e pode referenciar opcionalmente uma Lesson ou Mission; a publicação por turma (`AssessmentAssignment`) fixa o template e concentra início, encerramento, fuso, atrasos e política de gabarito. Respostas recebem `autoScore`/`autoFeedback` determinísticos, mas `finalScore`/`teacherFeedback` só existem após ação docente. Resultado e feedback são liberados coletivamente; o gabarito segue política independente.

**Motivo:** A sondagem tem múltiplas questões, prazos individualizáveis e correção por resposta, sem equivalência semântica com a produção textual única de uma Mission. Separar template, instância e submissão preserva o histórico publicado, o isolamento institucional e a rastreabilidade de competências exigida por D-031.

**Alternativas descartadas:** armazenar respostas em `Production.content`; tornar `mission_assignments` polimórfica; usar IA externa para a dissertativa; liberar nota automática sem validação humana.

**Impacto futuro:** Novos tipos de Assessment podem reutilizar o agregado sem criar outra entidade. A rubrica determinística pode evoluir desde que `finalScore` continue sob responsabilidade docente. O banco real requer a migration 0006 e validação contra um projeto Supabase provisionado.

## D-044 — Redesenho do Painel do Professor + DocentIAH como interface/arquitetura (21/07/2026)

**Decisão:** O Painel do Professor (`/professor`) passa a ter quatro blocos com função clara — Card de identidade, seis Atalhos rápidos (Turmas, Aulas, Missões, Sondagens, Devolutivas, DocentIAH), "Hoje no IAH" e "Precisa da sua atenção" (dados reais de `modules/assessment`, sem número inventado) — antes das seções já existentes (Turmas, Acompanhamento da turma, Integrações). **DocentIAH** nasce como o núcleo futuro da experiência docente, em `/professor/docente-iah`: oito tarefas nomeadas (nunca um chat genérico), "Continuar de onde parei"/"Rascunhos recentes" (lidos dos mesmos repositórios locais de `modules/lesson`/`modules/authoring` que já alimentam `/professor/aulas` e `/professor/estudio`), Turmas relacionadas e um espaço reservado para sugestões futuras. O Planejamento Anual deixa de ser atalho isolado do Painel e passa a viver na hierarquia `DocentIAH → Planejar → Aula/Sequência didática/Unidade/Bimestre/Planejamento anual` (`/professor/docente-iah/planejar/[nivel]`), com o nível "Planejamento anual" apontando para o Currículo Vivo real (`/professor/curriculo`) em vez de duplicá-lo. "Biblioteca Oficial" e "Indicadores da Turma" (Analytics) saem do Painel — indicadores analíticos avançados seguem exclusivos da Gestão. Nesta etapa, DocentIAH e a nova rota `/professor/devolutivas` são **só interface e arquitetura de navegação**: nenhum provedor de IA foi conectado, nenhuma chamada externa foi feita, o AI Gateway não foi tocado. Onde uma ferramenta real já resolve parte de uma tarefa do DocentIAH hoje (Aulas, Estúdio de Missões, Sondagens, Currículo Vivo), a tela da tarefa aponta para ela em vez de fingir uma IA que não existe (mesmo espírito de D-016).

**Motivo:** O grid único do Painel misturava atalhos reais, identidade e cards técnicos "Em breve" sem hierarquia — alta carga cognitiva para a rotina diária do professor. Pedido de produto explícito: reduzir essa carga e introduzir o DocentIAH como porta de entrada única e nomeada para "planejar, criar e acompanhar", preparando o terreno arquitetural para a IA pedagógica real sem implementá-la ainda.

**Alternativas descartadas:** manter Planejamento Anual como atalho isolado do Painel (rejeitado — falta hierarquia com os outros níveis de planejamento); conectar o DocentIAH a um provedor de IA já nesta etapa (rejeitado — fora do escopo pedido, e `ROADMAP.md` já registrava novas integrações de IA como não autorizadas até então); adicionar o DocentIAH também ao menu lateral global (`app-sidebar.tsx`) — decisão explícita de manter o escopo restrito ao Painel e às rotas do próprio DocentIAH nesta etapa.

**Impacto futuro:** Quando a inteligência pedagógica real entrar, só a camada de execução de cada tarefa do DocentIAH muda (`professor/docente-iah/tasks.ts` e as páginas `tarefa/[slug]`/`planejar/[nivel]`); a navegação, a nomenclatura das oito tarefas e a hierarquia de Planejar já estão fixadas. "Hoje no IAH" e "Precisa da sua atenção" podem ganhar mais fontes de sinal (Aulas, Missões) assim que esses módulos tiverem data/estado publicável consultável no servidor — hoje ambos vivem em `localStorage` client-side, por isso os dois blocos usam só `modules/assessment`.

## D-045 — DocentIAH: 4 cards principais + wizard de Avaliação com adaptação pedagógica (21/07/2026)

**Decisão:** Os oito cards de tarefa do DocentIAH (D-044) dão lugar a quatro cards principais: **Apresentação de slides**, **Avaliação**, **Plano de aula** (sucede "Criar uma aula") e **Adaptar material** (sucede "Adaptar uma atividade"). "Criar uma missão", "Criar uma rubrica", "Preparar uma devolutiva" e "Relacionar competências" saem da grade — Missões e Devolutivas já são alcançáveis pelo Painel do Professor; "Organizar uma sequência didática" vira um link secundário do card "Plano de aula", preservando o acesso à hierarquia Planejar (D-044) sem mantê-la como card principal. Terminologia do produto passa a usar exclusivamente "Avaliação"/"Avaliações" — nunca "Prova"/"Provas" (grep confirmou que o termo nunca foi usado como vocabulário de produto no código).

O card "Avaliação" abre um wizard próprio (`/professor/docente-iah/avaliacao`, 5 etapas, mesmo padrão de estado local do Montador de Aula — `useState`, sem repositório/autosave): (1) Sobre a avaliação — disciplina, ano/série, tema, quantidade de questões, todos obrigatórios; (2) Formato e critérios — tipos de questão, dificuldade, valor total, todos obrigatórios; (3) Detalhes opcionais — objetivos, duração, contexto da turma, instruções, competências, materiais de referência; (4) **Adaptações pedagógicas** — checkbox "Criar versão adaptada para alunos neurodivergentes" que revela 11 opções configuráveis (linguagem mais direta, enunciados mais curtos, uma instrução por vez, maior espaçamento visual, menor quantidade de questões por página, destaque de palavras-chave, divisão em blocos, redução de distrações visuais, apoio visual, tempo ampliado, alternativas com maior legibilidade) + campo livre de necessidades específicas, sempre acompanhadas das cinco regras pedagógicas fixas (não reduz objetivos automaticamente, não infantiliza a linguagem, preserva conteúdo essencial e critérios avaliativos, distingue adaptação de acessibilidade de redução curricular, o professor revisa e aprova antes do uso) e do aviso obrigatório "A adaptação deve considerar as necessidades individuais do estudante e as orientações pedagógicas da instituição."; (5) Pré-visualização estrutural dos parâmetros + a seção "Saída prevista" (avaliação original, gabarito, critérios de correção, versão adaptada quando selecionada, versão pronta para impressão) terminando num botão desabilitado "Gerar avaliação — em breve" (D-016). Nenhuma questão é de fato gerada nesta etapa.

**Motivo:** Ajuste de escopo pedido explicitamente pelo responsável pelo produto: menos cards, mais foco nas quatro ações centrais do dia a dia docente, e a Avaliação como o primeiro fluxo do DocentIAH detalhado o bastante para já expor a política de adaptação pedagógica (acessibilidade sem infantilização, sem redução curricular disfarçada) antes de qualquer geração real existir.

**Alternativas descartadas:** manter as oito tarefas e só adicionar a Avaliação como nona (rejeitado — contraria o pedido explícito de reduzir para quatro cards principais); modelar `AvaliacaoDraft` reaproveitando `LessonAssessment`/`AssessmentQuestion` de `modules/assessment` (rejeitado — aquele agregado representa uma avaliação já autorada e versionada, formato incompatível com parâmetros de uma geração ainda não executada); adicionar um shadcn `Checkbox` novo (rejeitado — o projeto não tem esse primitivo instalado e todo o código existente já resolve toggles com `<input type="checkbox">` em tile, D-045 segue o mesmo padrão); exigir uma aprovação bloqueante do professor já nesta etapa (rejeitado — não há nada para aprovar ainda, já que a geração não está conectada; a regra de aprovação fica registrada como texto, para valer quando a geração real existir).

**Impacto futuro:** Quando a geração real entrar, `AvaliacaoDraft` (`professor/docente-iah/avaliacao/types.ts`) é o contrato de entrada natural para o motor de geração, e o botão "Gerar avaliação" na etapa 5 é o único ponto que precisa de uma ação real. A validação de aprovação docente antes do uso da versão adaptada (hoje só texto) vira um passo obrigatório de fato nesse momento.
