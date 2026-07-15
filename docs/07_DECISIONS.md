# 07 — Histórico de Decisões Arquiteturais

Registro cronológico das decisões arquiteturais do projeto, conforme exigido por [CLAUDE.md](../CLAUDE.md). Substitui o histórico de ADRs de [ARCHITECTURE.md](ARCHITECTURE.md) (arquivo mantido apenas como redirecionamento).

> **Nota de reconciliação (2026-07-14):** o arquivo anterior continha duas sequências de ADR numeradas de forma conflitante — "ADR-004/005/006" aparecia duas vezes, descrevendo arquiteturas **contraditórias** (uma com Landing e Plataforma separadas por route groups e servidor Next; outra com a raiz servindo só a página institucional, em modo `output: export` para WordPress). Isso indica que duas frentes de trabalho avançaram em paralelo sem visibilidade uma da outra. Verificado o código-fonte atual, a arquitetura **em vigor hoje** é a primeira (route groups + servidor). Este documento renumera as duas sequências em uma única linha do tempo coerente (`D-001` a `D-011`), marcando explicitamente o que foi superado.

## D-001 — Arquitetura modular por domínio (2026-07-13)

**Contexto:** Início da implementação do primeiro módulo da plataforma (Biblioteca), que gerencia as Missões do curso.

**Decisão:** Organizar o código da aplicação em módulos de domínio dentro de `app/src/modules/`, cada um com sua camada `domain/` separada de futuras camadas de aplicação e infraestrutura. `modules/library/domain/` contém apenas tipos e contratos: a entidade `Mission`, os DTOs e a interface `MissionRepository`. O domínio não conhece banco de dados, framework ou interface gráfica.

**Consequências:** Banco de dados e interface podem ser adicionados depois sem retrabalho no domínio. Novos módulos seguem o mesmo padrão (ver [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md), seção 2).

## D-002 — App Shell da Plataforma no Sprint 1 (2026-07-13)

**Contexto:** Sprint 1 pedia apenas a estrutura visual da Plataforma, sem funcionalidades, login, banco ou navegação real.

**Decisão:** App Shell (`SidebarProvider` + sidebar + header) montado como layout, com tema **Premium Dark** (paleta azul-carvão + acento ciano) como padrão. Menus da sidebar estáticos: Dashboard, Missões, Laboratório, Biblioteca, Diário do Auditor, Projetos, Mentor IA, Agenda, Perfil.

**Consequências:** Estabeleceu a identidade "laboratório de IA" da Plataforma, referência para todo desenho posterior (ver [03_BRAND_GUIDELINES.md](03_BRAND_GUIDELINES.md)).

## D-003 — Menu de Acessibilidade no Header (2026-07-14)

**Contexto:** Sprint 1.1 pedia um menu de Acessibilidade no header — apenas interface, sem persistência.

**Decisão:** Componente `AccessibilityMenu`, acionado por ícone `Accessibility` da Lucide (decisão de produto: representa inclusão ampla — leitura, foco, cognição — em vez do símbolo ♿, associado só a deficiência física). Três seções: Aparência (Modo Escuro/Claro/Sistema), Leitura (aumentar/diminuir fonte), Acessibilidade (alto contraste, reduzir animações, modo foco). Pontos de conexão futuros (`updatePreference`, `adjustFontSize`) já definidos para quando os efeitos forem implementados.

**Consequências:** Interface pronta; efeitos e persistência ainda não implementados — item aberto para Sprint futura. Reforça o princípio "acessibilidade é requisito obrigatório" (ver [02_PRODUCT_PRINCIPLES.md](02_PRODUCT_PRINCIPLES.md)).

## D-004 — Home institucional passa a ocupar a rota raiz sozinha *(superada por D-007)* (2026-07-14)

**Contexto:** A aplicação ganhou uma página institucional (Landing) para apresentação comercial do IAH a gestores escolares.

**Decisão, na época:** A rota raiz (`page.tsx`/`layout.tsx`) passou a renderizar somente a página institucional, sem os componentes de App Shell (sidebar/header) da Plataforma criados em D-002.

**Por que foi superada:** Essa decisão deixou a Plataforma (Dashboard, sidebar, App Shell) órfã — sem nenhuma rota que a servisse — e colidiu com a necessidade de a Landing e a Plataforma coexistirem no mesmo produto. Corrigido por D-007.

## D-005 — Exportação estática (`output: export`) para WordPress *(superada por D-008)* (2026-07-14)

**Contexto:** O domínio `iaheducacional.com.br` tinha uma Hospedagem WordPress contratada; a página institucional, nesse momento, não usava recursos de servidor.

**Decisão, na época:** Configurar `output: "export"` no Next.js, gerando `app/out/` como HTML/CSS/JS estático, publicável na hospedagem WordPress via upload de arquivos.

**Por que foi superada:** Export estático é incompatível com qualquer recurso de servidor — formulário de conversão com envio real de e-mail, e a própria Plataforma (autenticação, Supabase, integrações). Como ambos são exigências confirmadas do produto, o export estático se tornou um beco sem saída. Corrigido por D-008.

## D-006 — Tema WordPress como artefato de publicação temporário (2026-07-14)

**Contexto:** A Hospedagem WordPress contratada administra instâncias WordPress (não FTP simples), exigindo um tema para publicar conteúdo.

**Decisão:** Criado `wordpress-theme/iah-educacional/` — tema mínimo (`style.css`, `functions.php`, `header.php`, `footer.php`, `front-page.php`, `index.php`), sem plugins ou integrações, distribuído como `.zip` instalável pelo painel do WordPress.

**Consequências — ainda válida:** Este tema continua sendo o **artefato temporário** que mantém `iaheducacional.com.br` no ar. Ele não é atualizado automaticamente a partir do código Next.js; qualquer mudança na Landing precisa ser replicada manualmente aqui **até o deploy da aplicação Next.js assumir o domínio** (ver D-011).

## D-007 — Route Groups: Landing e Plataforma coexistem *(supersede D-004)* (2026-07-14)

**Contexto:** A Landing havia tomado a rota raiz sozinha (D-004), deixando a Plataforma do Sprint 1 órfã. As duas frentes precisavam coexistir sob o mesmo projeto, compartilhando Design System, sem refatoração profunda (opção deliberadamente mínima e pragmática para um MVP).

**Decisão:** Um único projeto Next.js, com **route groups** (não alteram URLs):
- `src/app/(marketing)/` — Landing pública, `page.tsx` serve `/`.
- `src/app/(platform)/` — Plataforma, App Shell sob wrapper `.dark`, `dashboard/page.tsx` serve `/dashboard`. É aqui que a futura autenticação entra.
- `src/app/layout.tsx` — raiz compartilhada: `<html>`, fontes, metadata base.

**Consequências:** Landing (`/`) e Plataforma (`/dashboard`) coexistem sem interferência, cada uma com seu layout. Estrutura detalhada em [04_ARCHITECTURE.md](04_ARCHITECTURE.md).

## D-008 — Remoção do `output: export`; aplicação Next com servidor *(supersede D-005)* (2026-07-14)

**Contexto:** O formulário de demonstração da Landing (envio real de e-mail) e a Plataforma definitiva (autenticação, Supabase, IA) exigem servidor. `output: export` (D-005) inviabilizava os dois.

**Decisão:** Remover `output: "export"` do `next.config.ts`. O projeto passa a ser uma aplicação Next.js com servidor (Node.js/Vercel), hospedando Site Institucional e Plataforma no mesmo deploy. **O WordPress (D-006) segue no domínio como solução temporária até o app Next assumir** — decisão explícita de produto, não um detalhe técnico.

**Consequências:** `/api/contato` (Resend), SSR, `robots.txt`, `sitemap.xml` e Open Graph dinâmico passam a funcionar em produção. O deploy-alvo exige runtime Node. Variáveis de ambiente necessárias: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_SITE_URL`.

**Nota de dev:** rodar `next build` com `next dev` ativo corrompe o cache `.next` (erro 500 em dev). Solução: parar o dev server antes do build, ou limpar `.next` e reiniciar.

## D-009 — Design System unificado, fonte única de verdade (2026-07-14)

**Contexto:** Após D-007, Landing e Plataforma tinham dois vocabulários visuais distintos — Landing com hex próprios, Plataforma com tokens shadcn em oklch (primário violeta). Dívida consciente, assumida naquele momento para respeitar o escopo mínimo.

**Decisão:** Criado `app/src/styles/tokens.css` como fonte única de verdade, em duas camadas: primitivas da marca (`--iah-*`) e tokens semânticos (contrato shadcn/ui), tema claro em `:root` e Premium Dark em `.dark`. **A Plataforma adotou a marca IAH**: primário passou de violeta para o cyan da marca (`#42e8f1`). O CSS da Landing parou de declarar literais estruturais, passando a referenciar os mesmos tokens.

**Consequências:** Mudança de marca acontece em um único arquivo e propaga para os dois blocos. Detalhes de consumo em [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) e [03_BRAND_GUIDELINES.md](03_BRAND_GUIDELINES.md).

## D-010 — Dark Mode como identidade principal; Light Mode com suporte planejado (consolidação, base: D-002 e D-009)

**Contexto:** O produto precisa de uma posição clara sobre tema visual, tanto para a marca (ver [03_BRAND_GUIDELINES.md](03_BRAND_GUIDELINES.md)) quanto para o menu de Acessibilidade (D-003), que já expõe a opção "Modo Claro" na interface.

**Decisão:** **Premium Dark é a identidade visual principal** do produto hoje — é o único tema efetivamente ativo (Plataforma via wrapper `.dark`; Landing com paleta escura fixa). Os tokens do tema claro já existem em `tokens.css` (`:root`) como **suporte planejado**, mas ainda **não há alternância funcional** entre os dois temas na interface — a opção "Modo Claro" do menu de Acessibilidade (D-003) ainda não produz efeito.

**Consequências:** Nenhuma tela nova deve depender de um "modo claro" funcional até essa alternância ser implementada; qualquer nova cor precisa, ainda assim, ser definida para os dois temas em `tokens.css` desde já, para não bloquear a ativação futura do Light Mode.

## D-011 — MVP para sala de aula precede a versão comercial (decisão de produto e de sequenciamento)

**Contexto:** O IAH está sendo construído como sistema de ensino real, não como demonstração de vendas.

**Decisão:** A Plataforma deve ser **utilizável em sala de aula** antes de qualquer investimento em escala comercial (vendas, onboarding self-service, planos pagos). O Roadmap ([05_ROADMAP.md](05_ROADMAP.md)) prioriza as Sprints que tornam o produto pedagogicamente funcional (Missões, Biblioteca, Professor, Aluno, Diário do Auditor) antes de Integrações e Mentor IA, que ampliam alcance mas não são pré-requisito para uma sala de aula piloto.

**Consequências:** Decisões de arquitetura devem favorecer "funciona de verdade para uma turma" sobre "escala para milhares de escolas" neste momento — sem, no entanto, contradizer os princípios de multi-tenancy já modelados em [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md) (P3), que continuam guiando o desenho para não travar a escala futura.
