<?php
/** Página inicial institucional do tema IAH Educacional. */

get_header();

$differentiators = array(
    array('Plataforma própria', 'Um ambiente pensado para sustentar uma experiência de aprendizagem contínua.'),
    array('Material didático autoral', 'Conteúdo que articula repertório, contexto e perguntas que merecem investigação.'),
    array('Missões investigativas', 'Percursos que levam o estudante a questionar, verificar e construir argumentos.'),
    array('Integração com IA', 'A Inteligência Artificial entra como objeto de estudo e parceira de reflexão.'),
    array('Diário do Auditor', 'Um espaço para registrar descobertas, dúvidas e mudanças de perspectiva.'),
    array('Biblioteca Digital', 'Fontes e materiais organizados para qualificar a pesquisa e a autoria.'),
    array('Google Classroom', 'Conexão com a rotina escolar que sua equipe já conhece.'),
    array('Canva & Google Agenda', 'Planejamento e produção conectados aos instrumentos do dia a dia.'),
);

$flow = array(
    array('01', 'Professor', 'planeja'), array('02', 'Aluno', 'investiga'),
    array('03', 'IA', 'auxilia'), array('04', 'Aluno', 'produz'), array('05', 'Professor', 'acompanha'),
);

$resources = array(
    array('Missões', 'Perguntas norteadoras que transformam o conteúdo em investigação.'),
    array('Biblioteca', 'Repertório curado para alimentar pesquisas e discussões relevantes.'),
    array('Diário do Auditor', 'Reflexão registrada ao longo do percurso de cada estudante.'),
    array('Mentor IA', 'Apoio para formular perguntas melhores e avançar com autonomia.'),
    array('Projetos', 'Produções autorais que conectam a escola aos temas do mundo real.'),
    array('Agenda', 'Ritmo, prazos e etapas visíveis para toda a comunidade escolar.'),
    array('Dashboard', 'Acompanhamento pedagógico para apoiar decisões com mais contexto.'),
    array('Acessibilidade', 'Uma experiência inclusiva, com leitura e navegação consideradas desde a base.'),
);

$audiences = array(
    array('Escolas particulares', 'Que querem oferecer uma formação contemporânea e consistente.'),
    array('Redes de ensino', 'Que precisam escalar um método com unidade pedagógica.'),
    array('Coordenação pedagógica', 'Que busca acompanhar a aprendizagem sem perder profundidade.'),
    array('Professores', 'Do Ensino Fundamental e Médio que acreditam na autoria do estudante.'),
);
?>
<div class="site">
    <div class="hero-glow hero-glow-left" aria-hidden="true"></div>
    <div class="hero-glow hero-glow-right" aria-hidden="true"></div>
    <header class="site-header">
        <nav class="container nav" aria-label="Navegação principal">
            <a class="brand" href="#inicio" aria-label="IAH Educacional, início"><span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span><span>IAH</span><small>Educacional</small></a>
            <div class="nav-links"><a href="#plataforma">Plataforma</a><a href="#metodo">Metodologia</a><a href="#recursos">Recursos</a></div>
            <a class="nav-cta" href="#demonstracao">Solicitar demonstração <span class="arrow" aria-hidden="true">→</span></a>
        </nav>
    </header>
    <main>
        <section class="hero container" id="inicio">
            <div class="hero-copy">
                <p class="hero-label"><i aria-hidden="true"></i> Inteligência Artificial &amp; Humanidades</p>
                <h1>Ensinar Inteligência Artificial exige mais do que tecnologia.<em> Exige método.</em></h1>
                <p class="hero-description">O IAH é uma plataforma SaaS de sistema de ensino que integra metodologia, conteúdo autoral e Inteligência Artificial para transformar o ensino e a aprendizagem.</p>
                <div class="hero-actions"><a class="button button-primary" href="#plataforma">Conheça a Plataforma <span class="arrow" aria-hidden="true">→</span></a><a class="button button-secondary" href="#demonstracao">Solicitar Demonstração</a></div>
                <p class="hero-note">Para escolas que pensam o futuro com profundidade.</p>
            </div>
            <div class="method-visual" aria-label="O método IAH em cinco etapas">
                <div class="visual-grid" aria-hidden="true"></div><div class="visual-topline"><span>O método IAH</span><span class="visual-status"><i></i> Em movimento</span></div>
                <div class="method-orbit" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="orbit-node orbit-node-a"></span><span class="orbit-node orbit-node-b"></span><span class="orbit-node orbit-node-c"></span></div>
                <div class="method-core"><span>IAH</span><small>pensar · investigar · criar</small></div>
                <div class="method-points"><div><b>01</b><span>Perguntar</span></div><div><b>02</b><span>Investigar</span></div><div><b>03</b><span>Produzir</span></div></div>
                <div class="visual-caption"><span>Metodologia, tecnologia e autoria</span><span class="arrow">→</span></div>
            </div>
        </section>
        <section class="trust-bar" aria-label="Princípios da IAH Educacional"><div class="container trust-items"><span>TECNOLOGIA COM PROPÓSITO</span><i></i><span>PENSAMENTO CRÍTICO</span><i></i><span>AUTORIA EM PRIMEIRO LUGAR</span><i></i><span>ÉTICA POR PRINCÍPIO</span></div></section>
        <section class="section section-light" id="plataforma"><div class="container">
            <div class="section-heading"><p class="eyebrow">POR QUE O IAH</p><h2>O método encontra a infraestrutura.</h2><p class="section-description">Uma plataforma criada para tornar a educação em Inteligência Artificial uma experiência estruturada, viva e relevante.</p></div>
            <div class="differentiator-grid"><?php foreach ($differentiators as $item) : ?><article class="differentiator-card"><span class="card-icon" aria-hidden="true"></span><h3><?php echo esc_html($item[0]); ?></h3><p><?php echo esc_html($item[1]); ?></p></article><?php endforeach; ?></div>
        </div></section>
        <section class="section section-flow" id="metodo"><div class="flow-background" aria-hidden="true"></div><div class="container"><div class="section-heading"><p class="eyebrow">COMO FUNCIONA</p><h2>Uma aula que se transforma em investigação.</h2><p class="section-description">O IAH organiza a experiência, mas é o encontro entre professor e estudante que a torna significativa.</p></div><div class="flow-list" aria-label="Fluxo de aprendizagem IAH"><?php foreach ($flow as $index => $step) : ?><div class="flow-item"><div class="flow-number"><?php echo esc_html($step[0]); ?></div><p><?php echo esc_html($step[1]); ?></p><h3><?php echo esc_html($step[2]); ?></h3><?php if ($index < count($flow) - 1) : ?><span class="flow-arrow" aria-hidden="true">↓</span><?php endif; ?></div><?php endforeach; ?></div></div></section>
        <section class="section section-contrast"><div class="container contrast-layout"><div class="contrast-intro"><div class="section-heading"><p class="eyebrow">O QUE TORNA O IAH DIFERENTE</p><h2>Tecnologia que não dilui a experiência humana.</h2><p class="section-description">A escola continua sendo o lugar do diálogo, da orientação e das boas perguntas.</p></div></div><div class="contrast-cards"><article class="contrast-card contrast-card-muted"><p class="contrast-label">O IAH não é</p><ul><li><b>×</b> Um curso gravado</li><li><b>×</b> Apenas uma plataforma</li><li><b>×</b> Um substituto para o professor</li></ul></article><article class="contrast-card contrast-card-highlight"><p class="contrast-label">O IAH é</p><ul><li><b>✓</b> Professor no centro da experiência</li><li><b>✓</b> Pensamento crítico em prática</li><li><b>✓</b> IA ética e responsável</li></ul></article></div></div></section>
        <section class="section section-resources" id="recursos"><div class="container"><div class="section-heading"><p class="eyebrow">RECURSOS DA PLATAFORMA</p><h2>Tudo o que uma boa pergunta precisa para ir mais longe.</h2><p class="section-description">Uma infraestrutura pedagógica que dá visibilidade ao processo e valor à produção de cada estudante.</p></div><div class="resource-grid"><?php foreach ($resources as $index => $item) : ?><article class="resource-card"><span class="resource-index">0<?php echo esc_html((string) ($index + 1)); ?></span><span class="resource-icon" aria-hidden="true"></span><h3><?php echo esc_html($item[0]); ?></h3><p><?php echo esc_html($item[1]); ?></p><span class="resource-line" aria-hidden="true"></span></article><?php endforeach; ?></div></div></section>
        <section class="section section-audience"><div class="container audience-layout"><div class="section-heading"><p class="eyebrow">PARA QUEM FOI DESENVOLVIDO</p><h2>Feito para quem lidera a educação que vem depois.</h2><p class="section-description">O IAH apoia pessoas e instituições que entendem a Inteligência Artificial como parte essencial de uma formação contemporânea.</p></div><div class="audience-grid"><?php foreach ($audiences as $item) : ?><article class="audience-card"><span class="audience-icon" aria-hidden="true"></span><h3><?php echo esc_html($item[0]); ?></h3><p><?php echo esc_html($item[1]); ?></p></article><?php endforeach; ?></div></div></section>
        <section class="section final-section" id="demonstracao"><div class="container final-panel"><div class="final-orbit" aria-hidden="true"><span></span><span></span><span></span></div><p class="eyebrow">IAH EDUCACIONAL</p><h2>Prepare sua escola para a era da Inteligência Artificial.</h2><p>Conheça uma nova forma de ensinar, investigar e produzir conhecimento.</p><span class="button button-primary button-static">Agendar uma demonstração <span class="arrow" aria-hidden="true">→</span></span></div></section>
    </main>
    <footer class="site-footer"><div class="container footer-content"><a class="brand" href="#inicio"><span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span><span>IAH</span><small>Educacional</small></a><p>Inteligência Artificial &amp; Humanidades.</p><p>© <?php echo esc_html(wp_date('Y')); ?> IAH Educacional</p></div></footer>
</div>
<?php get_footer(); ?>
