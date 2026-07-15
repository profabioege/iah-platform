# 06 — Modelo Conceitual do Domínio

Modelo conceitual do sistema de ensino IAH (disciplina **Inteligência Artificial & Humanidades**, Ensino Médio). Documento de referência oficial — substitui [DOMAIN_MODEL.md](DOMAIN_MODEL.md) (arquivo mantido apenas como redirecionamento). **É conceitual**: não define banco, SQL, Prisma nem tipos de código — apenas entidades, atributos, relacionamentos e regras de negócio.

Ver também [MISSION.md](MISSION.md) (estrutura padrão de Missão), [01_PRODUCT_VISION.md](01_PRODUCT_VISION.md) e [04_ARCHITECTURE.md](04_ARCHITECTURE.md).

---

## 1. Princípios de modelagem (decisões estruturais)

Quatro decisões atravessam todo o modelo. Elas são mais importantes que qualquer entidade isolada.

**P1 — Identidade separada de Papel.** `Usuário` é a identidade (uma pessoa que faz login). `Aluno`, `Professor` e `Administrador` **não são tipos rígidos e mutuamente exclusivos** de Usuário — são *papéis* que uma identidade assume, possivelmente mais de um (um professor pode também ser coordenador/admin). Modelar como herança rígida (`Aluno extends Usuário`) engessa o produto. Adotamos `Usuário` + `Perfil/Papel` + extensões de dados por papel.

**P2 — Autoria separada de Entrega (template vs. instância).** O conteúdo pedagógico (`Curso → Módulo → Missão → Etapa`) é **material autoral, versionável**, criado uma vez. A vivência disso por uma turma é uma **instância** (a `Turma` roda um `Curso`; o `Aluno` produz dentro de uma `Atividade`). Se a mesma entidade servir de template e de registro do aluno, editar uma missão corromperá o histórico de quem já a fez. **Esta é a decisão mais crítica do modelo.**

**P3 — Escola como tenant (multi-tenancy).** O IAH é SaaS vendido a instituições. `Escola` é a fronteira de isolamento: turmas, usuários, produções e integrações pertencem a uma escola. O catálogo de conteúdo (`Curso`) pode ser global (IAH) ou próprio da escola — ver Pontos em Aberto.

**P4 — Rastreabilidade do uso de IA.** O ethos do produto é o uso *ético e crítico* da IA. Portanto "qual ferramenta de IA foi usada, em que produção, com qual prompt" é informação de domínio de primeira classe (`Produção do Aluno` referencia `Ferramenta de IA`), não um detalhe técnico.

---

## 2. Contextos delimitados (mapa de módulos)

As entidades se agrupam em contextos coesos, que devem virar módulos (`app/src/modules/*`), seguindo o padrão já iniciado em `modules/library`:

| Contexto | Entidades |
|---|---|
| **Identidade & Acesso** | Usuário, Perfil, Aluno, Professor, Administrador |
| **Instituição (tenant)** | Escola, Turma, Matrícula |
| **Currículo & Autoria** (templates) | Curso, Módulo, Missão, Etapa da Missão, Material Didático, Ferramenta de IA, Competência |
| **Aprendizagem & Entrega** (instâncias) | Atividade, Produção do Aluno, Progresso, Diário do Auditor |
| **Colaboração** | Projeto, Hackathon |
| **Acervo** | Biblioteca |
| **Operação & Transversais** | Agenda, Integração, Notificação |

---

## 3. Catálogo de entidades

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

#### Aluno
- **Finalidade:** extensão de dados e trajetória de quem cursa a disciplina — o "Auditor da Realidade".
- **Atributos:** id (referência ao Usuário/Perfil), turma(s), ano/série, progresso agregado, portfólio.
- **Relacionamentos:** é um `Usuário` no papel aluno; matriculado em `Turma` via `Matrícula`; autor de `Produção do Aluno`, `Diário do Auditor`, participações em `Projeto`/`Hackathon`; possui `Progresso` por Missão.
- **Regras:** só existe vinculado a ao menos uma Turma ativa; seu histórico de produções é imutável mesmo que a Missão-template mude (P2).

#### Professor
- **Finalidade:** conduz turmas, acompanha alunos e (conforme permissão) autora conteúdo.
- **Atributos:** id, turmas que leciona, áreas.
- **Relacionamentos:** é um `Usuário` no papel professor; leciona uma ou mais `Turma`; pode autorar `Curso`/`Módulo`/`Missão`; avalia `Produção do Aluno`; abre `Caso`/`Missão` para a turma.
- **Regras:** só acessa dados de alunos de suas turmas (escopo); autoria exige permissão explícita (nem todo professor autora conteúdo).

#### Administrador
- **Finalidade:** gestão da instituição (usuários, turmas, integrações) ou da plataforma IAH (catálogo global).
- **Atributos:** id, escopo (escola | plataforma IAH), permissões.
- **Relacionamentos:** é um `Usuário` no papel administrador; gerencia `Escola`, `Turma`, `Usuário`, `Integração`.
- **Regras:** admin de escola nunca vê dados de outra escola; admin IAH (global) gerencia o catálogo compartilhado e não acessa produções de alunos sem motivo/registro (LGPD).

### Contexto: Instituição (tenant)

#### Escola
- **Finalidade:** instituição cliente do SaaS; fronteira de isolamento de dados (tenant).
- **Atributos:** id, nome, identificação institucional, plano/contrato, configurações, marca (futuro white-label), status.
- **Relacionamentos:** contém `Usuário`s, `Turma`s, `Integração`s; pode ter `Curso`s próprios além do catálogo IAH.
- **Regras:** todo dado operacional pertence a exatamente uma Escola; encerrar contrato suspende acesso mas preserva dados por período legal.

#### Turma
- **Finalidade:** grupo de alunos conduzido por professor(es), rodando um Curso num período. É a **instância de entrega** do currículo (P2).
- **Atributos:** id, nome, ano letivo/período, série, escola, curso vinculado.
- **Relacionamentos:** pertence a `Escola`; roda um `Curso`; reúne `Aluno`s via `Matrícula`; conduzida por `Professor`(es); origem de `Atividade`s, itens de `Agenda`, `Projeto`s e `Hackathon`s.
- **Regras:** pertence a uma única Escola; ao arquivar a turma, o histórico dos alunos permanece acessível.

#### Matrícula
- **Finalidade:** vínculo aluno↔turma com estado próprio (entidade associativa, não um simples elo).
- **Atributos:** id, aluno, turma, data de entrada/saída, situação (ativa/trancada/concluída).
- **Relacionamentos:** liga `Aluno` a `Turma`.
- **Regras:** um aluno pode ter matrículas em turmas diferentes ao longo do tempo; produções pertencem ao aluno, mas são contextualizadas pela matrícula/turma em que ocorreram.

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

#### Missão
- **Finalidade:** unidade central de aprendizagem investigativa (estrutura padrão em [MISSION.md](MISSION.md)). Já modelada em `modules/library/domain`.
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
- **Finalidade:** habilidade desenvolvida (pensamento crítico, uso ético de IA, autoria…), base para avaliação.
- **Atributos:** id, nome, descrição, categoria, (opcional) alinhamento a referencial (BNCC).
- **Relacionamentos:** desenvolvida por `Missão`s; evidenciada por `Produção do Aluno`.
- **Regras:** reutilizável entre missões; base para rubricas de avaliação (ver Melhorias).

### Contexto: Aprendizagem & Entrega (instâncias, dados do aluno)

#### Atividade
- **Finalidade:** instância de uma Etapa/Missão disponibilizada a uma Turma para o aluno realizar — a ponte entre template e entrega.
- **Atributos:** id, missão/etapa de origem, turma, prazo, configurações, status.
- **Relacionamentos:** deriva de `Missão`/`Etapa`; pertence a `Turma`; recebe `Produção do Aluno`; aparece na `Agenda`.
- **Regras:** referencia a versão do conteúdo vigente quando publicada (P2); prazo e disponibilidade são da instância, não do template.

#### Produção do Aluno
- **Finalidade:** artefato/entrega criado pelo aluno numa atividade (relatório, análise, mídia) — o cerne do portfólio.
- **Atributos:** id, aluno, atividade, conteúdo/anexos, versão/rascunho, data, situação (rascunho/entregue/avaliado), avaliação/feedback, **ferramentas de IA utilizadas + registro de uso**.
- **Relacionamentos:** de um `Aluno`; para uma `Atividade`; referencia `Ferramenta de IA` (P4); avaliada por `Professor`; compõe o portfólio; evidencia `Competência`s.
- **Regras:** imutável após entrega (novas versões viram revisões); histórico preservado mesmo com mudança do template (P2); registro de uso de IA é obrigatório quando a atividade previa ferramentas.

#### Progresso
- **Finalidade:** estado de avanço do aluno em uma missão/curso (visão do aluno e do professor).
- **Atributos:** id, aluno, missão/atividade, etapas concluídas, percentual, situação, timestamps.
- **Relacionamentos:** de um `Aluno` sobre uma `Missão`/`Atividade` numa `Turma`.
- **Regras:** derivado de etapas/entregas concluídas; não é fonte de verdade das produções, é agregação.

#### Diário do Auditor
- **Finalidade:** espaço reflexivo pessoal do aluno; registra descobertas, dúvidas e mudanças de perspectiva ao longo do curso.
- **Atributos:** id, aluno; contém entradas (**Reflexão**: texto, data, missão de origem, visibilidade).
- **Relacionamentos:** de um `Aluno`; entradas ligadas a `Missão`/`Atividade`.
- **Regras:** privado por padrão (aluno decide compartilhar com o professor); entradas são append-only (histórico de amadurecimento); não é avaliação, é registro.

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
- **Finalidade:** conexão configurada com um serviço externo (Google Classroom, Google Agenda, Canva, provedor de IA), com credenciais/escopo.
- **Atributos:** id, tipo/provedor, escopo (escola ou usuário), credenciais/tokens (referência segura), status, última sincronização.
- **Relacionamentos:** pertence a `Escola` ou `Usuário`; habilita `Agenda`, `Material`, `Ferramenta de IA`, importação de turmas.
- **Regras:** tokens nunca expostos ao domínio de aplicação; integração pode ser revogada; falha de integração não pode quebrar o fluxo pedagógico (degradação graciosa).

#### Notificação
- **Finalidade:** aviso a um usuário sobre um evento relevante (novo prazo, feedback recebido, convite de projeto).
- **Atributos:** id, destinatário, tipo, mensagem, referência à origem, canal (in-app/e-mail), lida/não lida, data.
- **Relacionamentos:** para um `Usuário`; originada por eventos de `Atividade`, `Produção`, `Projeto`, `Agenda`, `Hackathon`.
- **Regras:** transversal e orientada a eventos; preferências de canal por usuário; entrega não bloqueia a ação que a originou.

---

## 4. Diagrama conceitual (ASCII)

```
IDENTIDADE & ACESSO                         INSTITUIÇÃO (tenant)
┌──────────┐   assume   ┌────────┐          ┌──────────┐
│ Usuário  │───────────▶│ Perfil │          │  Escola  │ (fronteira de isolamento)
└────┬─────┘  1..*      └────────┘          └────┬─────┘
     │ especializa-se (por papel)                │ contém
     ▼                                            ▼
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
┌──────────┐  ┌───────────┐               │ Diário do Auditor  │──▶ Reflexão(entradas)
│ Projeto  │  │ Hackathon │               └────────────────────┘
└────┬─────┘  └─────┬─────┘
     └─── de Aluno(s), em Turma, gera Produção ───┘

TRANSVERSAIS
┌──────────┐   sincroniza   ┌─────────────┐        ┌──────────────┐
│  Agenda  │◀───────────────│ Integração  │        │ Notificação  │◀─ eventos de
└──────────┘  (Google etc.) └─────────────┘        └──────────────┘   Atividade/Produção/
   ▲ prazos de Atividade/Hackathon                                    Projeto/Agenda → Usuário
```

---

## 5. Arquitetura proposta

- **Domínio modular por contexto.** Cada contexto da seção 2 vira um módulo em `app/src/modules/*`, com sua camada `domain/` (entidades + contratos de repositório), como já feito em `modules/library`. Contextos não acessam os internos uns dos outros — conversam por interfaces/IDs.
- **Duas grandes fatias:** *Autoria/Currículo* (templates, editados por professores/admin) e *Aprendizagem/Entrega* (instâncias e dados de aluno). São ciclos de vida e permissões diferentes; separá-los desde já evita o maior risco do modelo (P2).
- **Multi-tenancy por Escola.** Todo dado operacional carrega o tenant; o catálogo de conteúdo pode ser global. Isolamento é regra de domínio, não só de banco.
- **Identidade + Papel.** Autorização deriva do Perfil no contexto, não de subclasses de Usuário.
- **Transversais orientados a eventos.** `Notificação` e `Agenda` reagem a eventos do domínio (entrega feita, prazo criado), evitando acoplamento direto.
- **Integrações como adaptadores.** `Integração` isola serviços externos; o domínio pedagógico funciona mesmo com integrações indisponíveis (degradação graciosa). Alinhado às pastas já criadas em `lib/integrations/*`.
- **Alinhamento com o Design System / front:** os módulos de domínio são independentes da UI; Landing e Plataforma consomem o mesmo Design System (ver [03_BRAND_GUIDELINES.md](03_BRAND_GUIDELINES.md) e [04_ARCHITECTURE.md](04_ARCHITECTURE.md)), mas só a Plataforma consome estes módulos.

---

## 6. Possíveis problemas futuros

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

---

## 7. Melhorias sugeridas (antes de implementar)

1. **Formalizar o eixo template↔instância** com nomes explícitos (ex.: `Curso`/`OfertaDeCurso`, `Missão`/`Atividade`) e uma **política de versionamento** de conteúdo publicada — decisão de arquitetura, não de código.
2. **Adotar `Matrícula` e `Perfil` como entidades de pleno direito** (não elos simples), pois carregam estado e período — já refletido acima.
3. **Modelar Avaliação** explicitamente: `Rubrica` + `Avaliação` ligando `Produção do Aluno` a `Competência`s, com feedback. Fecha a lacuna 9.
4. **Definir a estratégia de multi-tenancy e LGPD** desde o modelo: escopo por Escola como invariante, política de retenção, consentimento para menores, papel do admin IAH global.
5. **Elevar a proveniência de IA a cidadão de primeira classe** (`RegistroDeUsoDeIA` associado à Produção): ferramenta, finalidade, e se foi apoio ou autoria — sustenta o discurso pedagógico e futuras métricas.
6. **Tratar transversais como eventos de domínio** (`ProduçãoEntregue`, `PrazoCriado`) que alimentam Notificação/Agenda, com preferências por usuário.
7. **Confirmar o escopo do catálogo** (global IAH vs. por escola) antes de modelar visibilidade de Curso/Material/Biblioteca.
8. **Portfólio como visão, não entidade nova:** é a agregação das Produções/Projetos do aluno; evita duplicação de dado.

---

## 8. Pontos em aberto (decisões do produto)

- **Catálogo global vs. por escola:** o conteúdo (Curso/Missão/Biblioteca) é padronizado pela IAH, personalizável por escola, ou ambos? Define visibilidade e versionamento.
- **Autoria por professores:** professores criam missões próprias ou só usam o catálogo IAH? Muda o modelo de permissão de autoria.
- **Hackathon:** é intra-escola, entre escolas, ou nacional (IAH)? Afeta escopo e tenancy.
- **Diário do Auditor:** sempre privado, ou o professor pode acompanhar? Impacta privacidade e avaliação.
- **Avaliação:** haverá nota/conceito formal (integração com sistema da escola) ou só feedback qualitativo por competência?
- **Menores de idade:** modelo de consentimento e eventual entidade `Responsável` (pais) — não listado, mas provável exigência de LGPD.
