# Padrão Oficial de uma Missão IAH

Guia para **autoria** de Missões. Enquanto [MISSION.md](MISSION.md) define *a estrutura* (os 11 blocos) e a entidade `Mission` em código define *o formato de dados*, este documento define *como escrever* uma Missão que mantenha a metodologia do IAH.

Público: professores e autores de conteúdo. Ao seguir este padrão, qualquer professor consegue criar uma nova Missão coerente com o produto, sem depender de quem escreveu as anteriores.

**Referência viva:** a Missão 01 — *A Fábrica de Notícias* — é a implementação oficial deste template. Sempre que uma orientação aqui parecer abstrata, veja como ela foi resolvida na Missão 01 (`app/src/content/missions/01-a-fabrica-de-noticias.ts`).

---

## Antes de escrever: os 5 princípios inegociáveis

Toda Missão, sem exceção, respeita os princípios de produto ([02_PRODUCT_PRINCIPLES.md](02_PRODUCT_PRINCIPLES.md)). Na prática da autoria, isso vira 5 testes:

1. **A investigação vale mais que a resposta.** A Missão propõe uma pergunta que não se responde por consulta rápida. Se a pergunta tem uma resposta única e "googlável", ela ainda não é uma Missão.
2. **A IA é objeto de estudo, não atalho.** A Inteligência Artificial aparece para ser observada, testada e questionada — nunca para "dar a resposta" no lugar do aluno.
3. **O professor permanece no centro.** A Missão é material para o professor conduzir, não um roteiro que dispensa a mediação humana.
4. **O aluno é Auditor da Realidade.** O tom trata o estudante como um investigador competente, não como alguém que recebe conteúdo. Nada de infantilização.
5. **Todo bloco tem propósito pedagógico.** Se um bloco existe só para "preencher o modelo", ele está errado. Cada bloco puxa o aluno um passo adiante na investigação.

---

## Anatomia de uma Missão

Uma Missão é **metadados** + **11 blocos**.

### Metadados

| Campo | O que é | Orientação |
|---|---|---|
| `number` | Número da Missão no curso | Sequencial, único |
| `module` | Módulo a que pertence | Ex.: "Módulo 1 — O Auditor da Realidade" |
| `order` | Posição dentro do módulo | Define a sequência pedagógica |
| `status` | Situação editorial | `draft` enquanto escreve; `published` quando pronta; `archived` quando aposentada |

Regra de ouro dos metadados: a ordem (`module` + `order`) **é** a progressão pedagógica. Uma Missão pressupõe o que veio antes dela e prepara o que vem depois.

---

## Os 11 blocos

Cada bloco abaixo traz: **objetivo · finalidade pedagógica · como redigir · boas práticas · erros a evitar · critério de qualidade · exemplo (Missão 01)**.

### 1. Título

- **Objetivo:** nomear a Missão de forma memorável.
- **Finalidade pedagógica:** um bom título já cria curiosidade e ancora a Missão na memória do aluno.
- **Como redigir:** curto (2–5 palavras), concreto, evocativo. Prefira uma imagem a uma descrição.
- **Boas práticas:** metáforas que o aluno reconhece ("A Fábrica de Notícias"); títulos que sugerem tensão ou mistério.
- **Erros a evitar:** títulos genéricos e escolares ("Atividade sobre IA e mídia"); títulos que já entregam a conclusão.
- **Critério de qualidade:** lido isolado, o título desperta uma pergunta na cabeça do aluno.
- **Exemplo:** *A Fábrica de Notícias*.

### 2. Objetivo

- **Objetivo:** declarar o que o aluno será capaz de fazer/compreender ao final.
- **Finalidade pedagógica:** dá direção à investigação e serve de critério para avaliar se a Missão cumpriu seu papel.
- **Como redigir:** 1–3 frases, focadas em **capacidade** ("compreender que…", "desenvolver critérios para…"), não em tarefa ("fazer um cartaz").
- **Boas práticas:** conectar o objetivo à postura de Auditor; incluir tanto um saber (conceito) quanto uma prática (o que passa a saber fazer).
- **Erros a evitar:** confundir objetivo com desafio (o *que* o aluno faz é o bloco 7); objetivos vagos ("aprender sobre IA").
- **Critério de qualidade:** dá para checar, ao final, se foi atingido.
- **Exemplo:** compreender que a IA generativa produz textos convincentes porém falsos e desenvolver os primeiros critérios de verificação — assumindo a postura de Auditor da Realidade.

### 3. Pergunta Norteadora

- **Objetivo:** a pergunta que organiza toda a Missão.
- **Finalidade pedagógica:** é o coração do método IAH — mantém o aluno em investigação, não em recepção.
- **Como redigir:** uma pergunta aberta, genuína (sem resposta única), que caiba na vida do aluno. De preferência provocativa.
- **Boas práticas:** perguntas que expõem um conflito ("quem decide o que é verdade?"); perguntas que sobrevivem à aula (o aluno continua pensando nelas depois).
- **Erros a evitar:** perguntas fechadas (sim/não) ou factuais ("o que é uma IA generativa?"); perguntas retóricas com resposta óbvia.
- **Critério de qualidade:** duas pessoas competentes poderiam responder de formas diferentes e defensáveis.
- **Exemplo:** *Se uma máquina pode escrever qualquer notícia, quem — ou o quê — decide o que é verdade?*

### 4. Contexto

- **Objetivo:** situar o aluno no problema, com o mundo real.
- **Finalidade pedagógica:** ancora a investigação em algo concreto e atual, criando urgência e pertinência.
- **Como redigir:** 1–2 parágrafos; parta de um fenômeno real e reconhecível; termine estreitando para o que o aluno vai fazer.
- **Boas práticas:** evitar alarmismo ("tudo é falso") e ingenuidade; nomear o paradoxo central da Missão.
- **Erros a evitar:** aula expositiva disfarçada de contexto; despejar definições técnicas; datar demais (evite algo que envelhece em um mês).
- **Critério de qualidade:** ao terminar de ler, o aluno entende *por que isso importa para ele*.
- **Exemplo:** o trecho que parte de "uma IA escreve uma reportagem em segundos" e chega a "parecer verdadeiro deixou de ser prova de que algo é verdadeiro".

### 5. Material Didático

- **Objetivo:** listar os recursos de apoio à investigação.
- **Finalidade pedagógica:** dá ao aluno matéria-prima confiável, em vez de deixá-lo à deriva na busca aberta.
- **Como redigir:** lista curta e curada; para cada item, deixe claro o que é e para que serve.
- **Boas práticas:** priorizar material autoral do IAH; misturar tipos (texto-base, dossiê, guia/checklist); registrar origem/licença de terceiros.
- **Erros a evitar:** lista longa demais (o aluno se perde); material que entrega a resposta; links que envelhecem.
- **Critério de qualidade:** com esses materiais e só eles, o desafio é executável.
- **Exemplo:** texto-base "Como uma IA escreve uma notícia"; Dossiê de Auditoria com 4 manchetes; guia de 5 perguntas de verificação.

### 6. Ferramentas de IA

- **Objetivo:** indicar quais ferramentas de IA a Missão usa e com que papel.
- **Finalidade pedagógica:** sustenta o pilar do produto — usar IA de forma crítica e ética, observando-a por dentro.
- **Como redigir:** para cada ferramenta, diga **para quê** ela entra e reforce que é objeto de estudo/apoio.
- **Boas práticas:** usar a IA para o aluno *ver o truque* (ex.: gerar um texto falso e perceber como engana); incluir a orientação de uso ético.
- **Erros a evitar:** IA como caixa de respostas; usar ferramenta sem propósito claro ("porque é legal"); esconder que o conteúdo foi gerado por IA.
- **Critério de qualidade:** fica explícito o que o aluno aprende *sobre* a IA ao usá-la.
- **Exemplo:** assistente de texto para **gerar** uma manchete falsa e observar como soa convincente; ferramenta de busca para confrontar fontes.

### 7. Desafio

- **Objetivo:** a tarefa concreta que o aluno executa.
- **Finalidade pedagógica:** transforma a pergunta norteadora em ação investigativa.
- **Como redigir:** instrução clara e acionável; defina o que fazer e o que justificar. Um bom desafio combina análise + criação.
- **Boas práticas:** exigir evidência ("justifique com pelo menos uma evidência"); pedir que o aluno produza algo autoral, não só responda.
- **Erros a evitar:** desafio vago ("reflita sobre…"); trabalho que se resolve copiando; tarefa que não cabe no tempo da aula.
- **Critério de qualidade:** dois alunos entregariam produções diferentes, ambas válidas.
- **Exemplo:** auditar 4 manchetes (real vs. fabricada por IA) com evidência; depois gerar você mesmo uma manchete falsa e explicar o que a torna crível.

### 8. Produção do Aluno

- **Objetivo:** descrever o artefato que o aluno cria.
- **Finalidade pedagógica:** é a evidência concreta do pensamento — a peça do portfólio (ver [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md)).
- **Como redigir:** nomeie o artefato e liste o que ele deve conter; defina formato e tom.
- **Boas práticas:** dar um nome de identidade ("Relatório de Auditoria"); pedir estrutura (itens a), b), c)); pedir voz autoral.
- **Erros a evitar:** produção sem forma definida; confundir produção (o artefato) com entrega (o ato de entregar, bloco 10).
- **Critério de qualidade:** o professor consegue avaliar a produção contra o objetivo (bloco 2) e as competências (bloco 11).
- **Exemplo:** um Relatório de Auditoria com (a) 4 vereditos justificados, (b) a manchete falsa gerada, (c) a análise de por que engana.

### 9. Reflexão no Diário do Auditor

- **Objetivo:** a pergunta reflexiva que o aluno registra no Diário.
- **Finalidade pedagógica:** consolida a metacognição — o aluno percebe *como* pensou e o que mudou nele. É registro pessoal, não avaliação.
- **Como redigir:** 1–2 perguntas pessoais, sobre o processo (não sobre o conteúdo).
- **Boas práticas:** perguntar sobre o momento de dúvida/erro ("onde você quase se enganou?"); conectar ao cotidiano do aluno.
- **Erros a evitar:** transformar a reflexão em prova ("explique o que é IA generativa"); perguntas genéricas ("o que achou da aula?").
- **Critério de qualidade:** a reflexão só pode ser respondida por quem viveu a investigação — não se copia de outro aluno.
- **Exemplo:** *Em que momento você quase se enganou? O que muda na forma como você vai ler a próxima notícia no seu celular?*

### 10. Entrega

- **Objetivo:** definir como e quando a produção é considerada concluída.
- **Finalidade pedagógica:** dá fechamento à aula e critérios claros de conclusão.
- **Como redigir:** diga onde/como se entrega e o que caracteriza "concluído".
- **Boas práticas:** critério de conclusão objetivo (quais partes precisam estar preenchidas); alinhar ao que a plataforma suporta hoje.
- **Erros a evitar:** critérios subjetivos ("caprichar"); prometer recursos que a plataforma ainda não tem.
- **Critério de qualidade:** o aluno sabe, sem perguntar, se já terminou.
- **Exemplo:** Relatório registrado na plataforma (na Fase 1, salvo localmente); concluída quando os 4 vereditos, a manchete gerada e a reflexão estão preenchidos.

### 11. Competências Desenvolvidas

- **Objetivo:** nomear as habilidades que a Missão desenvolve.
- **Finalidade pedagógica:** conecta a Missão ao projeto formativo maior e orienta a avaliação.
- **Como redigir:** lista de 3–6 competências, em linguagem clara.
- **Boas práticas:** competências que a produção realmente evidencia; misturar cognitivas (pensamento crítico) e do domínio IAH (uso ético da IA).
- **Erros a evitar:** listar competências que a Missão não exercita de fato; inventar alinhamentos a referenciais (ex.: códigos BNCC) sem verificação.
- **Critério de qualidade:** cada competência listada tem evidência correspondente na produção do aluno.
- **Exemplo:** pensamento crítico; verificação de fontes; uso ético e crítico da IA; argumentação por evidências; letramento midiático e digital.

---

## Checklist de qualidade da Missão inteira

Antes de marcar `status: published`, a Missão passa por todos estes testes:

- [ ] A **pergunta norteadora** é genuinamente aberta (bloco 3).
- [ ] O **desafio** responde diretamente à pergunta norteadora (blocos 7 ↔ 3).
- [ ] A **produção** é avaliável contra **objetivo** e **competências** (blocos 8 ↔ 2 ↔ 11).
- [ ] A **IA** aparece como objeto de estudo, nunca como fonte de resposta (bloco 6).
- [ ] Com o **material didático** listado, o desafio é executável (blocos 5 ↔ 7).
- [ ] A Missão cabe no **tempo** previsto de aula.
- [ ] O tom trata o aluno como **Auditor da Realidade** do começo ao fim.
- [ ] Nenhum bloco existe só para "preencher o modelo".

---

## Erros que comprometem a Missão inteira

- **Pergunta fechada.** Se a pergunta norteadora tem resposta única, a Missão inteira vira exercício, não investigação.
- **IA como atalho.** No instante em que a IA "dá a resposta", o produto perde seu propósito.
- **Desconexão interna.** Objetivo fala de uma coisa, desafio pede outra, competências prometem uma terceira. Os blocos precisam contar a mesma história.
- **Aula expositiva disfarçada.** Contexto e material que "explicam tudo" tiram do aluno o trabalho de investigar.
- **Infantilização.** Linguagem "para criança" quebra a relação de respeito com o estudante de Ensino Médio.

---

## Da redação ao código

Cada Missão é **um arquivo de conteúdo** em `app/src/content/missions/`, que implementa a entidade `Mission` (os 11 blocos + metadados mapeiam 1:1 nos campos do tipo). O arquivo é registrado no índice `app/src/content/missions/index.ts`, e o `MissionReader` local o serve à interface.

**Adicionar uma nova Missão = criar um novo arquivo de conteúdo e registrá-lo no índice.** Nenhum componente de interface muda. Ver [04_ARCHITECTURE.md](04_ARCHITECTURE.md) e o histórico em [07_DECISIONS.md](07_DECISIONS.md).
