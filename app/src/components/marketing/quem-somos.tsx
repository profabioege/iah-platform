"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Seção "Nossa origem" da Landing (id="quem-somos", mantido por
 * estabilidade de âncora) — prova de autoridade do fundador.
 *
 * A narrativa em três blocos, a fundamentação institucional, as métricas
 * de sala de aula e o card do fundador sustentam a decisão de compra
 * institucional (diretor, coordenador, mantenedor). Estilos em
 * `src/app/globals.css` (`.about-*`).
 *
 * É um Client Component apenas por causa do IntersectionObserver que
 * dispara a animação de entrada.
 */

/**
 * TODO: ligar quando houver logos reais de instituições autorizadas a
 * aparecer. Enquanto for `false`, a faixa de prova social não é
 * renderizada — nunca publicar a faixa com logos fictícios.
 */
const showSocialProof = false;

/**
 * TODO: preencher com as instituições que já aplicam o método e que
 * autorizaram o uso da marca. Cada logo em `app/public/marketing/`,
 * preferencialmente SVG monocromático.
 * Ex.: { name: "Colégio Exemplo", logo: "/marketing/logo-exemplo.svg" }
 */
const institutions: { name: string; logo: string }[] = [];

/** TODO: preencher os três números com os dados reais do fundador. */
const metrics = [
  { value: "—", label: "anos em sala de aula" },
  { value: "—", label: "estudantes" },
  { value: "—", label: "disciplinas criadas" },
];

const credentials = ["História", "Filosofia", "Sociologia", "IA & Humanidades"];

const narrativeBlocks = [
  {
    title: "Como nasceu",
    text: "O Sistema IAH nasceu de uma experiência concreta de ensino. A partir da convivência diária com estudantes da Educação Básica, foram identificadas dúvidas, necessidades e possibilidades reais para o ensino de Inteligência Artificial.",
  },
  {
    title: "O que aprendemos",
    text: "Ensinar IA exige mais do que apresentar ferramentas. Exige investigação, pensamento crítico, autoria, ética e mediação docente para que os estudantes compreendam a tecnologia e saibam utilizá-la com responsabilidade.",
  },
  {
    title: "O que construímos",
    text: "Essa experiência foi organizada em um Sistema de Ensino capaz de apoiar escolas na implantação institucional da Inteligência Artificial, com metodologia estruturada, missões investigativas, materiais didáticos, laboratórios, avaliações e acompanhamento pedagógico contínuo.",
  },
];

const foundations = [
  "BNCC Computação",
  "Referencial do MEC para Uso Responsável de IA na Educação",
  "LGPD",
  "Aprendizagem Investigativa",
];

export function QuemSomos() {
  const sectionRef = React.useRef<HTMLElement>(null);
  // "estatico" = sem animação (SSR, JS desligado ou prefers-reduced-motion);
  // "armado" = escondido aguardando entrada; "visivel" = animação disparada.
  const [fase, setFase] = React.useState<"estatico" | "armado" | "visivel">(
    "estatico",
  );

  React.useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    // Acessibilidade: quem pediu menos movimento vê a seção já pronta.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setFase("armado");

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setFase("visivel");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const faseClass =
    fase === "armado"
      ? " is-armed"
      : fase === "visivel"
        ? " is-armed is-visible"
        : "";

  return (
    <section
      ref={sectionRef}
      className={`section about-section${faseClass}`}
      id="quem-somos"
      aria-labelledby="quem-somos-titulo"
    >
      <div className="container">
        <div className="about-header about-reveal about-reveal-1">
          <p className="about-eyebrow">Nossa origem</p>
          <h2 id="quem-somos-titulo">
            O <span className="about-highlight">Sistema IAH</span> nasceu onde
            toda inovação educacional deveria nascer:
            <br />
            na sala de aula.
          </h2>
        </div>

        <div className="about-layout">
          <div className="about-divider" aria-hidden="true" />

          <div className="about-copy">
            <div className="about-blocks about-reveal about-reveal-2">
              {narrativeBlocks.map((block) => (
                <div className="about-block" key={block.title}>
                  <h3 className="about-block-title">{block.title}</h3>
                  <p>{block.text}</p>
                </div>
              ))}
            </div>

            <div className="about-foundation about-reveal about-reveal-3">
              <p className="about-foundation-label">Fundamentado em</p>
              <ul className="about-foundation-list">
                {foundations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="about-foundation-note">
                Base pedagógica, ética e legal para a implantação da
                Inteligência Artificial na Educação Básica.
              </p>
            </div>

            <dl className="about-metrics about-reveal about-reveal-3">
              {metrics.map((metric) => (
                <div className="about-metric" key={metric.label}>
                  <dt className="about-metric-value">{metric.value}</dt>
                  <dd className="about-metric-label">{metric.label}</dd>
                </div>
              ))}
            </dl>

            {/* TODO: confirmar o destino do link (hoje aponta para a
                seção Metodologia da própria Landing). */}
            <Link className="about-link about-reveal about-reveal-3" href="/#metodo">
              <span>Conheça o Sistema IAH</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <article className="about-card about-reveal about-reveal-4">
            <p className="about-name">Fabio Ege</p>
            <p className="about-role">
              Professor de IA &amp; Humanidades | Fundador do IAH Educacional
            </p>

            <blockquote className="about-quote">
              <p>
                Ao longo dos meus 16 anos de experiência em sala de aula,
                dedico-me a unir a profundidade das Ciências Humanas —
                História, Filosofia e Sociologia — à fronteira das novas
                tecnologias. Atualmente, também atuo como professor de
                Inteligência Artificial &amp; Humanidades para alunos do
                Ensino Médio em instituição privada.
              </p>
            </blockquote>

            <figure className="about-figure">
              <Image
                className="about-photo"
                src="/marketing/fabio-ege.jpg"
                alt="Fabio Ege, professor e fundador do IAH Educacional"
                width={640}
                height={800}
                loading="lazy"
              />
            </figure>

            <ul className="about-chips">
              {credentials.map((credential) => (
                <li key={credential}>{credential}</li>
              ))}
            </ul>
          </article>
        </div>

        {showSocialProof && institutions.length > 0 ? (
          <div className="about-social about-reveal about-reveal-4">
            <p className="about-social-label">
              Instituições que já aplicam o método
            </p>
            <ul className="about-social-grid">
              {institutions.map((institution) => (
                <li key={institution.name}>
                  <Image
                    src={institution.logo}
                    alt={institution.name}
                    width={160}
                    height={48}
                    loading="lazy"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
