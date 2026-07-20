# IAH — Sistema Oficial de Identidade Visual (M18.3)

Guia técnico dos ativos da marca. Complementa `docs/03_BRAND_GUIDELINES.md`
(estratégia, tom de voz, glossário); aqui vive o *como implementar* o
logotipo. Decisão registrada em `docs/DECISIONS.md` (D-036).

> **REGRA PERMANENTE — ATIVO PROTEGIDO**
> O logotipo oficial do IAH é um ativo institucional protegido. Nenhum
> agente de IA ou desenvolvedor poderá redesenhá-lo ou reinterpretá-lo.
> Toda implementação deverá utilizar exclusivamente os arquivos mestres
> aprovados listados abaixo.

## Fonte única de verdade

| Ativo | Arquivo | Papel |
|---|---|---|
| **Master vetorial** | `src/components/brand/logo.tsx` | Único lugar onde a geometria é definida. Toda cópia deriva dele. |
| Símbolo (componente) | `src/components/brand/symbol.tsx` | "Núcleo IAH" — mesma geometria do master, transladada (x−60, y+3), nenhum ponto redesenhado. |
| Logo Primary (estático) | `public/brand/logo-primary.svg` | Cópia gerada — fundos claros, documentos, exportação. |
| Logo Reverse (estático) | `public/brand/logo-reverse.svg` | Cópia gerada — fundos escuros. |
| Símbolo (estático) | `public/brand/symbol.svg` | Cópia gerada do Núcleo IAH. |
| Favicon | `src/app/icon.svg` | Núcleo IAH sobre navy, path idêntico ao master (escala 0.75 + margem). |
| Apple touch icon | `src/app/apple-icon.tsx` | PNG 180×180 gerado no build a partir do mesmo path. |
| Manifest | `src/app/manifest.ts` | Aponta para os ícones acima; não declara desenho novo. |

**Checklist ao alterar a geometria (só com aprovação do fundador):**
atualizar o master → regenerar `public/brand/*.svg` → `icon.svg` →
`apple-icon.tsx` → o SVG inline de `(marketing)/opengraph-image.tsx`.
Nunca editar uma cópia sem atualizar o master.

## Versões oficiais e quando usar

| Versão | Componente | Cor das letras | Uso |
|---|---|---|---|
| **Primary** | `<Logo variant="primary" />` (sinônimo: `"light"`) | Ink `#07101d` | Fundos claros: documentos, futura interface em Light Mode. |
| **Reverse** | `<Logo variant="reverse" />` (sinônimo: `"dark"`) | Branco | Fundos escuros: Landing, login, sidebar, dashboards (tema Premium Dark), splash/hero, eventos. |
| **Símbolo — Núcleo IAH** | `<BrandSymbol />` | idem variantes | Favicon, sidebar recolhida, loading, notificações, Mentor IA, certificados, ícone de app. |

O Núcleo IAH (triângulo ciano no interior do A) é o símbolo institucional
oficial da marca e usa **sempre** `--iah-cyan-400` (`#42e8f1`). O wordmark
EDUCACIONAL usa ciano sobre escuro e `--iah-teal-600` (`#097f90`) sobre claro.

## Fundos

- **Permitidos:** navy da marca (`--iah-navy-950`…`-600`) e superfícies
  escuras do tema → Reverse; branco e superfícies claras (`paper`, `mist`)
  → Primary.
- **Proibidos:** fotografias ou gradientes ruidosos sem véu de contraste;
  fundos ciano (o Núcleo desapareceria); qualquer cor fora de
  `src/styles/tokens.css`; recolorir letras ou Núcleo fora das variantes.

## Área de proteção e tamanho mínimo

- **Área de proteção:** manter livre, em todos os lados, o equivalente à
  largura da haste do "I" (34 unidades do viewBox ≈ 10% da largura).
- **Tamanho mínimo — logo completo:** 20px de altura (`h-5`) sem wordmark;
  48px com wordmark. Abaixo disso, usar o Núcleo IAH.
- **Regra responsiva:** desktop = logo completo; tablet = logo reduzido
  (ex.: `h-6 md:h-7` na Landing); sidebar recolhida = **somente o Núcleo
  IAH** (implementado em `layout/app-sidebar.tsx`). Nunca reduzir o
  logotipo completo a tamanhos ilegíveis.

## Proporções

- Logo sem wordmark: viewBox `0 0 1100 520`. Com wordmark: `0 0 1100 700`.
- Símbolo: viewBox quadrado `0 0 520 520`.
- Nunca esticar, condensar, rotacionar, adicionar sombra/contorno ou
  alterar `letter-spacing` do wordmark (30 unidades, peso 300, Geist).

## Nota de proveniência

O arquivo oficial `logoIAH1.png`, reapresentado pelo fundador em 19/07/2026,
é a autoridade visual. A geometria de `logo.tsx` foi corrigida nessa data
para refletir suas proporções, ápice e terminais arredondados, triângulo
interno maior e wordmark leve. Se um
vetor-fonte oficial (SVG/AI) for entregue no futuro, ele substitui o
conteúdo do master **uma única vez**, seguido do checklist de regeneração.
