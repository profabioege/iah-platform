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
| **Geometria oficial** | `src/components/brand/official-paths.ts` | Cópia literal dos paths do vetor do fundador. Único lugar onde a geometria existe. |
| Master de aplicação | `src/components/brand/logo.tsx` | Monta o logotipo a partir da geometria oficial e resolve as variantes. |
| Símbolo (componente) | `src/components/brand/symbol.tsx` | "Núcleo IAH" — os mesmos paths, só com outra moldura (viewBox); nenhum ponto transladado ou escalado. |
| Logo Primary (estático) | `public/brand/logo-primary.svg` | Cópia gerada — fundos claros, documentos, exportação. |
| Logo Reverse (estático) | `public/brand/logo-reverse.svg` | Cópia gerada — fundos escuros. |
| Símbolo (estático) | `public/brand/symbol.svg` | Cópia gerada do Núcleo IAH. |
| Favicon | `src/app/icon.svg` | Núcleo IAH sobre navy, paths idênticos aos oficiais (escala 0,695 + margem). |
| Apple touch icon | `src/app/apple-icon.tsx` | PNG 180×180 gerado no build a partir dos mesmos paths. |
| Manifest | `src/app/manifest.ts` | Aponta para os ícones acima; não declara desenho novo. |

**Checklist ao substituir a geometria (só com novo arquivo oficial do
fundador):** atualizar `official-paths.ts` → regenerar `public/brand/*.svg`
→ `icon.svg` → conferir `apple-icon.tsx` e o SVG inline de
`(marketing)/opengraph-image.tsx` (ambos importam os paths, mas têm
molduras próprias). Nunca editar uma cópia sem atualizar a geometria.

## Versões oficiais e quando usar

| Versão | Componente | Cor das letras | Uso |
|---|---|---|---|
| **Primary** | `<Logo variant="primary" />` (sinônimo: `"light"`) | `--iah-brand-navy` (`#031d43`) | Fundos claros: documentos, futura interface em Light Mode. |
| **Reverse** | `<Logo variant="reverse" />` (sinônimo: `"dark"`) | Branco | Fundos escuros: Landing, login, sidebar, dashboards (tema Premium Dark), splash/hero, eventos. |
| **Símbolo — Núcleo IAH** | `<BrandSymbol />` | idem variantes | Favicon, sidebar recolhida, loading, notificações, Mentor IAH, certificados, ícone de app. |

O Núcleo IAH (triângulo no interior do A) é o símbolo institucional oficial
da marca. Núcleo e wordmark EDUCACIONAL usam **sempre a mesma cor**, o
acento oficial `--iah-brand-accent` (`#0093b0`), nas duas versões — é assim
no arquivo do fundador. Esses dois tokens de marca (`--iah-brand-navy` e
`--iah-brand-accent`) existem só para o logotipo e são independentes da
paleta de interface (`--iah-cyan-400` e afins), que segue inalterada.

## Fundos

- **Permitidos:** navy da marca (`--iah-navy-950`…`-600`) e superfícies
  escuras do tema → Reverse; branco e superfícies claras (`paper`, `mist`)
  → Primary.
- **Proibidos:** fotografias ou gradientes ruidosos sem véu de contraste;
  fundos ciano (o Núcleo desapareceria); qualquer cor fora de
  `src/styles/tokens.css`; recolorir letras ou Núcleo fora das variantes.

## Área de proteção e tamanho mínimo

- **Área de proteção:** manter livre, em todos os lados, o equivalente à
  largura da haste do "I" (108 unidades do viewBox ≈ 9% da largura).
- **Tamanho mínimo — logo completo:** 20px de altura (`h-5`) sem wordmark;
  48px com wordmark. Abaixo disso, usar o Núcleo IAH.
- **Regra responsiva:** desktop = logo completo; tablet = logo reduzido
  (ex.: `h-6 md:h-7` na Landing); sidebar recolhida = **somente o Núcleo
  IAH** (implementado em `layout/app-sidebar.tsx`). Nunca reduzir o
  logotipo completo a tamanhos ilegíveis.

## Proporções

Todas as molduras são recortes da mesma malha do arquivo oficial
(`0 0 1240 746`) — nenhuma envolve transformação da geometria:

- Logo com wordmark: viewBox `0 0 1240 746` (o do arquivo oficial).
- Logo sem wordmark: `0 0 1240 573` — mesma margem superior do oficial.
- Símbolo (Núcleo IAH): `178.5 0 578 573`.
- O wordmark EDUCACIONAL é **curva**, não texto: não depende de fonte e
  não tem `letter-spacing` para ajustar.
- Nunca esticar, condensar, rotacionar ou adicionar sombra/contorno.

## Nota de proveniência

O fundador entregou em **08/09/2026** o vetor oficial da marca
(`iah-educacional-positivo.svg` e `iah-educacional-reverso.svg`, wordmark
em curvas, fundo transparente). Ele substituiu a reconstrução anterior,
que era derivada do raster `logoIAH1.png` e divergia do oficial em pontos
mensuráveis: ápice do "A" arredondado e estourando o quadro (cortado pelo
viewBox), hastes finas demais, vão A–H estreito, wordmark subdimensionado
e cor de acento fora do artwork. Os paths em `official-paths.ts` são cópia
literal desse arquivo. Um novo vetor oficial só entra pelo checklist de
substituição acima.
