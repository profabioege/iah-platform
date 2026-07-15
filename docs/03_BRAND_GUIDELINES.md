# 03 — Diretrizes de Marca

Guia estratégico de marca. Para a implementação técnica dos tokens (nomes de variáveis, arquivos, regras de consumo), ver [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — os dois documentos são complementares, não redundantes: aqui está o *porquê* e o *o quê* da marca; lá está o *como* implementá-la em código.

## Identidade da marca

IAH é a abreviação de **Inteligência Artificial & Humanidades**. A marca se apoia em três ideias: **laboratório** (investigação ativa, não sala de aula tradicional), **auditoria** (rigor crítico sobre o que se vê, inclusive sobre a própria IA) e **método** (processo estruturado, não improviso). O logótipo é um marcador minimalista de três barras verticais em ciano sobre navy, lembrando um equalizador/gráfico de laboratório.

## Linguagem — glossário de termos da marca

Termos cunhados pelo produto, sempre em português e sempre com a grafia abaixo (não traduzir, não abreviar de outra forma):

| Termo | Significado |
|---|---|
| Auditor(a) da Realidade | Papel do estudante: investiga, questiona, verifica |
| Missão | Unidade central de aprendizagem investigativa |
| Diário do Auditor | Espaço reflexivo pessoal do estudante |
| Caso da Semana | Situação real proposta para investigação |
| Radar IA | Sinais/notícias do mundo real trazidos à investigação |
| Mentor IA | Assistente de IA que apoia — nunca substitui — a investigação |
| Laboratório | Metáfora geral da plataforma (não uma tela específica) |

## Tom de voz

Direto, investigativo e sóbrio. Convida à curiosidade sem infantilizar o estudante de Ensino Médio. Evita jargão de gestão corporativa ("dashboard de performance", "KPIs de aprendizagem") e evita hype de marketing sobre IA ("revolucionário", "mágico"). Prefere perguntas a afirmações categóricas quando o objetivo é provocar investigação (ex.: "Se uma máquina escreve a notícia, quem responde pela verdade?").

Para a Landing (público institucional): confiante e específico, sem jargão vazio — fala com quem decide (diretor, coordenador, mantenedor). Para a Plataforma (público estudantil): curioso e investigativo — fala com quem investiga.

## Paleta

Fonte única de verdade: `app/src/styles/tokens.css`, primitivas `--iah-*`. Resumo:

- **Navy** (escala `--iah-navy-950` a `-600`, de `#06101f` a `#0e283d`) — fundo escuro predominante, tanto da Landing quanto do tema Premium Dark da Plataforma.
- **Cyan** (`--iah-cyan-400` `#42e8f1`, com variação de hover `-300` e suave `-200`) — cor primária da marca; usada em CTAs, destaques e no logótipo.
- **Teal** (`--iah-teal-600`) — variante de cyan legível sobre fundo claro.
- **Acentos de apoio** — verde (sucesso/status ativo), violeta e âmbar (dados/gráficos), vermelho (erro/destrutivo).
- **Superfícies claras** (`paper`, `mist`, `white`) — usadas no tema claro e em cards sobre fundo escuro.
- **Texto e bordas** — escala de `ink`/`fog`/`slate` para texto, `line`/`line-dark` para bordas.

Regra inegociável: nenhuma cor nova é declarada fora de `tokens.css`. Ver [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#regras-para-telas-futuras-obrigatórias).

## Tipografia

**Geist** (sans) para toda a interface; **Geist Mono** para rótulos técnicos/monoespaçados (eyebrows, badges, código). Sem serifas, sem fontes decorativas.

## Design System

O Design System (tokens, componentes shadcn/ui, convenções de consumo) é único e compartilhado entre Landing e Plataforma — ver [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) e a decisão de unificação em [07_DECISIONS.md](07_DECISIONS.md).

## Diretrizes de UX

- **Dark-first.** Premium Dark é a identidade visual principal hoje; Light Mode é suportado pelos tokens mas ainda não tem alternância funcional na interface (ver [07_DECISIONS.md](07_DECISIONS.md)).
- **Estética de laboratório, não de SaaS corporativo.** Sem fotos de banco de imagens, sem ilustrações genéricas de "gente sorrindo com laptop", sem telas de produto simuladas/fictícias na Landing.
- **App Shell consistente na Plataforma.** Sidebar fixa + header, responsiva (painel deslizante no mobile) — não reinventar navegação por tela.
- **Acessibilidade como parte do desenho**, não um adendo: alvos de toque ≥44px, contraste AA no mínimo, hierarquia clara de heading.
- **Mobile-first nas revisões**: toda tela nova é validada em viewport mobile antes de considerada pronta.

## Regras de nomenclatura

- **Código:** identificadores em inglês (`Mission`, `guidingQuestion`), com comentários em português mapeando aos conceitos de produto quando não óbvios (convenção estabelecida em [07_DECISIONS.md](07_DECISIONS.md)).
- **Produto/UI:** todo texto voltado ao usuário é em português, usando exatamente os termos do glossário acima.
- **Arquivos e rotas:** `kebab-case` para arquivos, `(grupo)` para route groups do Next.js, nomes de módulo alinhados aos contextos do domínio (ver [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md)).

## Conceitos proibidos

- Chamar a plataforma de "AVA", "LMS" ou "sistema de gestão escolar" em qualquer comunicação — contraria o posicionamento (ver [01_PRODUCT_VISION.md](01_PRODUCT_VISION.md)).
- Linguagem que sugira que a IA substitui o professor ou dá "respostas prontas".
- Fotos de banco de imagens genéricas ou telas de produto fictícias/simuladas em material de marketing.
- Hype de marketing sobre IA ("revolucionário", "mágico", "vai substituir X").
- Infantilização do estudante de Ensino Médio (linguagem, tom ou design "para criança").

## Consistência visual

Um único Design System serve os dois blocos do produto (Landing e Plataforma): mesma paleta, mesma tipografia, mesmos raios/sombras, mesma biblioteca de componentes (`components/ui`). Nenhum bloco pode divergir criando seu próprio vocabulário visual — essa divergência já aconteceu uma vez (ver histórico em [07_DECISIONS.md](07_DECISIONS.md)) e foi corrigida deliberadamente; não deve se repetir.
