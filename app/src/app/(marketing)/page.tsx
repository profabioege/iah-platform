import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Compass,
  FileCheck2,
  FileSearch,
  GraduationCap,
  Layers3,
  LibraryBig,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Zap,
} from "lucide-react";

import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

const platformEssentials = [
  {
    icon: Layers3,
    title: "Metodologia pronta",
    description:
      "Estrutura pedagógica testada, sem depender de material improvisado ou de curso genérico traduzido.",
  },
  {
    icon: BookOpen,
    title: "Material autoral",
    description:
      "Currículo próprio, redigido para a sala de aula real — o professor conduz com segurança desde a primeira aula.",
  },
  {
    icon: FileSearch,
    title: "Missões investigativas",
    description:
      "Cada aula é uma investigação guiada, com pergunta, evidência e produção — não uma lista de exercícios sobre IA.",
  },
  {
    icon: Bot,
    title: "IA integrada",
    description:
      "A Inteligência Artificial entra como objeto de estudo e apoio crítico — nunca como resposta pronta para o aluno copiar.",
  },
  {
    icon: BrainCircuit,
    title: "Formação do pensamento crítico",
    description:
      "O aluno aprende a questionar, verificar e argumentar — a competência que sustenta todas as outras.",
  },
  {
    icon: Zap,
    title: "Implantação rápida",
    description:
      "Sua escola começa a usar em dias, não em meses de configuração, treinamento longo ou desenvolvimento interno.",
  },
];

const implementationSteps = [
  {
    number: "01",
    icon: Compass,
    title: "Conhecer",
    description: "Demonstração da plataforma com a equipe pedagógica e a mantenedoria.",
  },
  {
    number: "02",
    icon: GraduationCap,
    title: "Capacitar professores",
    description: "Implantação direta na metodologia — sem curso longo, sem burocracia.",
  },
  {
    number: "03",
    icon: FileSearch,
    title: "Aplicar Missões",
    description: "As primeiras aulas já rodam com conteúdo pronto, guiadas pelo professor.",
  },
  {
    number: "04",
    icon: ClipboardCheck,
    title: "Acompanhar resultados",
    description: "Progresso da turma visível para professor e coordenação, aula a aula.",
  },
];

const flow = [
  { number: "01", label: "Professor", action: "planeja" },
  { number: "02", label: "Aluno", action: "investiga" },
  { number: "03", label: "IA", action: "auxilia" },
  { number: "04", label: "Aluno", action: "produz" },
  { number: "05", label: "Professor", action: "acompanha" },
];

const resources = [
  {
    icon: Target,
    title: "Missões",
    description: "Perguntas norteadoras que transformam o conteúdo em investigação.",
  },
  {
    icon: LibraryBig,
    title: "Biblioteca",
    description: "Repertório curado para alimentar pesquisas e discussões relevantes.",
  },
  {
    icon: FileCheck2,
    title: "Diário do Auditor",
    description: "Reflexão registrada ao longo do percurso de cada estudante.",
  },
  {
    icon: Sparkles,
    title: "Mentor IAH",
    description: "Apoio para formular perguntas melhores e avançar com autonomia.",
  },
  {
    icon: Lightbulb,
    title: "Projetos",
    description: "Produções autorais que conectam a escola aos temas do mundo real.",
  },
  {
    icon: CalendarDays,
    title: "Agenda",
    description: "Ritmo, prazos e etapas visíveis para toda a comunidade escolar.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Painel de controle",
    description: "Acompanhamento pedagógico para apoiar decisões com mais contexto.",
  },
  {
    icon: ShieldCheck,
    title: "Acessibilidade",
    description: "Uma experiência inclusiva, com leitura e navegação consideradas desde a base.",
  },
];

const audiences = [
  {
    icon: GraduationCap,
    title: "Escolas particulares",
    description: "Que precisam mostrar diferencial competitivo real às famílias, não apenas discurso.",
  },
  {
    icon: Layers3,
    title: "Redes de ensino",
    description: "Que precisam escalar um método com unidade pedagógica entre unidades.",
  },
  {
    icon: UsersRound,
    title: "Coordenação pedagógica",
    description: "Que precisa de visibilidade real do progresso da turma, sem perder profundidade.",
  },
  {
    icon: BookOpen,
    title: "Professores",
    description: "Do Ensino Fundamental e Médio que querem conduzir a disciplina com segurança, não improvisar.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <p className="section-description">{description}</p> : null}
    </div>
  );
}

export default function Home() {
  return (
    <div className="site">
      <div className="hero-glow hero-glow-left" aria-hidden="true" />
      <div className="hero-glow hero-glow-right" aria-hidden="true" />

      <SiteNav />

      <main>
        <section className="hero container" id="inicio">
          <div className="hero-copy">
            <p className="hero-label">
              <span aria-hidden="true" /> Sistema de ensino · Ensino Fundamental e Médio
            </p>
            <h1>
              Ensinar Inteligência Artificial exige mais do que tecnologia.
              <em> Exige método.</em>
            </h1>
            <p className="hero-description">
              Com o IAH, sua escola oferece a disciplina de Inteligência
              Artificial sem precisar criar nada do zero: as aulas chegam
              prontas, o material é autoral e o professor conduz cada turma
              com segurança — enquanto os alunos aprendem a pensar
              criticamente num mundo transformado pela IA.
            </p>
            <ul className="hero-clarify" aria-label="O que o IAH não é, e o que é">
              <li className="hero-clarify-no">
                <span aria-hidden="true">×</span> Não é um AVA
              </li>
              <li className="hero-clarify-no">
                <span aria-hidden="true">×</span> Não é um chatbot
              </li>
              <li className="hero-clarify-yes">
                <CircleCheck aria-hidden="true" /> É um sistema completo de ensino
              </li>
            </ul>
            <div className="hero-actions">
              <a className="button button-primary" href="#plataforma">
                Conheça a Plataforma
                <ArrowRight aria-hidden="true" />
              </a>
              <Link className="button button-secondary" href="/demonstracao">
                Solicitar Demonstração
              </Link>
            </div>
            <p className="hero-note">Para escolas que pensam o futuro com profundidade.</p>
          </div>

          <div className="method-visual" aria-label="O método IAH em cinco etapas">
            <div className="visual-grid" aria-hidden="true" />
            <div className="visual-topline">
              <span>O método IAH</span>
              <span className="visual-status"><i /> Em movimento</span>
            </div>
            <div className="method-orbit" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <span className="orbit-node orbit-node-a" />
              <span className="orbit-node orbit-node-b" />
              <span className="orbit-node orbit-node-c" />
            </div>
            <div className="method-core">
              <span>IAH</span>
              <small>pensar · investigar · criar</small>
            </div>
            <div className="method-points">
              <div><b>01</b><span>Perguntar</span></div>
              <div><b>02</b><span>Investigar</span></div>
              <div><b>03</b><span>Produzir</span></div>
            </div>
            <div className="visual-caption">
              <span>Metodologia, tecnologia e autoria</span>
              <ChevronRight aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="hero-cta-strip" aria-label="Solicitar demonstração">
          <div className="container hero-cta-strip-inner">
            <p>Já deu para entender? Fale com a gente antes de continuar lendo.</p>
            <Link className="button button-primary" href="/demonstracao">
              Solicitar demonstração
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="trust-bar" aria-label="Princípios da IAH Educacional">
          <div className="container trust-items">
            <span>TECNOLOGIA COM PROPÓSITO</span>
            <i />
            <span>PENSAMENTO CRÍTICO</span>
            <i />
            <span>AUTORIA EM PRIMEIRO LUGAR</span>
            <i />
            <span>ÉTICA POR PRINCÍPIO</span>
          </div>
        </section>

        <section className="section section-light" id="plataforma">
          <div className="container">
            <SectionHeading
              eyebrow="A PLATAFORMA"
              title="Tudo o que a escola precisa para ensinar IA."
              description="Metodologia, conteúdo e acompanhamento em um só lugar — sua equipe não monta isso do zero."
            />
            <div className="differentiator-grid">
              {platformEssentials.map(({ icon: Icon, title, description }) => (
                <article className="differentiator-card" key={title}>
                  <span className="card-icon"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-flow" id="metodo">
          <div className="flow-background" aria-hidden="true" />
          <div className="container">
            <SectionHeading
              eyebrow="COMO FUNCIONA"
              title="Como o IAH funciona na prática."
              description="Professor planeja, aluno investiga, IA auxilia, aluno produz, professor acompanha — em cada aula, nesta ordem."
            />
            <div className="flow-list" aria-label="Fluxo de aprendizagem IAH">
              {flow.map((step, index) => (
                <div className="flow-item" key={step.number}>
                  <div className="flow-number">{step.number}</div>
                  <p>{step.label}</p>
                  <h3>{step.action}</h3>
                  {index < flow.length - 1 ? (
                    <ArrowDown className="flow-arrow" aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-light" id="implantacao">
          <div className="container">
            <SectionHeading
              eyebrow="IMPLANTAÇÃO"
              title="Implantação em 4 passos."
              description="Do primeiro contato à primeira turma usando o IAH em sala, sem projeto longo de implantação."
            />
            <div className="flow-list flow-list-4" aria-label="Passos de implantação do IAH">
              {implementationSteps.map((step, index) => (
                <div className="flow-item flow-item-light" key={step.number}>
                  <div className="flow-number">{step.number}</div>
                  <p>
                    <step.icon aria-hidden="true" className="flow-item-icon" />
                  </p>
                  <h3>{step.title}</h3>
                  <span className="flow-item-description">{step.description}</span>
                  {index < implementationSteps.length - 1 ? (
                    <ArrowDown className="flow-arrow flow-arrow-light" aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-contrast">
          <div className="container contrast-layout">
            <div className="contrast-intro">
              <SectionHeading
                eyebrow="O QUE TORNA O IAH DIFERENTE"
                title="Tecnologia que não dilui a experiência humana."
                description="A escola continua sendo o lugar do diálogo, da orientação e das boas perguntas."
              />
            </div>
            <div className="contrast-cards">
              <article className="contrast-card contrast-card-muted">
                <p className="contrast-label">O IAH não é</p>
                <ul>
                  <li><span>×</span> Um curso gravado</li>
                  <li><span>×</span> Apenas uma plataforma</li>
                  <li><span>×</span> Um substituto para o professor</li>
                </ul>
              </article>
              <article className="contrast-card contrast-card-highlight">
                <p className="contrast-label">O IAH é</p>
                <ul>
                  <li><CircleCheck aria-hidden="true" /> Professor no centro da experiência</li>
                  <li><CircleCheck aria-hidden="true" /> Pensamento crítico em prática</li>
                  <li><CircleCheck aria-hidden="true" /> IA ética e responsável</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="section founder-section">
          <div className="container">
            <blockquote className="founder-quote">
              <span className="founder-quote-mark" aria-hidden="true">&ldquo;</span>
              <p>
                O fundador do IAH já ministra a disciplina de Inteligência
                Artificial em uma escola. Toda a metodologia apresentada nesta
                plataforma já nasceu da prática em sala de aula.
              </p>
            </blockquote>
          </div>
        </section>

        <section className="section section-resources" id="recursos">
          <div className="container">
            <SectionHeading
              eyebrow="RECURSOS DA PLATAFORMA"
              title="Tudo o que uma boa pergunta precisa para ir mais longe."
              description="Uma infraestrutura pedagógica que dá visibilidade ao processo e valor à produção de cada estudante."
            />
            <div className="resource-grid">
              {resources.map(({ icon: Icon, title, description }, index) => (
                <article className="resource-card" key={title}>
                  <span className="resource-index">0{index + 1}</span>
                  <span className="resource-icon"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className="resource-line" aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-audience">
          <div className="container audience-layout">
            <SectionHeading
              eyebrow="PARA QUEM FOI DESENVOLVIDO"
              title="Feito para quem lidera a educação que vem depois."
              description="O IAH apoia pessoas e instituições que entendem a Inteligência Artificial como parte essencial de uma formação contemporânea."
            />
            <div className="audience-grid">
              {audiences.map(({ icon: Icon, title, description }) => (
                <article className="audience-card" key={title}>
                  <Icon aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section final-section" id="demonstracao">
          <div className="container final-panel">
            <div className="final-orbit" aria-hidden="true">
              <span /><span /><span />
            </div>
            <p className="eyebrow">IAH EDUCACIONAL</p>
            <h2>Sua escola pode ser a primeira da região com isso pronto.</h2>
            <p>
              Agende uma demonstração de 20 minutos e veja o aluno concluindo
              uma aula real, do início à produção — não um slide, o produto
              funcionando.
            </p>
            <Link className="button button-primary" href="/demonstracao">
              Solicitar demonstração
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
