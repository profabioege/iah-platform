# HANDOFF — IAH Educacional

Documento único de transição de contexto. Escrito para que uma nova conversa (ou uma nova pessoa) retome o projeto sem precisar reconstruir nada do histórico. Se este documento divergir do código, o código manda — mas a divergência deve ser corrigida aqui.

Para o dia a dia, os documentos vivos continuam sendo `VISION.md`, `PRODUCT.md`, `ROADMAP.md`, `STATUS.md` e `DECISIONS.md` (`CHANGELOG.md` para o histórico entrega-a-entrega). Este HANDOFF é o resumo de entrada única; aqueles são a fonte de verdade contínua.

---

## 1. Visão geral do projeto

**IAH (Inteligência Artificial & Humanidades)** é um sistema de ensino — não um AVA, não um chatbot — para a disciplina de IA no Ensino Médio. O estudante assume o papel de **Auditor da Realidade**: investiga, verifica evidências e produz conhecimento, usando IA como objeto de estudo e apoio crítico, nunca como fonte de resposta pronta.

**Objetivo comercial que organiza tudo hoje:** fechar um piloto com o mantenedor da escola onde o fundador já leciona a disciplina, em **agosto/2026**. Toda decisão de produto responde primeiro: *"isso melhora a demonstração/o uso real em sala de aula em agosto?"*

Detalhes completos de propósito, público-alvo, diferenciais e critérios de aceitação de funcionalidades: `VISION.md`.

## 2. Estado atual do produto

Dois blocos, um único projeto Next.js:

- **Site Institucional (Landing)** — pitch comercial completo: Hero desambiguada, seções de diferenciais/como funciona/implantação/confiança, e um funil de conversão dedicado em `/demonstracao`.
- **Plataforma IAH** — executa uma jornada completa de aula para a Missão 01 ("A Fábrica de Notícias", com Dossiê de Auditoria completo): aluno faz login simples, vê a missão ativa, investiga, produz, reflete, conclui; professor acompanha a turma num painel dedicado.

Nenhuma autenticação real, nenhum banco de dados. Persistência do aluno em `localStorage` do dispositivo; turma do professor é simulada (dados fictícios autorizados, rotulados como "Turma de demonstração").

Estado minuto-a-minuto (último commit, último deploy, lacunas, riscos, próxima tarefa): **sempre consultar `STATUS.md`** — é o documento mais atualizado e não duplicado aqui.

## 3. Arquitetura

Aplicação **Next.js 15 (App Router)** com servidor (Node/Vercel), route groups separando os dois blocos sem afetar a URL:

- `(marketing)` — bloco público. `/` (Landing), `/demonstracao` (funil de conversão principal), `/contato` (formulário legado, sem links apontando para ele), `/api/contato` (Route Handler de envio de e-mail).
- `(platform)` — sistema de ensino. `/entrar` (abertura, fica fora dos dois grupos), `/dashboard`, `/missoes`, `/missoes/[id]`, `/diario`, `/professor`. É aqui que a futura autenticação entra, no layout do grupo.
- Raiz compartilhada (`src/app/layout.tsx`) — só `<html>`, fontes, metadata base.

Domínio da aplicação vive em `src/modules/*`, um diretório por contexto, cada um com `domain/` (entidades + contratos, sem UI/banco) separado de `infrastructure/` (implementação atual — hoje local/simulada). Trocar a fonte de dados por um banco é trocar a injeção, nunca a UI.

Landing e Plataforma **compartilham um único Design System** (`src/styles/tokens.css`) — mesma paleta, tipografia, raios, sombras e biblioteca de componentes (`components/ui`). Nenhuma cor/fonte/raio novo é declarado fora desse arquivo.

Detalhe completo (regras de dependência, estratégia de crescimento): `PRODUCT.md`. Histórico de como se chegou aqui: `DECISIONS.md`.

## 4. Estrutura de pastas

```
IAH - Educacional/
├── app/                          ← aplicação Next.js (todo o código do produto)
│   └── src/
│       ├── app/
│       │   ├── layout.tsx, globals.css, icon.svg, robots.ts, sitemap.ts
│       │   ├── entrar/page.tsx
│       │   ├── (marketing)/      ← Landing, /demonstracao, /contato, OG image
│       │   ├── (platform)/       ← dashboard, missoes, diario, professor
│       │   └── api/contato/      ← Route Handler (Resend, dormente)
│       ├── components/
│       │   ├── ui/               ← shadcn/ui, compartilhado pelos 2 blocos
│       │   ├── brand/logo.tsx    ← marca oficial, SVG num único arquivo
│       │   ├── layout/           ← sidebar, header, menu de acessibilidade (Plataforma)
│       │   └── marketing/        ← nav, rodapé, formulários (Landing)
│       ├── content/missions/     ← conteúdo pedagógico versionado em arquivo
│       ├── modules/
│       │   ├── library/          ← Mission (entidade + repositório local)
│       │   └── classroom/        ← StudentWork + ClassMonitor (aluno/professor)
│       ├── lib/                  ← site.ts (config/SEO), utils.ts
│       └── hooks/
├── docs/                         ← toda a documentação (este arquivo incluso)
├── assets/                       ← recursos de marca/mídia (reservado)
├── wordpress-theme/              ← tema WordPress temporário (domínio antigo)
└── CLAUDE.md                     ← regras gerais de desenvolvimento do projeto
```

## 5. Tecnologias utilizadas

- **Next.js 15.5** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (sobre **Base UI**, não Radix — atenção às peculiaridades de API, ex.: `render` em vez de `asChild`)
- **lucide-react** (ícones)
- **Resend** (SDK instalado, rota pronta, envio real ainda dormente)
- **@supabase/supabase-js** e **@supabase/ssr** (instalados, **não configurados/usados ainda**)
- Hospedagem: **Vercel**; versionamento: **Git/GitHub**

## 6. Funcionalidades implementadas

- **Landing comercial completa**: Hero com desambiguação imediata ("não é AVA, não é chatbot, é sistema completo"), CTA logo após a Hero, seção de 6 pilares, "como funciona" (5 etapas), "implantação em 4 passos", bloco de confiança, CTA final — todos os CTAs apontando para `/demonstracao`.
- **`/demonstracao`**: formulário de 8 campos, confirmação inline profissional, e-mails institucionais, SEO própria, no sitemap.
- **Identidade visual oficial**: componente `Logo` (variantes clara/escura + wordmark), aplicado em sidebar, header/rodapé, `/entrar`, favicon, Open Graph.
- **`/entrar`**: abertura da Plataforma, sem autenticação real.
- **Dashboard**: Missão ativa real (não estático), progresso do dispositivo, estados iniciada/em andamento/concluída, skeleton de carregamento.
- **Missões** (`/missoes`, `/missoes/[id]`): Missão 01 completa com os 11 blocos + Dossiê de Auditoria (4 itens de investigação — 2 autênticos, 2 fabricados; chave de correção só em comentário de código, nunca exposta ao aluno), Guia de Investigação, Critérios de Auditoria.
- **Produção do Aluno**: autosave, entrega datada, reabertura.
- **Reflexão + Diário do Auditor** (`/diario`): liberada após a entrega da produção; unificada num único registro (`MissionWorkspace`) para não sobrescrever produção/reflexão.
- **Painel do Professor** (`/professor`): 8 estados, contadores-filtro, último acesso, abertura de produção/reflexão por aluno (turma simulada).
- **CI/CD completo**: push na `main` → deploy automático na Vercel.

Lista viva e mais detalhada: `STATUS.md` → "Funcionalidades prontas". Histórico entrega-a-entrega: `CHANGELOG.md`.

## 7. Funcionalidades pendentes

- **Autenticação real** (Supabase) e persistência em banco — hoje tudo é `localStorage`/simulado.
- **Biblioteca**, **Projetos**, **Mentor IA**, **Agenda**, **Perfil**, **Laboratório** — itens da sidebar marcados "Em breve" e desabilitados (honestos, não clicáveis à toa).
- **Modo Claro funcional** — tokens existem, sem alternância na interface.
- **Efeitos do Menu de Acessibilidade** — interface pronta, nenhum efeito persiste ainda.
- **Envio real por Resend** — falta `RESEND_API_KEY`; formulários operam em `mailto:`.
- **Segunda Missão** — validar que "cadastrar arquivo de conteúdo" escala sem tocar em UI.
- **Virada de domínio** (`iaheducacional.com.br` → Next, saindo do WordPress temporário).

Backlog priorizado completo: `ROADMAP.md`.

## 8. Decisões técnicas relevantes

Resumo das mais importantes (histórico completo com motivo/alternativas/impacto em `DECISIONS.md`, entradas D-001 a D-018+):

- **Arquitetura modular por domínio** (D-001): `domain/` nunca conhece banco/UI.
- **Route groups** para Landing e Plataforma coexistirem num único projeto Next com servidor (D-007, D-008) — `output: export` foi tentado e abandonado por inviabilizar formulário com envio real e a própria Plataforma.
- **Design System unificado** (D-009): fonte única em `tokens.css`; a Plataforma adotou a marca IAH (cyan), abandonando um tema violeta anterior.
- **Premium Dark é a identidade principal**; Light Mode é suporte planejado, não ativo (D-010).
- **MVP de sala de aula/demonstração precede escala comercial** (D-011, D-014) — pivô de um roadmap temático original para entregas ordenadas pela jornada mínima de uma aula.
- **Dados simulados são um padrão de transição explícito e rotulado** (D-015) — nunca dado fictício silencioso.
- **Itens de navegação não construídos são explicitamente "Em breve"**, nunca um link morto silencioso (D-016).
- **Skeleton de carregamento** em qualquer tela que dependa de leitura client-side antes de existir banco (D-017).
- **Consolidação de documentação** em 5 arquivos oficiais, substituindo um conjunto fragmentado e por vezes desatualizado (D-018).
- **Base UI (não Radix)** por baixo do shadcn/ui: `render` no lugar de `asChild`; `DropdownMenuLabel` exige estar dentro de `Group`/`RadioGroup`.

## 9. Convenções adotadas

- **Português na interface e no domínio de produto** (nomes de conceito: Missão, Diário do Auditor, Auditor da Realidade); **inglês no código** (identificadores, nomes de tipos/funções).
- **Uma Missão = um arquivo de conteúdo** em `src/content/missions/`, registrado no índice — nenhuma tela muda ao adicionar uma nova.
- **Toda fonte simulada/local implementa o mesmo contrato** que a futura fonte real (`MissionReader`, `ClassMonitorReader`) — a troca é uma injeção, nunca a UI.
- **Nenhuma cor/fonte/raio/sombra nova fora de `tokens.css`.**
- **Links de navegação usam `<Link>` real com `buttonVariants`**, nunca o componente `Button` do shadcn com `render` para navegação (gera aviso de acessibilidade no Base UI).
- **Dados simulados/fictícios são sempre identificados como tal** na interface (ex.: "Turma de demonstração"), nunca apresentados como reais.
- **Commits descritivos em português**, prefixo de tipo (`feat`, `fix`, `docs`) + escopo.
- Regras gerais herdadas de `CLAUDE.md`: nunca criar funcionalidade não solicitada, sempre explicar o plano antes de implementar, simplicidade sobre completude prematura.

## 10. Fluxo de deploy

**Desenvolvimento → Git → GitHub → Vercel → Validação → Produção.**

- Repositório: `github.com/profabioege/iah-platform` (privado).
- Vercel conectada ao GitHub; **Root Directory: `app`** (crítico — o projeto Next vive na subpasta).
- Push na `main` → build e deploy automático em **https://iah-platform.vercel.app** (ambiente oficial de homologação).
- Domínio definitivo `iaheducacional.com.br` **ainda serve o WordPress temporário** — virada de DNS pendente, checklist completo em `DEPLOY.md`.
- Toda entrega é validada no navegador real na Vercel antes de ser considerada concluída (não só build local).
- **Cuidado de dev:** rodar `next build` com `next dev` ativo corrompe o cache `.next` (erro 500). Parar o dev server antes do build, ou limpar `.next` e reiniciar.

## 11. Variáveis de ambiente

Nenhuma é obrigatória para o site subir — cada ausência apenas desliga a funcionalidade correspondente (ver `app/.env.example`):

| Variável | Para quê | Sem ela |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URLs canônicas, sitemap, OG | autodetecta a URL da Vercel |
| `RESEND_API_KEY` | Envio real dos formulários (`/api/contato`) | formulários seguem em `mailto:` |
| `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` | Destino/remetente via Resend | usa `contato@iaheducacional.com.br` / remetente de teste |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Botão de WhatsApp (componente pronto, não usado no fluxo atual) | botão não aparece |

Reservadas para o futuro, ainda não usadas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, credenciais de Google Classroom/Canva.

Segredos existem **só** em `app/.env.local` (gitignored) e no painel da Vercel — nunca em código ou commit.

## 12. Próximos milestones

1. **Ensaio cronometrado da demonstração de agosto** — percorrer o funil completo (Landing → `/demonstracao` → Entrar → Dashboard → Missão → hipótese/veredito nos 4 itens do Dossiê → manchete gerada → Reflexão → Painel do Professor) com tempo real medido; a Landing cresceu e a meta de 15 minutos precisa ser reconfirmada.
2. Corrigir a observação de SEO pendente (título sem sufixo em subpáginas do bloco `(marketing)`).
3. Pós-piloto (sem data, ordem no `ROADMAP.md`): Biblioteca → Autenticação real → Persistência em banco → Segunda Missão → privacidade do Diário → Projetos → Integrações → Mentor IA → Modo Claro → virada de domínio.

## 13. Principais riscos

- **Dados do aluno só no dispositivo** (localStorage): trocar de navegador/computador perde o progresso. Aceitável para demonstração pontual; inviável para uso continuado em turma real.
- **Painel do Professor usa turma fictícia**: qualquer demonstração precisa deixar claro que os alunos ali são simulados.
- **Sem autenticação**: qualquer pessoa com a URL acessa `/professor` e `/dashboard` — aceitável para demonstração controlada, não para uso público.
- **Formulários em `mailto:`**: dependem do cliente de e-mail do visitante estar configurado no dispositivo; sem confirmação de entrega real até o Resend ser ativado.
- **Janela de contexto**: este documento existe justamente porque o histórico de decisões é grande — qualquer nova sessão deve ler `STATUS.md` + este HANDOFF antes de propor mudanças, para não repetir decisões já tomadas e descartadas (ver `DECISIONS.md`).

## 14. Checklist para continuidade

Antes de implementar qualquer coisa numa nova sessão:

- [ ] Ler `STATUS.md` (estado exato, último commit/deploy, próxima tarefa recomendada).
- [ ] Ler este `HANDOFF.md` inteiro.
- [ ] Consultar `VISION.md` antes de aceitar/rejeitar qualquer nova funcionalidade proposta.
- [ ] Consultar `PRODUCT.md` para arquitetura, Design System e convenções antes de tocar em código.
- [ ] Consultar `ROADMAP.md` para a próxima prioridade real (não reinventar sequenciamento).
- [ ] Verificar `DECISIONS.md` antes de propor algo que pareça "óbvio" — pode já ter sido tentado e descartado (ex.: `output: export`, tema violeta).
- [ ] Depois de qualquer entrega: rodar `npx tsc --noEmit`, `npm run lint`, `npm run build` (com o dev server **parado**).
- [ ] Validar no navegador (local e, após deploy, na Vercel) — nunca considerar concluído só com build verde.
- [ ] Commit descritivo → push → aguardar deploy automático → validar na URL de produção.
- [ ] Atualizar `STATUS.md` e `CHANGELOG.md` ao final da tarefa — sempre, sem exceção.
