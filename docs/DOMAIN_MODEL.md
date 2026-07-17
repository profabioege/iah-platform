# Modelo Conceitual do Domínio — IAH Educacional

Modelo institucional completo do sistema de ensino IAH (disciplina **Inteligência Artificial & Humanidades**, Ensino Médio). Documento de referência técnica oficial, complementar aos 5 documentos vivos (`VISION.md`, `PRODUCT.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md` — ver D-018). **É conceitual**: não define banco, SQL, Prisma nem tipos de código — apenas entidades, atributos, relacionamentos, responsabilidades e regras de negócio. Nenhum banco de dados, UI, página, rota ou componente React foi alterado para produzir este documento.

Ver também [MISSION.md](MISSION.md) (estrutura padrão de Missão), [VISION.md](VISION.md) e [PRODUCT.md](PRODUCT.md).

> **Nota de consolidação:** este arquivo substitui `06_DOMAIN_MODEL.md`, que mantinha o modelo mais completo mas com nome fora do padrão dos 5 documentos oficiais (D-018 já esperava que `DOMAIN_MODEL.md` fosse o nome canônico — `PRODUCT.md` já apontava para cá). `06_DOMAIN_MODEL.md` passa a ser apenas um redirecionamento. Nenhum conteúdo foi perdido: a base deste documento é o modelo já existente, com a entidade `Ano Letivo` e as seções 4 e 5 abaixo adicionadas nesta Sprint.

## Equivalência de nomes (Sprint "Modelo Institucional")

O produto e o domínio são nomeados **em português** neste documento e na interface (convenção já registrada em `HANDOFF.md`, seção 9) — os identificadores de código, quando este modelo virar TypeScript, serão em inglês, seguindo a mesma convenção já usada em `Mission`, `StudentWork`, `ClassMonitorReader`. A tabela abaixo mapeia os nomes pedidos nesta Sprint para os nomes conceituais usados aqui (já existentes, mais abrangentes):

| Nome desta Sprint | Entidade conceitual (este documento) | Futuro identificador de código |
|---|---|---|
| `Institution` | Escola | `Institution` |
| `AcademicYear` | Ano Letivo *(nova nesta Sprint — ver seção 3)* | `AcademicYear` |
| `Teacher` | Professor | `Teacher` |
| `Classroom` | Turma | `Classroom` |
| `Student` | Aluno | `Student` |
| `Mission` | Missão | `Mission` *(já existe: `modules/library/domain/mission.ts`)* |
| `MissionProgress` | Progresso | `MissionProgress` |
| `Reflection` | Reflexão (entrada do Diário do Auditor) | `Reflection` |
| `Production` | Produção do Aluno | `Production` |

---

## 1. Modelo conceitual — princípios de modelagem (decisões estruturais)

Quatro decisões atravessam todo o modelo. Elas são mais importantes que qualquer entidade isolada.

**P1 — Identidade separada de Papel.** `Usuário` é a identidade (uma pessoa que faz login). `Aluno`, `Professor` e `Administrador` **não são tipos rígidos e mutuamente exclusivos** de Usuário — são *papéis* que uma identidade assume, possivelmente mais de um (um professor pode também ser coordenador/admin). Modelar como herança rígida (`Aluno extends Usuário`) engessa o produto. Adotamos `Usuário` + `Perfil/Papel` + extensões de dados por papel.

**P2 — Autoria separada de Entrega (template vs. instância).** O conteúdo pedagógico (`Curso → Módulo → Missão → Etapa`) é **material autoral, versionável**, criado uma vez. A vivência disso por uma turma é uma **instância** (a `Turma` roda um `Curso`; o `Aluno` produz dentro de uma `Atividade`). Se a mesma entidade servir de template e de registro do aluno, editar uma missão corromperá o histórico de quem já a fez. **Esta é a decisão mais crítica do modelo.**

**P3 — Escola como tenant (multi-tenancy), delimitada por Ano Letivo.** O IAH é SaaS vendido a instituições. `Escola` é a fronteira de isolamento: turmas, usuários, produções e integrações pertencem a uma escola. Dentro de uma escola, `Ano Letivo` é a segunda fronteira — turmas, matrículas e progresso pertencem a um período letivo específico, para que o mesmo aluno/turma possa se repetir ano a ano sem confundir dados. O catálogo de conteúdo (`Curso`) pode ser global (IAH) ou próprio da escola — ver Pontos em Aberto.

**P4 — Rastreabilidade do uso de IA.** O ethos do produto é o uso *ético e crítico* da IA. Portanto "qual ferramenta de IA foi usada, em que produção, com qual prompt" é informação de domínio de primeira classe (`Produção do Aluno` referencia `Ferramenta de IA`), não um detalhe técnico.

### Contextos delimitados (mapa de módulos)

As entidades se agrupam em contextos coesos, que devem virar módulos (`app/src/modules/*`), seguindo o padrão já iniciado em `modules/library` e `modules/classroom`:

| Contexto | Entidades | Módulo hoje |
|---|---|---|
| **Identidade & Acesso** | Usuário, Perfil, Aluno, Professor, Administrador | não implementado |
| **Instituição (tenant)** | Escola, Ano Letivo, Turma, Matrícula | não implementado |
| **Currículo & Autoria** (templates) | Curso, Módulo, Missão, Etapa da Missão, Material Didático, Ferramenta de IA, Competência | `modules/library` (só `Missão`, parcial) |
| **Aprendizagem & Entrega** (instâncias) | Atividade, Produção do Aluno, Progresso, Diário do Auditor (Reflexão) | `modules/classroom` (simplificado, sem Escola/Turma real) |
| **Integrações externas** | Provedor de Autenticação, Provedor de Sala de Aula (Google/Microsoft/CSV/manual) | `modules/integrations` (contratos + mock + stub Google, ver D-019) |
| **Colaboração** | Projeto, Hackathon | não implementado |
| **Acervo** | Biblioteca | não implementado |
| **Operação & Transversais** | Agenda, Integração, Notificação | não implementado |

---

## 2. Catálogo de entidades (responsabilidade de cada uma)

Para cada entidade: **finalidade · principais atributos · relacionamentos · regras de negócio**.

### Contexto: Identidade & Acesso

#### Usuário
- **Finalidade:** identidade autenticável única; representa uma pessoa no sistema.
- **Atributos:** id, nome, e-mail, credencial (gerida pela auth externa), status (ativo/inativo/convidado), data de criação, último acesso.
- **Relacionamentos:** pertence a uma `Escola` (ou a nenhuma, no caso de admin IAH global); assume um ou mais `Perfil`; conforme os papéis, estende-se em `Aluno`/`Professor`/`Administrador`.
- **Regras:** e-mail único no sistema; um Usuário sem nenhum Perfil ativo não acessa nada; desativação é lógica (LGPD/auditoria), nunca exclusão física imediata.

#### Perfil
- **Finalidade:** vínculo entre uma identidade e um papel dentro de um escopo (geralmente uma Escola). É o que responde "esta pessoa é o quê, e onde".
- **Atributos:** id, papel (aluno | professor | administrador | admin_iah), escopo (escola/turma), status, período de validade.
- **Relacionamentos:** pertence a um `Usuário`; referencia a `Escola`/`Turma` de escopo.
- **Regras:** um Usuário pode ter múltiplos Perfis (ex.: professor na Escola A e aluno de formação na Escola B); permissões derivam do Perfil ativo no contexto, não do Usuário.

#### Aluno (`Student`)
- **Finalidade:** extensão de dados e trajetória de quem cursa a disciplina — o "Auditor da Realidade".
- **Atributos:** id (referência ao Usuário/Perfil), turma(s), progresso agregado, portfólio.
- **Relacionamentos:** é um `Usuário` no papel aluno; matriculado em `Turma` via `Matrícula`; autor de `Produção do Aluno`, `Diário do Auditor`, participações em `Projeto`/`Hackathon`; possui `Progresso` por Missão.
- **Regras:** só existe vinculado a ao menos uma Turma ativa; seu histórico de produções é imutável mesmo que a Missão-template mude (P2).

#### Professor (`Teacher`)
- **Finalidade:** conduz turmas, acompanha alunos e (conforme permissão) autora conteúdo.
- **Atributos:** id, turmas que leciona, áreas.
- **Relacionamentos:** é um `Usuário` no papel professor; leciona uma ou mais `Turma`; pode autorar `Curso`/`Módulo`/`Missão`; avalia `Produção do Aluno`; abre `Atividade`/`Missão` para a turma.
- **Regras:** só acessa dados de alunos de suas turmas (escopo); autoria exige permissão explícita (nem todo professor autora conteúdo).

#### Administrador
- **Finalidade:** gestão da instituição (usuários, turmas, integrações) ou da plataforma IAH (catálogo global) — inclui o papel de Gestor (Diretor/Mantenedor/Coordenador) já endereçado pelo Painel do Gestor planejado em `ROADMAP.md`.
- **Atributos:** id, escopo (escola | plataforma IAH), permissões.
- **Relacionamentos:** é um `Usuário` no papel administrador; gerencia `Escola`, `Turma`, `Usuário`, `Integração`.
- **Regras:** admin de escola nunca vê dados de outra escola; admin IAH (global) gerencia o catálogo compartilhado e não acessa produções de alunos sem motivo/registro (LGPD).

### Contexto: Instituição (tenant)

#### Escola (`Institution`)
- **Finalidade:** instituição cliente do SaaS; fronteira de isolamento de dados (tenant).
- **Atributos:** id, nome, identificação institucional, plano/contrato, configurações, marca (futuro white-label), status.
- **Relacionamentos:** contém `Usuário`s, `Ano Letivo`s, `Turma`s, `Integração`s; pode ter `Curso`s próprios além do catálogo IAH.
- **Regras:** todo dado operacional pertence a exatamente uma Escola; encerrar contrato suspende acesso mas preserva dados por período legal.

#### Ano Letivo (`AcademicYear`) — *nova nesta Sprint*
- **Finalidade:** delimita o período letivo ao qual uma Turma pertence, para que a mesma escola reutilize nomes de turma (ex.: "3º Ano A") ano após ano sem confundir dados de períodos diferentes.
- **Atributos:** id, escola, rótulo (ex.: "2026"), data de início/fim, status (planejado/ativo/encerrado).
- **Relacionamentos:** pertence a `Escola`; contém `Turma`s do período.
- **Regras:** uma `Turma` pertence a exatamente um Ano Letivo; encerrar um Ano Letivo não apaga Turmas/Matrículas/Progresso — apenas impede novos lançamentos nele. Antes desta Sprint, "ano letivo" era só um atributo solto de `Turma` (ex.: o "Ensino Médio · 2026" fixo no header da Plataforma hoje); vira entidade própria para suportar múltiplas turmas/anos reais no futuro.

#### Turma (`Classroom`)
- **Finalidade:** grupo de alunos conduzido por professor(es), rodando um Curso num Ano Letivo. É a **instância de entrega** do currículo (P2).
- **Atributos:** id, nome, série, escola, curso vinculado.
- **Relacionamentos:** pertence a `Escola` e a um `Ano Letivo`; roda um `Curso`; reúne `Aluno`s via `Matrícula`; conduzida por `Professor`(es); origem de `Atividade`s, itens de `Agenda`, `Projeto`s e `Hackathon`s.
- **Regras:** pertence a uma única Escola e a um único Ano Letivo; ao arquivar a turma (fim do Ano Letivo), o histórico dos alunos permanece acessível.

#### Matrícula
- **Finalidade:** vínculo aluno↔turma com estado próprio (entidade associativa, não um simples elo).
- **Atributos:** id, aluno, turma, data de entrada/saída, situação (ativa/trancada/concluída).
- **Relacionamentos:** liga `Aluno` a `Turma`.
- **Regras:** um aluno pode ter matrículas em turmas diferentes ao longo do tempo (inclusive entre Anos Letivos); produções pertencem ao aluno, mas são contextualizadas pela matrícula/turma em que ocorreram.

### Contexto: Currículo & Autoria (templates, versionáveis)

#### Curso
- **Finalidade:** organização macro do percurso da disciplina; template que uma Turma roda.
- **Atributos:** id, título, descrição, objetivos, versão, escopo (IAH global | escola), status editorial.
- **Relacionamentos:** contém `Módulo`s; é rodado por `Turma`s.
- **Regras:** versionável; publicar um Curso o torna disponível para turmas; editar cria nova versão sem afetar turmas que já rodam versão anterior.

#### Módulo
- **Finalidade:** unidade temática do curso; agrupa missões.
- **Atributos:** id, título, descrição, ordem, curso.
- **Relacionamentos:** pertence a `Curso`; contém `Missão`s.
- **Regras:** ordenado dentro do curso; pertence a exatamente um curso (numa dada versão).

#### Missão (`Mission`)
- **Finalidade:** unidade central de aprendizagem investigativa (estrutura padrão em [MISSION.md](MISSION.md)). Já modelada em `modules/library/domain/mission.ts`.
- **Atributos:** id, número, título, objetivo, pergunta norteadora, contexto, ordem, status editorial, competências desenvolvidas; agrega `Etapa`s, `Material Didático` e `Ferramenta de IA` sugeridas.
- **Relacionamentos:** pertence a `Módulo`; composta por `Etapa da Missão`; referencia `Material Didático`, `Ferramenta de IA`, `Competência`; instanciada como `Atividade` para turmas; motiva registros no `Diário do Auditor`.
- **Regras:** é template — nunca guarda dados de aluno; versionável; a "Reflexão no Diário" e a "Produção do Aluno" previstas na estrutura são *slots* preenchidos na instância, não na missão.

#### Etapa da Missão
- **Finalidade:** decompõe a Missão em passos sequenciais (investigar → produzir → refletir → entregar).
- **Atributos:** id, título, descrição, ordem, tipo (leitura, investigação, produção, reflexão, entrega), materiais/ferramentas da etapa.
- **Relacionamentos:** pertence a `Missão`; pode conter/definir `Atividade`s.
- **Regras:** ordenada; o progresso do aluno é medido por etapas concluídas (P2).

#### Material Didático
- **Finalidade:** recurso de apoio (texto autoral, vídeo, referência, roteiro) usado em missões/etapas.
- **Atributos:** id, título, tipo, conteúdo/URL, autor, licença/origem, tags.
- **Relacionamentos:** referenciado por `Missão`/`Etapa`; catalogado na `Biblioteca`.
- **Regras:** conteúdo autoral tem autoria e licença registradas; reutilizável entre missões (referência, não cópia).

#### Ferramenta de IA
- **Finalidade:** catálogo das ferramentas de IA que a plataforma reconhece/integra (ex.: assistente próprio, geradores), como **objeto de estudo e apoio** (P4).
- **Atributos:** id, nome, tipo (texto, imagem, análise…), provedor, descrição pedagógica, orientações de uso ético.
- **Relacionamentos:** sugerida por `Missão`/`Etapa`; usada em `Produção do Aluno` (registro de uso); pode mapear para uma `Integração`.
- **Regras:** uso registrado por proveniência (qual ferramenta, quando); ferramentas têm orientação de uso ético associada.

#### Competência
- **Finalidade:** habilidade desenvolvida (pensamento crítico, uso ético de IA, autoria…), base para avaliação. Já existe como lista estática em cada Missão (`mission.competencies`).
- **Atributos:** id, nome, descrição, categoria, (opcional) alinhamento a referencial (BNCC).
- **Relacionamentos:** desenvolvida por `Missão`s; evidenciada por `Produção do Aluno`.
- **Regras:** reutilizável entre missões; base para rubricas de avaliação (ver Melhorias).

### Contexto: Aprendizagem & Entrega (instâncias, dados do aluno)

#### Atividade
- **Finalidade:** instância de uma Etapa/Missão disponibilizada a uma Turma para o aluno realizar — a ponte entre template e entrega.
- **Atributos:** id, missão/etapa de origem, turma, prazo, configurações, status.
- **Relacionamentos:** deriva de `Missão`/`Etapa`; pertence a `Turma`; recebe `Produção do Aluno`; aparece na `Agenda`.
- **Regras:** referencia a versão do conteúdo vigente quando publicada (P2); prazo e disponibilidade são da instância, não do template.

#### Produção do Aluno (`Production`)
- **Finalidade:** artefato/entrega criado pelo aluno numa atividade (relatório, análise, mídia) — o cerne do portfólio. Hoje simplificada em `StudentWork` (`modules/classroom/domain/student-work.ts`), sem Turma/Atividade real — apenas aluno de dispositivo × Missão.
- **Atributos:** id, aluno, atividade, conteúdo/anexos, versão/rascunho, data, situação (rascunho/entregue/avaliado), avaliação/feedback, **ferramentas de IA utilizadas + registro de uso**.
- **Relacionamentos:** de um `Aluno`; para uma `Atividade`; referencia `Ferramenta de IA` (P4); avaliada por `Professor`; compõe o portfólio; evidencia `Competência`s.
- **Regras:** imutável após entrega (novas versões viram revisões); histórico preservado mesmo com mudança do template (P2); registro de uso de IA é obrigatório quando a atividade previa ferramentas.

#### Progresso (`MissionProgress`)
- **Finalidade:** estado de avanço do aluno em uma missão/curso (visão do aluno e do professor). Hoje representado por `StudentMissionSnapshot` (`modules/classroom/domain/class-monitor.ts`), com os 8 estados já usados no Painel do Professor.
- **Atributos:** id, aluno, missão/atividade, etapas concluídas, percentual, situação, timestamps.
- **Relacionamentos:** de um `Aluno` sobre uma `Missão`/`Atividade` numa `Turma`.
- **Regras:** derivado de etapas/entregas concluídas; não é fonte de verdade das produções, é agregação.

#### Diário do Auditor
- **Finalidade:** espaço reflexivo pessoal do aluno; registra descobertas, dúvidas e mudanças de perspectiva ao longo do curso.
- **Atributos:** id, aluno; contém entradas de **Reflexão**.
- **Relacionamentos:** de um `Aluno`; entradas ligadas a `Missão`/`Atividade`.
- **Regras:** privado por padrão (aluno decide compartilhar com o professor); entradas são append-only (histórico de amadurecimento); não é avaliação, é registro. Privacidade ainda em aberto — ver backlog `ROADMAP.md` item 5.

#### Reflexão (`Reflection`)
- **Finalidade:** cada entrada individual do Diário do Auditor — o texto que o aluno escreve ao concluir uma Missão.
- **Atributos:** id, texto, data, missão de origem, visibilidade (privada | compartilhada com professor).
- **Relacionamentos:** pertence a um `Diário do Auditor`; referencia a `Missão`/`Atividade` que a motivou.
- **Regras:** append-only (nunca sobrescreve uma reflexão anterior); mesma regra de imutabilidade pedagógica da Produção do Aluno.

### Contexto: Colaboração

#### Projeto
- **Finalidade:** produção autoral maior, individual ou em grupo, conectando a disciplina a temas reais.
- **Atributos:** id, título, descrição, turma, integrantes, orientador, entregáveis, status.
- **Relacionamentos:** de `Aluno`(s); em uma `Turma`; orientado por `Professor`; agrega `Produção do Aluno`; pode compor `Portfólio`.
- **Regras:** pode ser individual ou em grupo; produções do projeto seguem as regras de Produção do Aluno.

#### Hackathon
- **Finalidade:** evento pontual e temporizado de produção intensiva (competição/mostra), tipo especial de colaboração.
- **Atributos:** id, tema, janela (início/fim), escola/turmas participantes, critérios, premiação/reconhecimento.
- **Relacionamentos:** envolve `Aluno`s (em equipes/`Projeto`s); pertence a `Escola`/`Turma`(s); gera `Produção do Aluno`; aparece na `Agenda`.
- **Regras:** delimitado no tempo; equipes e entregas válidas apenas dentro da janela; avaliação por critérios próprios.

### Contexto: Acervo

#### Biblioteca
- **Finalidade:** acervo curado de `Material Didático` e referências para pesquisa e autoria — **é uma coleção/curadoria, não um tipo novo de conteúdo**.
- **Atributos:** id, escopo (IAH/escola), organização (coleções, tags, categorias).
- **Relacionamentos:** organiza/expõe `Material Didático`; consultada por `Aluno`/`Professor`; alimenta `Missão`/`Projeto`.
- **Regras:** curadoria com escopo (global vs. escola); um material pode aparecer em várias coleções sem duplicação.

### Contexto: Operação & Transversais

#### Agenda
- **Finalidade:** linha do tempo de prazos, aulas e eventos, visível à comunidade escolar; ponto de sincronização com Google Agenda.
- **Atributos:** id, evento (título, tipo, início/fim), escopo (turma/escola/aluno), origem (atividade/hackathon/manual), referência externa.
- **Relacionamentos:** eventos derivam de `Atividade`, `Hackathon`, `Turma`; sincroniza via `Integração` (Google Agenda).
- **Regras:** prazos de atividade geram eventos automaticamente; sincronização externa é espelho, não fonte de verdade.

#### Integração
- **Finalidade:** conexão configurada com um serviço externo (Google Classroom, Microsoft Teams, Google Agenda, Canva, provedor de IA), com credenciais/escopo. Já iniciada como arquitetura em `modules/integrations` (contratos `AuthProvider`/`ClassroomProvider`, ver D-019) — esta entidade é o registro conceitual de uma integração *configurada e ativa* para uma Escola, que a implementação de código ainda não persiste (não há banco).
- **Atributos:** id, tipo/provedor, escopo (escola ou usuário), credenciais/tokens (referência segura), status, última sincronização.
- **Relacionamentos:** pertence a `Escola` ou `Usuário`; habilita `Agenda`, `Material`, `Ferramenta de IA`, importação de turmas.
- **Regras:** tokens nunca expostos ao domínio de aplicação; integração pode ser revogada; falha de integração não pode quebrar o fluxo pedagógico (degradação graciosa).

#### Notificação
- **Finalidade:** aviso a um usuário sobre um evento relevante (novo prazo, feedback recebido, convite de projeto).
- **Atributos:** id, destinatário, tipo, mensagem, referência à origem, canal (in-app/e-mail), lida/não lida, data.
- **Relacionamentos:** para um `Usuário`; originada por eventos de `Atividade`, `Produção`, `Projeto`, `Agenda`, `Hackathon`.
- **Regras:** transversal e orientada a eventos; preferências de canal por usuário; entrega não bloqueia a ação que a originou.

---

## 3. Diagrama das entidades (ASCII)

```
IDENTIDADE & ACESSO                         INSTITUIÇÃO (tenant)
┌──────────┐   assume   ┌────────┐          ┌──────────┐  contém   ┌────────────┐
│ Usuário  │───────────▶│ Perfil │          │  Escola  │──────────▶│ Ano Letivo │
└────┬─────┘  1..*      └────────┘          └────┬─────┘           └─────┬──────┘
     │ especializa-se (por papel)                │ contém                │ contém
     ▼                                            ▼                       ▼
┌────────┐ ┌──────────┐ ┌──────────────┐    ┌──────────┐   roda    ┌────────┐
│ Aluno  │ │Professor │ │Administrador │    │  Turma   │──────────▶│ Curso  │
└───┬────┘ └────┬─────┘ └──────┬───────┘    └────┬─────┘  (instância)└───┬────┘
    │           │ leciona      │ gerencia        │                       │ contém
    │ Matrícula ├──────────────┴─────────────────┤                       ▼
    └───────────┴──── reúne ──────────────────────┘                 ┌────────┐
                                                                     │ Módulo │
CURRÍCULO & AUTORIA (templates)          APRENDIZAGEM & ENTREGA      └───┬────┘
┌────────┐ contém ┌────────┐ compõe ┌──────────────┐   (instâncias)     │
│ Curso  │───────▶│ Módulo │───────▶│    Missão    │◀───────────────────┘
└────────┘        └────────┘        └──────┬───────┘
                                           │ compõe
                                           ▼
   ┌─────────────────┐  sugere    ┌────────────────┐   instancia   ┌───────────┐
   │ Material Didát. │◀───────────│ Etapa da Missão│──────────────▶│ Atividade │
   └────────┬────────┘            └───────┬────────┘               └─────┬─────┘
            │ cataloga                     │ referencia (P4)              │ recebe
            ▼                              ▼                              ▼
    ┌─────────────┐              ┌────────────────┐  usa       ┌────────────────────┐
    │ Biblioteca  │              │ Ferramenta IA  │◀───────────│ Produção do Aluno  │
    └─────────────┘              └────────────────┘            └─────────┬──────────┘
                                                                         │ evidencia
   ┌──────────────┐  desenvolve  ┌──────────────┐                        ▼
   │ Competência  │◀─────────────│    Missão    │                 ┌────────────┐
   └──────────────┘              └──────────────┘                 │ Progresso  │
                                                                  └────────────┘
COLABORAÇÃO                 ACERVO         ┌────────────────────┐  (do Aluno)
┌──────────┐  ┌───────────┐               │ Diário do Auditor  │──▶ Reflexão (entradas)
│ Projeto  │  │ Hackathon │               └────────────────────┘
└────┬─────┘  └─────┬─────┘
     └─── de Aluno(s), em Turma, gera Produção ───┘

TRANSVERSAIS                                        INTEGRAÇÕES EXTERNAS (modules/integrations)
┌──────────┐   sincroniza   ┌─────────────┐        ┌───────────────────┐  alimenta  ┌──────────────┐
│  Agenda  │◀───────────────│ Integração  │◀───────│ Provedor externo  │───────────▶│ Turma / Aluno│
└──────────┘  (Google etc.) └─────────────┘        │ (Google/Microsoft/│  (mesmo    │  (internos)  │
   ▲ prazos de Atividade/Hackathon                 │  CSV/manual)      │   modelo)  └──────────────┘
   │                                                └───────────────────┘
┌──────────────┐◀─ eventos de
│ Notificação  │   Atividade/Produção/Projeto/Agenda → Usuário
└──────────────┘
```

---

## 4. Fluxo completo: Instituição → Professor → Turma → Aluno → Missão

Este é o fluxo institucional de ponta a ponta que qualquer origem de dados (manual, CSV, Google Classroom, Microsoft Teams — ver seção 5) precisa alimentar, e que qualquer tela da Plataforma (Dashboard, Missão, Painel do Professor, futuro Painel do Gestor) consulta:

1. **Instituição (Escola)** é cadastrada uma única vez — é o tenant. Dentro dela, existe um **Ano Letivo** ativo (ex.: "2026").
2. A Escola cadastra (ou importa) **Professores** — cada um é um `Usuário` com `Perfil` = professor, escopado a essa Escola.
3. A Escola (ou o Professor, conforme permissão) cria **Turmas** dentro do Ano Letivo ativo, cada uma rodando um **Curso** (hoje só há um: "IA no Ensino Médio").
4. Um ou mais **Professores** passam a lecionar cada Turma.
5. **Alunos** são cadastrados (ou importados) e vinculados a uma Turma via **Matrícula** — um aluno só existe no sistema atrelado a pelo menos uma Turma ativa.
6. O Curso da Turma expõe suas **Missões** (hoje: Missão 01, "A Fábrica de Notícias") como **Atividades** disponíveis para a Turma, com prazo e configuração próprios daquela instância — não do template.
7. Cada **Aluno** da Turma percorre a Missão: investiga o Dossiê, produz o Relatório de Auditoria (**Produção**), registra sua **Reflexão** no Diário do Auditor, e o sistema deriva o **Progresso** (estado de avanço) a partir dessas entregas.
8. O **Professor** da Turma acompanha o **Progresso** agregado de todos os Alunos matriculados (visão hoje simulada no Painel do Professor); um futuro **Administrador/Gestor** da Escola acompanha o mesmo dado agregado por Turma/Escola (Painel do Gestor, planejado em `ROADMAP.md`).

Mapeamento com o que já existe em código hoje (implementação simplificada, sem Escola/Ano Letivo/Turma reais — apenas Missão × aluno-de-dispositivo):

| Passo do fluxo | Implementação atual | Lacuna para o modelo completo |
|---|---|---|
| Instituição, Ano Letivo | Não existem — "Ensino Médio · 2026" é texto fixo no header | Precisa de `Institution`/`AcademicYear` reais + persistência |
| Professor, Turma, Matrícula | `simulatedClassMonitor` simula 11 alunos fictícios de uma turma implícita | Precisa de `Teacher`/`Classroom`/`Enrollment` reais |
| Missão → Atividade | `Mission` é servida diretamente ao aluno, sem instanciação por Turma | Precisa de `Activity` (instância) quando houver múltiplas turmas |
| Produção, Progresso, Reflexão | `StudentWork` (localStorage) e `StudentMissionSnapshot` (simulado) | Precisa de persistência real por Aluno/Turma (ROADMAP, item 3) |

---

## 5. Origens de dados futuras (mesma entrada, mesmo modelo interno)

O modelo institucional (seções 1–4) é o **único destino** de qualquer dado de Turma/Aluno, não importa a origem. Quatro origens estão previstas; todas alimentam exatamente `Turma`, `Matrícula` e `Aluno` internos — nenhuma tela ou lógica de domínio pode depender de saber qual foi a origem:

| Origem | Como preenche o modelo interno | Situação hoje |
|---|---|---|
| **Cadastro manual** | Escola/Professor preenche formulário na Plataforma → grava direto `Turma`/`Aluno`/`Matrícula` | Não implementado (depende de banco — `ROADMAP.md`, item 3) |
| **Importação por CSV** | Upload de planilha (nome, e-mail, turma) → adaptador de leitura converte cada linha em `Aluno` + `Matrícula` candidatos, antes de persistir | Não implementado |
| **Google Classroom** | `ClassroomProvider.listCourses()` → candidatos a `Turma`; `listStudents(courseId)` → candidatos a `Aluno`/`Matrícula` | Contrato pronto (`modules/integrations/classroom`), implementação real pendente de credenciais (`GOOGLE_WORKSPACE.md`) |
| **Microsoft Teams** | Mesmo contrato `ClassroomProvider`, um futuro `microsoftTeamsClassroomProvider` | Não implementado — contrato já comporta (D-019 previu explicitamente este caso) |

A peça que já existe — `ClassroomProvider` (`listCourses`, `listStudents`, `publishMission`), construída na Sprint anterior — é exatamente a camada de adaptação que separa "de onde vêm os dados" de "o que o domínio entende por Turma e Aluno". Cadastro manual e CSV são, conceitualmente, mais dois adaptadores desse mesmo tipo (um formulário e um parser, em vez de uma API); nenhum dos quatro deveria exigir uma segunda modelagem de Turma/Aluno — só um novo adaptador em `infrastructure/` convertendo para as mesmas entidades desta seção 2.

**Consequência arquitetural:** quando a persistência real existir, o caminho natural é um `ClassroomImportService` (ou nome equivalente) que recebe qualquer `ClassroomProvider` (mock, Google, Teams, CSV, manual) e grava `Turma`/`Aluno`/`Matrícula` através dos mesmos contratos de repositório — sem a UI de importação precisar saber qual provedor está por trás. Isso não é implementado nesta Sprint; é a extensão natural do que já foi decidido em D-019.

---

## 6. Arquitetura proposta

- **Domínio modular por contexto.** Cada contexto da seção 1 vira um módulo em `app/src/modules/*`, com sua camada `domain/` (entidades + contratos de repositório), como já feito em `modules/library`, `modules/classroom` e `modules/integrations`. Contextos não acessam os internos uns dos outros — conversam por interfaces/IDs.
- **Duas grandes fatias:** *Autoria/Currículo* (templates, editados por professores/admin) e *Aprendizagem/Entrega* (instâncias e dados de aluno). São ciclos de vida e permissões diferentes; separá-los desde já evita o maior risco do modelo (P2).
- **Multi-tenancy por Escola, particionado por Ano Letivo.** Todo dado operacional carrega o tenant e o período; o catálogo de conteúdo pode ser global. Isolamento é regra de domínio, não só de banco.
- **Identidade + Papel.** Autorização deriva do Perfil no contexto, não de subclasses de Usuário.
- **Transversais orientados a eventos.** `Notificação` e `Agenda` reagem a eventos do domínio (entrega feita, prazo criado), evitando acoplamento direto.
- **Integrações como adaptadores.** `Integração`/`ClassroomProvider` isola serviços externos; o domínio pedagógico funciona mesmo com integrações indisponíveis (degradação graciosa) — já a postura adotada em D-019.
- **Alinhamento com o Design System / front:** os módulos de domínio são independentes da UI; Landing e Plataforma consomem o mesmo Design System, mas só a Plataforma consome estes módulos.

---

## 7. Possíveis problemas futuros

1. **Conflação template × instância (P2).** O maior risco. Se `Missão` guardar produção do aluno, ou se editar um curso alterar turmas em andamento, o histórico corrompe. Mitigado pela separação Autoria/Entrega e por versionamento.
2. **Versionamento de conteúdo.** Uma missão editada depois de alunos a concluírem: a `Atividade` precisa fixar a versão publicada. Sem estratégia de versão desde cedo, vira retrabalho.
3. **Usuário multi-papel e multi-escola.** Herança rígida quebra quando alguém é professor e aluno, ou atua em duas escolas. Resolvido por Perfil (P1), mas exige disciplina na autorização.
4. **Isolamento de tenant (LGPD).** Vazamento entre escolas é risco sério. Escopo por Escola precisa ser invariante checada em todo acesso; dados de menores exigem cuidado redobrado (consentimento, minimização, retenção).
5. **Proveniência de IA (P4).** Sem registrar uso de IA por produção, perde-se justamente o que o produto quer ensinar (uso crítico/ético). Difícil de retroencaixar depois.
6. **"Atividade" vs "Missão" vs "Etapa".** Fronteira sutil; se não ficar clara, gera duplicação. Aqui: Missão/Etapa = template; Atividade = instância entregável à turma.
7. **Diário e Produção como histórico imutável.** Precisam de append-only/versionamento e política de retenção; edição destrutiva apaga a trajetória de amadurecimento — que é o valor pedagógico.
8. **Escopo de conteúdo (global vs. escola).** Curso/Material/Biblioteca IAH global convivendo com conteúdo próprio da escola gera regras de visibilidade e herança não triviais.
9. **Avaliação subdefinida.** `Competência` existe, mas rubrica/nota/feedback estruturado ainda não — a avaliação de `Produção do Aluno` está rasa.
10. **Volume de Notificação/Agenda.** Transversais orientados a eventos podem gerar ruído; sem preferências e agregação, viram spam.
11. **Reconciliação de importação (nova).** Quando a mesma Turma/Aluno existir em mais de uma origem (ex.: cadastro manual + depois sincronizado do Google Classroom), é preciso uma regra de identidade (ex.: e-mail como chave) para não duplicar Alunos — ainda não definida.

---

## 8. Melhorias sugeridas (antes de implementar)

1. **Formalizar o eixo template↔instância** com nomes explícitos (ex.: `Curso`/`OfertaDeCurso`, `Missão`/`Atividade`) e uma **política de versionamento** de conteúdo publicada — decisão de arquitetura, não de código.
2. **Adotar `Matrícula`, `Perfil` e `Ano Letivo` como entidades de pleno direito** (não elos/atributos simples), pois carregam estado e período — já refletido acima.
3. **Modelar Avaliação** explicitamente: `Rubrica` + `Avaliação` ligando `Produção do Aluno` a `Competência`s, com feedback. Fecha a lacuna 9.
4. **Definir a estratégia de multi-tenancy e LGPD** desde o modelo: escopo por Escola/Ano Letivo como invariante, política de retenção, consentimento para menores, papel do admin IAH global.
5. **Elevar a proveniência de IA a cidadão de primeira classe** (`RegistroDeUsoDeIA` associado à Produção): ferramenta, finalidade, e se foi apoio ou autoria — sustenta o discurso pedagógico e futuras métricas.
6. **Tratar transversais como eventos de domínio** (`ProduçãoEntregue`, `PrazoCriado`) que alimentam Notificação/Agenda, com preferências por usuário.
7. **Confirmar o escopo do catálogo** (global IAH vs. por escola) antes de modelar visibilidade de Curso/Material/Biblioteca.
8. **Portfólio como visão, não entidade nova:** é a agregação das Produções/Projetos do aluno; evita duplicação de dado.
9. **Definir a chave de reconciliação de importação** (provável: e-mail do aluno/professor) antes de implementar qualquer adaptador de CSV/Google/Microsoft (problema 11 acima).

---

## 9. Pontos em aberto (decisões do produto)

- **Catálogo global vs. por escola:** o conteúdo (Curso/Missão/Biblioteca) é padronizado pela IAH, personalizável por escola, ou ambos? Define visibilidade e versionamento.
- **Autoria por professores:** professores criam missões próprias ou só usam o catálogo IAH? Muda o modelo de permissão de autoria.
- **Hackathon:** é intra-escola, entre escolas, ou nacional (IAH)? Afeta escopo e tenancy.
- **Diário do Auditor:** sempre privado, ou o professor/gestor pode acompanhar? Impacta privacidade e avaliação (mesmo tema do backlog `ROADMAP.md`, item 5).
- **Avaliação:** haverá nota/conceito formal (integração com sistema da escola) ou só feedback qualitativo por competência?
- **Menores de idade:** modelo de consentimento e eventual entidade `Responsável` (pais) — não listado, mas provável exigência de LGPD.
- **Reconciliação de identidade entre origens:** quando Google Classroom e cadastro manual descrevem o "mesmo" aluno, qual é a chave de identidade única? (novo, ver seção 5).
