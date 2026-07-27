# Plano de Funcionalização dos Produtos IAH

Documento de produto — define como MentorIAH, DocentIAH e MaestrIAH se tornam produtos funcionais, integrados e diferenciadores do IAH Educacional. Não é uma especificação técnica de implementação: não define schema, tela, rota ou banco além do que já existe documentado. Nenhum código, tela, banco de dados ou migration foi alterado para produzir este documento.

Referências obrigatórias, não alteradas por este documento:

- `docs/product/iah-assistentes-oficiais.md` — nomenclatura oficial (MentorIAH, DocentIAH, MaestrIAH) e padrão visual/textual.
- `docs/product/mentor-iah-constituicao-pedagogica.md`, `mentor-iah-fluxo-pedagogico-mvp.md`, `mentor-iah-autoria-integridade.md`, `mentor-iah-persistencia-sintese-mvp.md` — a especificação pedagógica completa do MentorIAH; este documento não a repete, só a posiciona dentro do plano dos três produtos.
- `docs/product/mentor-iah-persistence-implementation-audit.md` — estado real da primeira fatia do MentorIAH (sessão + mensagens), já auditada; migration ainda não aplicada em nenhum ambiente.
- `docs/AI_PROVIDER_GATEWAY.md` — arquitetura atual do IAH AI Gateway (roteamento por capability, circuit breaker, fallback determinístico), reaproveitada, não substituída, pelas Seções 8 e 10.
- `docs/DOMAIN_MODEL.md`, `docs/PERSISTENCE.md` — modelo institucional multi-tenant e estratégia de persistência que os três produtos herdam.

## 1. Visão estratégica

O IAH Educacional organiza sua proposta de IA em três produtos com um único ciclo pedagógico por trás, cada um servindo a um papel diferente da mesma jornada: o aluno investiga e produz (MentorIAH), o professor planeja e ensina (DocentIAH), a gestão acompanha e decide (MaestrIAH). Nenhum dos três substitui julgamento humano — mediação socrática em vez de resposta pronta, autoria docente da nota final, indicadores explicáveis em vez de decisão automática. A força do conjunto não é ter três chatbots; é ter três pontos de contato com o mesmo dado pedagógico real, cada um com a lente certa para quem está olhando.

Este plano assume o que já existe (persistência do MentorIAH auditada e aprovada, Gateway com roteamento por capability, DocentIAH com interface/arquitetura sem provedor de IA conectado ainda) como ponto de partida, não como reescrita.

## 2. Diferencial competitivo

- **Mediação, não geração de resposta.** MentorIAH nunca entrega a resposta final; DocentIAH nunca publica sem revisão do professor; MaestrIAH nunca decide sozinho — os três preservam a autoridade humana no ponto de decisão (aluno autor, professor avaliador, gestor decisor).
- **Um único ciclo pedagógico, três lentes.** Habilidade curricular, competência IAH, conceito central e evidência de aprendizagem são o mesmo vocabulário nos três produtos (Seção 6) — não três modelos de dados pedagógicos concorrentes.
- **Indicadores auditáveis, nunca inventados.** MaestrIAH nunca gera número por conta própria (Seção 5, Regra do MaestrIAH) — todo indicador vem de serviço determinístico, o modelo só interpreta pergunta e explica resultado.
- **Nota sempre humana.** A sugestão de nota do MentorIAH (Seção 3) é subsídio, nunca veredito — o professor valida ou edita, sempre (`mentor-iah-persistencia-sintese-mvp.md`).
- **Motor trocável por capability, não por produto.** Nenhum dos três está preso a um único provedor de IA (Seção 10) — o IAH Educacional pode evoluir o motor de um produto sem tocar nos outros dois.

## 3. MentorIAH

Produto do **estudante**. Cowork pedagógico socrático, acionado somente pelo aluno — nunca abre nem inicia conversa sozinho — e contextual à missão em andamento (definição oficial, `iah-assistentes-oficiais.md`).

O que o MentorIAH faz, na ordem em que aparece no fluxo (`mentor-iah-fluxo-pedagogico-mvp.md`):

- apoio progressivo (leve → intermediário → estruturado, sempre o menor necessário);
- boas práticas de uso de IA, integradas à investigação, nunca separadas dela;
- reflexão das Humanidades, conectando a técnica a uma pergunta humana;
- preservação de autoria — nunca escreve a entrega do aluno, sempre pede produção própria e declaração de uso de IA (`mentor-iah-autoria-integridade.md`);
- persistência da conversa (sessão + mensagens, já implementada e auditada — `mentor-iah-persistence-implementation-audit.md`);
- registro de evidências de aprendizagem ao longo da sessão;
- microdefesa adaptativa antes de encerrar;
- síntese pedagógica para o professor ao final;
- sugestão de nota com justificativa (subsídio, nunca veredito);
- o professor valida ou edita — a nota do professor é sempre a nota final (`mentor-iah-persistencia-sintese-mvp.md`).

**Capacidades previstas:**

- `mentor.guide_student` — mediação socrática durante a missão.
- `mentor.generate_summary` — síntese pedagógica ao final da sessão.
- `mentor.suggest_grade` — nota sugerida com justificativa.

**Atenção de nomenclatura técnica:** o Gateway já tem uma capability registrada como `mentor_iah.guide_student` (com underscore — ver Seção 8), não `mentor.guide_student`. Este plano não decide qual grafia prevalece; fica como decisão de implementação a ser tomada junto da Seção 12, item 5 ("MentorIAH com modelo real") — não antes, e não implicitamente.

## 4. DocentIAH

Produto do **professor**. Cowork pedagógico conversacional (`iah-assistentes-oficiais.md`) para:

- criação de missões investigativas;
- alinhamento curricular;
- competência IAH;
- reflexão humanística;
- boas práticas de ferramentas de IA;
- rubricas;
- materiais essenciais de apoio;
- criação de intervenções pedagógicas;
- análise pedagógica dos resultados da turma.

Hoje o DocentIAH tem interface e arquitetura de navegação prontas (`/professor/docente-iah`, D-044/D-045), sem provedor de IA conectado — a única capability já em produção parcial é `docentiah.improve_context` (atrás de `IAH_AI_DEEPSEEK_ENABLED`, com fallback determinístico).

**Capacidades previstas:**

- `docentiah.improve_context` — já existente no Gateway (Seção 8).
- `docentiah.compose_mission` — geração de missão investigativa completa (objetivo, habilidade, competência IAH, desafio, rubrica).
- `docentiah.create_intervention` — proposta de intervenção pedagógica a partir de um resultado observado.
- `docentiah.create_material` — materiais essenciais de apoio à missão (complementa `docentiah.generate_slides`/`generate_lesson_plan`/`adapt_material`, já existentes).

## 5. MaestrIAH

Produto inicial da **Mantenedoria**, com expansão posterior para Direção Pedagógica e Coordenação Pedagógica — nesta ordem, nunca as três de uma vez (mesmo princípio de progressive disclosure já usado no resto da plataforma, D-046).

Funções:

- consultar dados autorizados;
- responder em linguagem natural;
- analisar engajamento;
- analisar rendimento;
- comparar turmas e unidades;
- identificar estudantes abaixo de 70%;
- acompanhar intervenções;
- explicar indicadores.

**Capacidades previstas:**

- `maestriah.interpret_question` — interpreta a pergunta em linguagem natural e decide quais indicadores consultar.
- `maestriah.query_metrics` — não é o modelo de linguagem: é a chamada a serviços determinísticos de indicador (ver regra abaixo).
- `maestriah.explain_results` — explica o resultado já calculado, em linguagem natural.

### Regra do MaestrIAH (inegociável)

**O modelo de linguagem interpreta a pergunta e explica o resultado. Ele nunca calcula.** Todo número, indicador ou comparação exibido ao gestor vem de um serviço determinístico e auditável (mesmo padrão de `indicator-service.ts`, `modules/platform` — "indicadores não têm tabela, são projeção calculada, nunca inventada"). **Não é permitida, em nenhuma hipótese, execução direta de SQL livre gerado pelo modelo** — `maestriah.query_metrics` chama funções de indicador já existentes ou a existir, nunca constrói ou executa uma query a partir do texto do modelo. Esta regra é a mesma lógica já aplicada ao MentorIAH (nunca inventa dado, nunca classifica automaticamente) — aplicada agora ao domínio de indicadores institucionais.

## 6. Ciclo integrado dos produtos

```
Aluno investiga a Missão
  → MentorIAH medeia, registra evidências, gera síntese + nota sugerida
  → Professor valida/edita a nota (persistência: mentor-iah-persistencia-sintese-mvp.md)
  → Resultado pedagógico entra no acompanhamento de turma do Professor

Professor usa DocentIAH para planejar
  → cria Missão (docentiah.compose_mission), alinhada a habilidade/competência IAH
  → publica para a Turma (mission_assignments, já existente)
  → aluno a investiga com o MentorIAH — fecha o ciclo acima
  → resultados agregados da turma alimentam docentiah.create_intervention

Gestão usa MaestrIAH para decidir
  → consulta indicadores agregados (engajamento, rendimento, comparação entre turmas/unidades)
  → indicadores vêm dos MESMOS dados gerados pelo ciclo Mentor↔Docente acima,
    nunca de uma fonte paralela
  → identifica necessidade (ex.: turma abaixo de 70%) → aciona ou acompanha
    intervenção criada pelo Professor via DocentIAH
```

O ciclo é único porque o dado é único — cada produto lê o mesmo modelo pedagógico institucional (`DOMAIN_MODEL.md`) pela lente do seu papel, nunca duplica ou reinterpreta o dado de outro produto.

## 7. Arquitetura compartilhada

O que os três produtos **compartilham**:

- o modelo institucional multi-tenant (`institutionId` primeiro parâmetro de todo contrato, D-023);
- o padrão de repositório seed/database por módulo (`modules/mentor`, futuros `modules/docentiah`\* com o mesmo desenho, nunca uma tabela/entidade cruzando módulos sem necessidade — D-001);
- autorização derivada sempre da sessão autenticada no servidor, nunca de parâmetro do cliente (D-041, já aplicado em `mentor-actions.ts`);
- o IAH AI Gateway como único ponto de acesso a modelos de linguagem (Seção 8).

O que os três **não compartilham** — e não devem, por desenho:

- prompts (cada capability tem o seu, versionado — Seção 10);
- dados permitidos de entrada (Seção 9);
- controle de acesso (MentorIAH: só o próprio aluno; DocentIAH: só o professor autor/turma; MaestrIAH: só papéis de gestão autorizados, começando pela Mantenedoria);
- testes (cada produto com sua própria suíte, como já é `mentor-session-persistence.test.mjs` hoje).

\* `modules/docentiah` e um futuro `modules/maestriah` ainda não existem como módulos de persistência — este documento não os cria; só reserva o desenho para quando a Seção 12 chegar a eles.

## 8. Capacidades do IAH AI Gateway

**Já existentes e em produção (roteadas pelo Gateway hoje):**

| Capability | Produto |
|---|---|
| `docentiah.improve_context` | DocentIAH (única com caminho real à DeepSeek, atrás de flag) |
| `docentiah.generate_slides` | DocentIAH |
| `docentiah.generate_assessment` | DocentIAH |
| `docentiah.generate_lesson_plan` | DocentIAH |
| `docentiah.adapt_material` | DocentIAH |
| `conexoes_iah.identify_context` | DocentIAH (Conexões IAH) |
| `conexoes_iah.suggest_connections` | DocentIAH (Conexões IAH) |
| `conexoes_iah.generate_correlated_lesson` | DocentIAH (Conexões IAH) |
| `mentor_iah.guide_student` | MentorIAH (hoje sempre no motor demonstrativo, mesmo com a DeepSeek ligada) |

**Previstas por este plano, ainda não implementadas:**

`mentor.guide_student`\*, `mentor.generate_summary`, `mentor.suggest_grade`, `docentiah.compose_mission`, `docentiah.create_intervention`, `docentiah.create_material`, `maestriah.interpret_question`, `maestriah.query_metrics`, `maestriah.explain_results`.

\* ver nota de nomenclatura na Seção 3 — possível duplicidade com `mentor_iah.guide_student` já existente, a resolver na implementação.

Todas as novas capabilities entram no mesmo roteador (`llm-provider-factory.ts`) que já decide, por capability, entre motor real (DeepSeek, hoje só uma capability habilitada) e motor demonstrativo — nenhuma capability nova precisa de infraestrutura de Gateway nova, só de registro.

## 9. Dados utilizados por produto

**MentorIAH pode receber:** missão, etapa, objetivo, habilidade, competência IAH, tentativa (produção do próprio aluno), evidências, histórico da própria sessão. Nunca nome/e-mail do aluno no conteúdo do prompt — já garantido hoje (`MentorMissionContext` não carrega identidade pessoal, só IDs estruturados).

**DocentIAH pode receber:** solicitação do professor, turma, currículo, competência IAH, conceitos, Conexões IAH, resultados pedagógicos autorizados (agregados da turma do próprio professor, nunca de outra).

**MaestrIAH pode receber:** indicadores estruturados (já calculados, nunca dado bruto de aluno individual sem necessidade), turmas, missões, notas validadas (nunca sugeridas/pendentes — só o que o professor já confirmou), engajamento, intervenções, unidades autorizadas ao papel que está perguntando, período consultado.

Regra comum aos três, já em vigor para o MentorIAH e estendida por este plano aos outros dois: nunca enviar dado pessoal no texto do prompt quando já existir id estruturado equivalente.

## 10. Motores de IA

Os três produtos usam o **IAH AI Gateway** (`docs/AI_PROVIDER_GATEWAY.md`) — nenhum produto fala com um provedor de IA diretamente. Cada capability (existente ou prevista) deve declarar:

- **provider** — hoje só DeepSeek tem integração real; nada aqui obriga os três produtos ao mesmo provedor no futuro;
- **model**;
- **promptVersion** — versionamento do prompt por capability, ainda não existente no Gateway atual (hoje o prompt vive no código do provider, sem número de versão explícito) — a acrescentar quando a primeira capability nova for implementada;
- **timeout** — já existe por capability (`getTimeoutMsForCapability`), padrão a manter;
- **limite de tokens** — não existe hoje como configuração central; a acrescentar;
- **fallback** — já existe (`resilient-llm-provider.ts`, circuit breaker + motor demonstrativo) e deve continuar sendo o padrão para toda capability nova;
- **custo** — não há hoje rastreamento de custo por capability; a acrescentar antes de qualquer capability nova ir ao ar com provedor real, para não repetir o achado do gate de 2026-07-24 (timeout descoberto tarde);
- **dados permitidos** — Seção 9, aplicado por capability, não só por produto;
- **critérios de qualidade** — não existe hoje um critério formal de aceite de resposta por capability; a definir junto da Seção 15.

Nenhum produto é fixado a um único provedor por este plano — a escolha de provider é decisão por capability, tomada na implementação de cada uma (Seção 12), nunca uma decisão única para "todo o MentorIAH" ou "todo o DocentIAH".

## 11. Critérios de funcionalidade

**MentorIAH** é funcional quando consegue, de ponta a ponta:

- completar uma sessão;
- persistir evidências;
- gerar síntese.

**DocentIAH** é funcional quando consegue:

- gerar uma missão revisável, publicável e vinculada a uma rubrica.

**MaestrIAH** é funcional quando consegue:

- responder uma pergunta real usando dados autorizados, verificáveis e atualizados.

Nenhum critério de funcionalidade é "o produto parece pronto" — os três exigem um caminho de ponta a ponta observável, não uma tela isolada.

## 12. Ordem de implementação

1. Persistência do MentorIAH — **feita e auditada** (`mentor-iah-persistence-implementation-audit.md`); migration pendente de aplicação em ambiente local (`docs/SUPABASE-LOCAL.md`).
2. Síntese pedagógica.
3. Sugestão de nota.
4. Validação ou edição docente.
5. MentorIAH com modelo real.
6. DocentIAH criando missão completa.
7. DocentIAH criando intervenção.
8. Monitoramento docente.
9. Indicadores da gestão.
10. MaestrIAH com consultas controladas.

Esta ordem é sequencial por dependência de dado, não por preferência: a síntese (2) precisa da persistência (1); a sugestão de nota (3) precisa da síntese; MaestrIAH (10) precisa que indicadores da gestão (9) já existam para consultar algo real.

## 13. Métricas principais

**MentorIAH:** autonomia, conclusão, evidências produzidas, adequação da mediação, diferença entre nota sugerida e nota docente (esta última já é um campo de auditoria previsto em `mentor-iah-persistencia-sintese-mvp.md` — a métrica é a leitura agregada desse campo, não um dado novo).

**DocentIAH:** missões publicadas, tempo economizado, qualidade docente, uso das competências IAH, intervenções criadas.

**MaestrIAH:** consultas respondidas, precisão dos indicadores, ausência de dados inventados, tempo economizado pela gestão, decisões apoiadas.

## 14. Segurança e privacidade

- **RLS deny-by-default em toda tabela nova** — mesmo padrão já aplicado a `mentor_sessions`/`mentor_messages` (D-041); nenhuma exceção prevista para DocentIAH ou MaestrIAH.
- **`institutionId` sempre derivado da sessão autenticada no servidor**, nunca de parâmetro do cliente — já é regra para MentorIAH (`mentor-actions.ts`) e se estende, sem exceção, a DocentIAH e MaestrIAH.
- **Controle de acesso específico por produto** (Seção 7): aluno só a própria sessão; professor só sua turma/suas missões; gestão só as unidades autorizadas ao seu papel — MaestrIAH começa restrito à Mantenedoria (Seção 5) exatamente para não expandir superfície de acesso antes de validar o primeiro papel.
- **Nunca armazenar raciocínio interno do modelo** — regra já em vigor para `mentor_messages` (só o texto trocado é persistido) e a manter para qualquer nova tabela de conversa/interação.
- **MaestrIAH nunca executa SQL livre gerado pelo modelo** (Seção 5) — é a salvaguarda de segurança mais crítica deste plano, porque é o único produto dos três com acesso a dado agregado entre turmas/unidades.
- **Nota final é sempre a decisão do professor** — o MentorIAH nunca publica nota automaticamente (`mentor-iah-persistencia-sintese-mvp.md`); nenhuma capability prevista neste plano muda essa regra.
- **Dados pessoais fora do prompt quando já há id estruturado** (Seção 9) — regra comum aos três produtos, não só ao MentorIAH.

## 15. Critérios de aceite do MVP

- **MentorIAH:** sessão completa, persistida, com síntese gerada e nota sugerida com justificativa; professor consegue validar ou editar; nota final e diferença sugerida/final auditáveis.
- **DocentIAH:** professor consegue gerar uma missão revisável e publicá-la vinculada a uma rubrica, sem editar SQL/JSON manualmente.
- **MaestrIAH:** um gestor da Mantenedoria consegue fazer uma pergunta em linguagem natural e receber um indicador real (não simulado), com a fonte do cálculo auditável.

O MVP dos três produtos não é "todas as capacidades da Seção 8 implementadas" — é os três critérios de funcionalidade da Seção 11 demonstráveis de ponta a ponta, ainda que com motor demonstrativo em vez de provedor real (mesmo padrão já usado por todo o Gateway hoje).

## 16. Funcionalidades futuras

Fora do escopo deste plano, para não confundir com o MVP das Seções 11 e 15:

- MentorIAH com provedor de IA real conectado (passo 5 da Seção 12, deliberadamente depois da persistência e da síntese, nunca antes);
- MaestrIAH para Direção Pedagógica e Coordenação Pedagógica (Seção 5 — expansão explicitamente posterior à Mantenedoria);
- múltiplos agentes coordenados entre si (nenhum dos três produtos deste plano prevê um agente acionando outro automaticamente — cada acionamento continua humano);
- comparação entre instituições diferentes (MaestrIAH compara turmas/unidades dentro de uma instituição, nunca entre instituições — isolamento multi-tenant continua absoluto);
- geração de intervenção automática sem revisão do professor (`docentiah.create_intervention` propõe, o professor decide — nunca cria e aciona sozinho);
- qualquer forma de MaestrIAH gerar ou executar consulta livre (SQL ou equivalente) a partir do texto do modelo — permanece proibido em qualquer fase futura, não só no MVP (Seção 5).

---

Este documento define o plano de funcionalização dos três produtos oficiais de IA do IAH Educacional. Nenhuma tela, dado, código, migration ou banco foi alterado ou implementado por este documento — ele define o que deve ser construído e em que ordem, não como.
