# 01 — Visão de Produto

Documento de referência oficial. Substitui e expande [PRODUCT.md](PRODUCT.md).

## Visão

A **Inteligência Artificial & Humanidades (IAH)** existe para que estudantes deixem de ser consumidores passivos de conteúdo sobre Inteligência Artificial e passem a ser **investigadores ativos da realidade** — capazes de questionar, verificar e produzir conhecimento com IA, e não apesar dela ou por causa dela.

A plataforma não é um Ambiente Virtual de Aprendizagem (AVA) nem um repositório de PDFs: é um **laboratório digital de aprendizagem, investigação e produção de conhecimento**, onde o estudante assume o papel de **Auditor da Realidade**.

## Missão

Levar escolas de Ensino Médio a ensinar Inteligência Artificial com **método** — unindo metodologia própria, conteúdo autoral e uso ético/crítico da IA em uma experiência coerente, conduzida pelo professor.

## Objetivos

- Dar às escolas um sistema de ensino completo para a disciplina IAH, pronto para uso em sala de aula.
- Desenvolver pensamento crítico, criatividade e uso ético da IA como competências centrais, não como conteúdo acessório.
- Preservar o professor como condutor da experiência pedagógica — a tecnologia organiza, não substitui.
- Registrar a trajetória de cada estudante (produções, reflexões, competências) como um portfólio vivo.
- Reduzir a fricção operacional da escola integrando-se a ferramentas já usadas no cotidiano escolar (Google Classroom, Google Agenda, Canva).
- Validar o produto em sala de aula real antes de qualquer escala comercial (ver [05_ROADMAP.md](05_ROADMAP.md) e [07_DECISIONS.md](07_DECISIONS.md)).

## Público-alvo

- **Alunos** do Ensino Médio matriculados na disciplina IAH.
- **Professores** que conduzem a disciplina — autores, mediadores e avaliadores da experiência.
- **Coordenação pedagógica**, que acompanha a implementação sem perder profundidade.
- **Diretores e mantenedores** de escolas particulares e **redes de ensino**, decisores da adoção institucional.

## Posicionamento

O IAH se posiciona como **sistema de ensino**, não como curso gravado nem como plataforma de gestão genérica.

| O IAH não é | O IAH é |
|---|---|
| Um curso gravado | Investigação guiada, com professor no centro |
| Apenas uma plataforma de gestão | Um laboratório de produção de conhecimento |
| Um substituto do professor | Um apoio que amplia o alcance pedagógico |
| Um AVA tradicional / repositório de PDFs | Um ambiente vivo de missões, projetos e reflexão |

## Diferenciais

- **Metodologia própria**, expressa na estrutura padrão de Missão ([MISSION.md](MISSION.md)): objetivo, pergunta norteadora, contexto, desafio, produção, reflexão, entrega e competências.
- **Conteúdo didático autoral**, não genérico.
- **IA como objeto de estudo e apoio crítico** — não um recurso decorativo; todo uso é registrado com finalidade pedagógica (ver [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md), princípio P4).
- **Diário do Auditor**: espaço reflexivo pessoal, não avaliativo, que registra a maturação do pensamento crítico do estudante ao longo do curso.
- **Biblioteca curada**, para pesquisa qualificada em vez de busca solta.
- **Integrações com o cotidiano escolar** (Google Classroom, Google Agenda, Canva), reduzindo fricção operacional.
- **Identidade visual de laboratório de IA** — Premium Dark, direto, sem estética corporativa de "sistema de gestão" (ver [03_BRAND_GUIDELINES.md](03_BRAND_GUIDELINES.md)).

## Produtos atuais

1. **Site Institucional (Landing)** — apresenta o IAH a diretores, coordenadores e mantenedores; converte visitantes em pedidos de demonstração. Rota `/` da aplicação Next.js.
2. **Plataforma IAH** — o sistema de ensino em si, usado por professores e alunos durante as aulas. Em construção incremental por Sprint (ver [05_ROADMAP.md](05_ROADMAP.md)); hoje contém o App Shell e o Dashboard (rota `/dashboard`).
3. **WordPress institucional** (`iaheducacional.com.br`) — solução **temporária** que mantém o domínio no ar enquanto a Landing Next.js amadurece para substituí-lo (ver decisão em [07_DECISIONS.md](07_DECISIONS.md)).

## Visão de longo prazo

O Ensino Médio é o **primeiro produto de um ecossistema**, não o destino final do IAH. A arquitetura de domínio já reflete essa ambição: `Escola` como tenant, `Curso` como template versionável e desacoplado de uma única disciplina, e uma Plataforma desenhada para hospedar múltiplas ofertas pedagógicas (ver [06_DOMAIN_MODEL.md](06_DOMAIN_MODEL.md), princípios de modelagem).

Direções futuras plausíveis — **visão, não compromisso de roadmap** — incluem: expansão para outras etapas de ensino ou disciplinas correlatas, um catálogo de missões que cresce para além da disciplina original, e a maturação da Plataforma como sistema de ensino de referência para a nova alfabetização do século XXI: pensar criticamente sobre e com Inteligência Artificial. Qualquer expansão concreta desse tipo exige decisão de produto explícita antes de virar trabalho de engenharia, conforme as regras do projeto ([CLAUDE.md](../CLAUDE.md)).
