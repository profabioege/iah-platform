# Design System IAH

Fonte única de verdade visual para os dois blocos do produto — **Site Institucional (Landing)** e **Plataforma IAH**. Estabelecido em [07_DECISIONS.md](07_DECISIONS.md) (D-009). Ver também [03_BRAND_GUIDELINES.md](03_BRAND_GUIDELINES.md) para o porquê estratégico da marca.

## Onde vive

```
app/src/
├── styles/tokens.css        ← FONTE ÚNICA DE VERDADE (cores, fontes, raios, sombras, espaçamentos)
├── app/globals.css          ← ponte Tailwind → tokens + CSS específico da Landing (só consome tokens)
└── components/
    ├── ui/                  ← biblioteca única de componentes (shadcn/ui) — usada pelos dois blocos
    ├── layout/              ← composições da Plataforma (sidebar, header, menu de acessibilidade)
    └── marketing/           ← composições da Landing (nav, formulário de demonstração)
```

## As duas camadas de tokens

**Camada 1 — Primitivas da marca (`--iah-*`)** em `tokens.css`: os valores brutos da identidade IAH. É o único lugar do projeto onde cor/hex, fonte, raio e sombra são declarados como literais.

- **Cor:** escala navy (`--iah-navy-950…600`), marca `--iah-cyan-400` (+ `-300` hover, `-200` soft), `--iah-teal-600` (cyan legível em fundo claro), acentos de apoio (`green`, `violet`, `amber`, `red`), superfícies claras (`paper`, `mist`, `white`), texto (`ink`, `fog`, escala `slate`), bordas (`line`, `line-dark`).
- **Tipografia:** `--iah-font-sans` (Geist) e `--iah-font-mono` (Geist Mono). As fontes do next/font são anexadas ao `<html>` (nunca ao `<body>` — ver Armadilhas).
- **Raio:** `--iah-radius-sm|md|lg|xl` (7/10/13/17px).
- **Sombras:** `--iah-shadow-card|panel|glow`.
- **Espaçamento:** `--iah-section-y` e `--iah-section-y-mobile` para seções da Landing; espaçamentos de componente usam a escala padrão do Tailwind.

**Camada 2 — Tokens semânticos** em `tokens.css`: o contrato shadcn/ui (`--background`, `--primary`, `--card`, `--sidebar…`, `--chart-1…5`, `--radius`), definido **apenas** por referência às primitivas:

- `:root` = tema claro (paper/ink, primário cyan).
- `.dark` = tema **Premium Dark** (navy/fog, primário cyan) — ativado pelo wrapper `.dark` no layout da Plataforma.

## Como cada bloco consome

- **Plataforma:** componentes shadcn/ui + utilitários Tailwind (`bg-primary`, `text-muted-foreground`…), que resolvem para os tokens semânticos via `@theme inline` no `globals.css`.
- **Landing:** classes CSS próprias (escopo `.site`) cujos valores estruturais (fundos, botões, cards, inputs, fontes, raios, sombras, padding de seção) referenciam os mesmos tokens. Os aliases legados (`--cyan`, `--navy`, `--ink`…) apontam para primitivas.
- Resultado: o botão primário da Landing e o `<Button>` da Plataforma usam literalmente `--primary`/`--primary-foreground` — mudar a marca em `tokens.css` muda os dois blocos de uma vez.

## Regras para telas futuras (obrigatórias)

1. **Nunca declarar cor/hex, fonte, raio ou sombra literal** em componente ou CSS novo. Se precisar de um valor que não existe, adicione uma primitiva em `tokens.css` primeiro.
2. **Componentes de interface vêm de `components/ui`** (adicionados via CLI do shadcn). Composições específicas de bloco vivem em `components/layout` (Plataforma) ou `components/marketing` (Landing) e são montadas a partir de `ui` + tokens.
3. **Tema escuro** é o wrapper `.dark` (já aplicado pelo layout da Plataforma). Não criar variáveis de tema paralelas.
4. **Novas telas da Plataforma** usam utilitários semânticos do Tailwind (`bg-card`, `border-border`…), nunca cores cruas (`bg-[#...]`, `bg-cyan-400`).
5. Exceção consciente: variações decorativas com alpha (gradientes, glows da Landing) podem derivar localmente dos matizes da marca via `rgba(...)`, pois são derivações — nunca cores novas.

## Armadilhas conhecidas

- **Fontes no `<html>`:** custom properties são resolvidas por elemento; um token em `:root` que referencia `--font-geist-sans` fica inválido se a variável do next/font estiver no `<body>`. As classes de fonte devem permanecer no `<html>` (`app/src/app/layout.tsx`).
- O `dropdown-menu` (Base UI) exige `render` (não `asChild`) e `DropdownMenuLabel` dentro de grupos — ver [07_DECISIONS.md](07_DECISIONS.md) (D-003).
