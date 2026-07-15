# 02 — Princípios de Produto

Princípios que orientam toda decisão de produto e engenharia do IAH. Quando um princípio e uma conveniência técnica entrarem em conflito, o princípio vence — ou a decisão sobe para discussão explícita antes de virar código.

## Pedagógicos

**O IAH não é um AVA.** Um Ambiente Virtual de Aprendizagem organiza conteúdo. O IAH organiza **investigação**. Se uma funcionalidade só serve para "pendurar arquivo" ou "postar aviso", ela não pertence ao núcleo do produto.

**O conteúdo é protagonista.** A tecnologia existe para servir a metodologia e o material autoral — nunca o contrário. Nenhuma funcionalidade deve competir por atenção com a Missão em curso.

**A IA complementa o pensamento humano, não o substitui.** Toda ferramenta de IA na plataforma é objeto de estudo e apoio crítico, com uso registrado e propósito pedagógico explícito (ver [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md), princípio P4). IA que "dá a resposta pronta" contraria o produto.

**O professor permanece no centro da experiência.** A plataforma amplia o alcance pedagógico do professor; não o substitui, não o contorna e não decide por ele. Qualquer automação precisa preservar o professor como autoridade final.

**A investigação é mais importante que a resposta.** O valor pedagógico está no processo — pergunta norteadora, contexto, dúvida, revisão de perspectiva — registrado no Diário do Auditor. Métricas e telas não devem otimizar para "conclusão rápida" às custas desse processo.

**Toda funcionalidade deve possuir propósito pedagógico.** Nenhuma tela, botão ou fluxo deve existir apenas por completude técnica ou tendência de mercado. Se a resposta a "que aprendizagem isso sustenta?" for vaga, a funcionalidade não deve ser construída.

## Experiência e produto

**A plataforma deve parecer um laboratório de aprendizagem.** Visualmente e na linguagem: investigativa, direta, sóbria — nunca um "sistema de gestão escolar" genérico (ver [03_BRAND_GUIDELINES.md](03_BRAND_GUIDELINES.md)).

**Não criar telas fictícias nem dados mockados sem autorização.** Toda tela construída deve corresponder a uma funcionalidade real ou explicitamente planejada; dados de demonstração exigem autorização explícita e devem ser identificáveis como tal (herdado de [CLAUDE.md](../CLAUDE.md)).

**Acessibilidade é requisito obrigatório, não um extra.** Toda interface nova deve considerar leitura, foco e navegação desde o início — não como retrofit. (Status atual: interface do menu de Acessibilidade implementada na Sprint 1.1; efeitos ainda não persistem — ver [07_DECISIONS.md](07_DECISIONS.md).)

**Identidade separada de papel.** Uma pessoa (Usuário) pode ser aluno, professor ou administrador em contextos diferentes — o produto nunca deve assumir que um papel é a identidade inteira de alguém (ver [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md), princípio P1).

**Autoria é diferente de entrega.** Conteúdo pedagógico (Curso, Módulo, Missão) é template versionável; o que o aluno produz é instância imutável daquele template num dado momento. Confundir os dois corrompe histórico e é a decisão de modelagem mais crítica do produto (princípio P2).

## Execução

**A plataforma deve ser utilizável em sala de aula antes de qualquer versão comercial.** Validação pedagógica real precede escala — ver [05_ROADMAP.md](05_ROADMAP.md) e [07_DECISIONS.md](07_DECISIONS.md).

**Simplicidade sobre completude prematura.** Construir o que resolve a necessidade da Sprint atual; não antecipar arquitetura para requisitos hipotéticos (herdado de [CLAUDE.md](../CLAUDE.md)).

**Landing e Plataforma são um produto só.** Compartilham identidade, Design System e componentes, mesmo sendo blocos tecnicamente separados (ver [04_ARCHITECTURE.md](04_ARCHITECTURE.md)).
