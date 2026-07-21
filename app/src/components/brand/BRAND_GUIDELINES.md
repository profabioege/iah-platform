# IAH — Sistema Oficial de Identidade Visual

Guia técnico para uso dos ativos protegidos da marca IAH Educacional.

> O logotipo oficial é um ativo institucional protegido. Não redesenhar,
> reinterpretar, converter para CSS ou reproduzir sua geometria em JSX.

## Fonte única de verdade

Todos os consumidores usam exclusivamente os SVGs em `public/brand/`:

| Ativo | Uso |
|---|---|
| `logo.svg` | Versão oficial padrão |
| `logo-dark.svg` | Logotipo para fundos escuros |
| `logo-light.svg` | Logotipo para fundos claros |
| `favicon.svg` | Favicon e ícone do manifesto |
| `mark.svg` | Marca reduzida para espaços compactos |

`src/components/brand/logo.tsx` não contém geometria da marca. O componente
apenas seleciona e renderiza um dos arquivos oficiais acima.

## Componente

```tsx
<Logo size="sm" />
<Logo size="md" variant="dark" />
<Logo size="lg" variant="light" />
<Logo size="sm" mark />
```

- `size`: `sm`, `md` ou `lg`.
- `variant`: `default`, `dark` ou `light`.
- `mark`: usa a marca reduzida oficial.
- `className`: permitido apenas para layout e responsividade; não recolorir.

## Superfícies

- Login, Landing Page, Navbar, rodapé e Sidebar importam `Logo`.
- A Sidebar recolhida e o Mentor IAH usam `<Logo mark />`.
- Metadata e Manifest apontam para `public/brand/favicon.svg`.
- Open Graph referencia `public/brand/logo-dark.svg` diretamente.
- Não há Splash Screen dedicada. Uma futura implementação deve consumir
  `Logo` ou um arquivo de `public/brand/`, sem duplicar o SVG.

## Proteção e proporções

- Nunca editar paths isoladamente em uma tela.
- Nunca esticar, condensar, rotacionar ou aplicar filtros à marca.
- Manter `width: auto` ao alterar a altura.
- Abaixo do tamanho mínimo do logotipo completo, usar `mark.svg`.
