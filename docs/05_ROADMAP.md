# 05 — Roadmap

Plano de Sprints da Plataforma IAH. Cada Sprint listada aqui é um guia de escopo, não uma especificação fechada — o plano detalhado de implementação continua sendo apresentado e validado no início de cada Sprint, conforme [CLAUDE.md](../CLAUDE.md).

## Sprints concluídas (contexto)

| Sprint | Entrega |
|---|---|
| 1 | Estrutura inicial do projeto, App Shell da Plataforma (sidebar + header), Dashboard investigativo |
| 1.1 | Menu de Acessibilidade no Header (interface, sem persistência) |
| 1.5 | Consolidação arquitetural: separação Landing/Plataforma (route groups), formulário de conversão da Landing, SEO, Design System unificado, modelo de domínio, e esta documentação |

## Sprint 2 — Missões

**Objetivo:** Trazer a Missão — unidade central de aprendizagem do IAH — para dentro da Plataforma, substituindo os dados estáticos do Dashboard por uma experiência real de navegação e leitura de Missões.

**Entregas:**
- Tela de listagem de Missões de um Módulo (ordem, status, progresso visual).
- Tela de detalhe de uma Missão, estruturada pelos blocos padrão de [MISSION.md](MISSION.md): objetivo, pergunta norteadora, contexto, material didático, ferramentas de IA, desafio, produção do aluno, reflexão, entrega, competências.
- Ligação da Missão em destaque no Dashboard à sua tela de detalhe real (fim do dado estático "Continue sua Missão").

**Critérios de aceite:**
- [ ] A tela de detalhe reflete fielmente a entidade `Mission` já modelada em `modules/library/domain` (ver [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md)).
- [ ] Usa exclusivamente componentes de `components/ui` e tokens do Design System — nenhuma cor/estilo novo fora de `tokens.css`.
- [ ] Responsivo (mobile validado) e acessível (hierarquia de headings, contraste).
- [ ] Sem dados mockados não identificados como tal; sem banco de dados ainda, salvo decisão explícita em contrário no início da Sprint.

## Sprint 3 — Biblioteca

**Objetivo:** Disponibilizar o acervo de Material Didático como um espaço de consulta e pesquisa, sustentando a autoria e a investigação previstas nas Missões.

**Entregas:**
- Tela de Biblioteca com listagem/organização por coleções e tags.
- Busca e filtro por tipo de material.
- Ligação de materiais às Missões que os referenciam.

**Critérios de aceite:**
- [ ] Modelo de dados alinhado às entidades `Material Didático` e `Biblioteca` do [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md).
- [ ] Reutiliza os componentes de listagem/card já estabelecidos na Sprint 2, sem duplicar padrões visuais.
- [ ] Acessível e responsivo.

## Sprint 4 — Professor

**Objetivo:** Construir a experiência do papel Professor: acompanhar turmas, revisar produções e sustentar a condução pedagógica prevista em [02_PRODUCT_PRINCIPLES.md](02_PRODUCT_PRINCIPLES.md).

**Entregas:**
- Visão de turma(s) do professor, com progresso agregado dos alunos.
- Tela de revisão de Produção do Aluno (leitura + feedback).
- Navegação da Plataforma adaptada ao papel Professor (menu/sidebar).

**Critérios de aceite:**
- [ ] Escopo de dados restrito às turmas do professor autenticado (mesmo antes da autenticação real, o desenho já respeita esse limite — ver princípio de multi-tenancy em [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md)).
- [ ] Feedback do professor é visível ao aluno na Sprint seguinte, sem retrabalho de modelo.

## Sprint 5 — Aluno

**Objetivo:** Construir a experiência completa do papel Aluno: suas Missões, seu progresso e o início do portfólio.

**Entregas:**
- Visão consolidada "minhas Missões" com progresso por etapa.
- Tela de Produção do Aluno (criação/edição de entrega).
- Esboço de portfólio (agregação de produções).

**Critérios de aceite:**
- [ ] Produção do Aluno é tratada como imutável após entrega, com revisões versionadas (princípio P2 do domínio).
- [ ] Toda produção que envolva Ferramenta de IA registra o uso (princípio P4).

## Sprint 6 — Diário do Auditor

**Objetivo:** Implementar o espaço reflexivo pessoal do aluno, já anunciado na identidade do produto desde a Sprint 1.

**Entregas:**
- Tela do Diário do Auditor: linha do tempo de reflexões (entradas), vinculadas às Missões de origem.
- Registro de nova reflexão a partir de uma Missão concluída.
- Controle de privacidade (privado por padrão, conforme [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md)).

**Critérios de aceite:**
- [ ] Entradas são append-only (não editáveis destrutivamente) — preserva o valor pedagógico da trajetória.
- [ ] Não é reaproveitado como ferramenta de avaliação formal.

## Sprint 7 — Integrações

**Objetivo:** Conectar a Plataforma às ferramentas que a escola já usa: Google Classroom, Google Agenda e Canva.

**Entregas:**
- Configuração de Integração por Escola (ver entidade `Integração` no [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md)).
- Sincronização de prazos/eventos com Google Agenda.
- Importação de turmas via Google Classroom (quando aplicável).

**Critérios de aceite:**
- [ ] Falha de integração externa não quebra o fluxo pedagógico (degradação graciosa).
- [ ] Credenciais/tokens nunca expostos à camada de domínio ou ao cliente.

## Sprint 8 — Mentor IA

**Objetivo:** Introduzir o assistente de IA que apoia — sem substituir — a investigação do aluno, coerente com o princípio "a IA complementa o pensamento humano" ([02_PRODUCT_PRINCIPLES.md](02_PRODUCT_PRINCIPLES.md)).

**Entregas:**
- Interface do Mentor IA integrada ao fluxo de uma Missão/Etapa.
- Registro de uso (ferramenta, finalidade, se apoio ou autoria) por Produção.
- Orientação de uso ético visível ao aluno no momento do uso.

**Critérios de aceite:**
- [ ] Todo uso do Mentor IA gera um registro de proveniência (princípio P4 do domínio) — não é uma caixa de chat solta.
- [ ] A interface deixa claro, a qualquer momento, que a resposta da IA é ponto de partida para investigação, não conclusão.
