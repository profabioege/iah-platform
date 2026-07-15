# 04 — Arquitetura

Descreve **o estado atual** da arquitetura técnica. Para o histórico de como se chegou a este estado, ver [07_DECISIONS.md](07_DECISIONS.md). Substitui a parte estrutural de [ARCHITECTURE.md](ARCHITECTURE.md) (arquivo mantido apenas como redirecionamento).

## Estrutura do projeto

```
IAH - Educacional/
├── app/                    ← aplicação Next.js (código-fonte único do produto)
├── docs/                   ← documentação (este conjunto de arquivos)
├── assets/                 ← recursos de marca/mídia (reservado)
├── wordpress-theme/        ← tema WordPress: artefato de publicação temporário
└── CLAUDE.md               ← regras gerais de desenvolvimento
```

A aplicação é um **único projeto Next.js** (App Router) hospedando dois blocos de produto — Site Institucional e Plataforma — mais a documentação e o artefato WordPress temporário, que vivem fora do código da aplicação.

## Organização das rotas (`app/src/app`)

```
src/app/
├── layout.tsx              ← raiz compartilhada: <html>, fontes, metadata base
├── globals.css             ← ponte Tailwind → tokens (ver docs/DESIGN_SYSTEM.md)
├── icon.svg, robots.ts, sitemap.ts  ← SEO/identidade, nível de aplicação
├── (marketing)/             ← SITE INSTITUCIONAL (bloco público)
│   ├── layout.tsx           ← metadata de marketing (title, Open Graph, canonical)
│   ├── page.tsx             ← landing → rota `/`
│   ├── contato/page.tsx     ← página de contato/demonstração → rota `/contato`
│   └── opengraph-image.tsx  ← imagem de compartilhamento gerada
├── (platform)/               ← PLATAFORMA IAH (sistema de ensino)
│   ├── layout.tsx            ← App Shell (sidebar + header) sob tema Premium Dark
│   └── dashboard/page.tsx    ← primeira tela da plataforma → rota `/dashboard`
└── api/
    └── contato/route.ts     ← endpoint do formulário de demonstração (Resend)
```

Route groups (`(marketing)`, `(platform)`) não aparecem na URL — servem apenas para dar a cada bloco seu próprio layout e metadata sem duplicar a raiz.

### `(marketing)` — Site Institucional

Público, sem autenticação. Objetivo: apresentar o IAH e converter visitantes em pedidos de demonstração (ver [01_PRODUCT_VISION.md](01_PRODUCT_VISION.md)). Novas páginas públicas (ex.: política de privacidade, página de imprensa) nascem aqui, cada uma com seu próprio `page.tsx` dentro do grupo.

Funil de conversão atual: todos os CTAs "Solicitar Demonstração" apontam para `/contato`, que exibe o formulário visual e os e-mails institucionais (contato@ e comercial@iaheducacional.com.br — também no rodapé `SiteFooter`, compartilhado pelas páginas do bloco). **Enquanto o Resend não está configurado**, o envio do formulário abre o e-mail do visitante via `mailto:` com o assunto "Solicitação de Demonstração - IAH"; o componente `demo-form` (Resend) e a rota `/api/contato` permanecem prontos e dormentes para a integração futura — para ativá-la, basta trocar o formulário da página de contato e definir `RESEND_API_KEY`.

### `(platform)` — Plataforma IAH

O sistema de ensino usado por professores e alunos. É aqui que entra a futura barreira de autenticação. Toda nova tela da Plataforma (Missões, Biblioteca, Diário do Auditor, etc. — ver [05_ROADMAP.md](05_ROADMAP.md)) nasce como uma nova rota dentro deste grupo, herdando o App Shell automaticamente.

### `api/`

Rotas de servidor (Route Handlers). Hoje: `contato` (envio de e-mail via Resend). Futuras integrações de backend (Supabase, IA, integrações externas) seguem o mesmo padrão: uma pasta por recurso.

## Componentes

```
src/components/
├── ui/          ← biblioteca única de componentes (shadcn/ui) — usada pelos DOIS blocos
├── layout/      ← composições exclusivas da Plataforma (sidebar, header, menu de acessibilidade)
└── marketing/   ← composições exclusivas da Landing (navegação, formulário de demonstração)

src/lib/         ← utilitários e configuração (site.ts, utils.ts, integrações futuras)
src/modules/     ← módulos de domínio (ex.: modules/library — ver 06_DOMAIN_MODEL.md)
src/styles/      ← tokens.css, fonte única de verdade do Design System
```

Regra de dependência: `layout/` e `marketing/` podem importar de `ui/`; nunca o inverso. `ui/` não conhece Landing nem Plataforma.

## Shared UI (Design System)

Landing e Plataforma consomem exatamente o mesmo Design System — mesma paleta, tipografia, raios, sombras e biblioteca de componentes. Detalhes em [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) e [03_BRAND_GUIDELINES.md](03_BRAND_GUIDELINES.md). Nenhum dos dois blocos declara cor, fonte ou raio fora de `src/styles/tokens.css`.

## Domínio

O código de domínio (entidades, contratos de repositório) vive em `src/modules/*`, um módulo por contexto delimitado, independente de UI e de banco de dados. Ver o mapeamento completo dos contextos em [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md), seção 2. Hoje existe `modules/library` (entidade `Mission`); os demais contextos (Identidade & Acesso, Instituição, Aprendizagem & Entrega, Colaboração, Acervo, Operação) serão criados conforme as Sprints do [05_ROADMAP.md](05_ROADMAP.md) os exigirem.

## Estratégia de crescimento

1. **Novas telas da Plataforma** entram sob `(platform)/`, herdando o App Shell — nunca duplicam sidebar/header.
2. **Novas páginas públicas** entram sob `(marketing)/`.
3. **Novo domínio de negócio** vira um novo diretório em `src/modules/`, com sua própria camada `domain/` (entidades + contratos), seguindo o padrão de `modules/library`.
4. **Nenhuma cor, fonte, raio ou sombra nova** é declarada fora de `tokens.css` — mudanças de marca acontecem em um único arquivo e propagam para os dois blocos.
5. **Multi-tenancy (Escola) é uma restrição de domínio**, não apenas de banco: qualquer nova funcionalidade que toque dados de aluno/professor deve considerar o escopo de Escola desde o desenho (ver [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md), princípio P3).
6. **WordPress é temporário.** O objetivo declarado é a aplicação Next.js substituir completamente o site institucional atual; novas funcionalidades de marketing não devem ser construídas no WordPress (ver [07_DECISIONS.md](07_DECISIONS.md)).
7. **Autenticação e Supabase** ainda não estão implementados; quando entrarem, a barreira de acesso se instala no layout de `(platform)/`, sem exigir mudança na Landing.
