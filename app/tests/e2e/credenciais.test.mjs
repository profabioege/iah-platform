/**
 * Credenciais pela rede: recuperação assistida, invalidação de sessão,
 * limitador de login e identificação do ambiente.
 *
 * A recuperação é feita pela CLI administrativa — a mesma que a
 * coordenação usaria — e o efeito é conferido por HTTP.
 */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";

import { SessaoHttp } from "./support/http-client.mjs";
import { BASE_URL, OUTRA_TURMA, TURMA, ambiente, conta } from "./support/ambiente.mjs";
import { autenticar, senhaDefinitiva } from "./support/sessoes.mjs";

const executar = promisify(execFile);

/** Roda a CLI de recuperação e devolve a senha temporária que ela gerou. */
async function recuperarAcesso(email) {
  const { stdout } = await executar(
    process.execPath,
    [
      "--experimental-strip-types",
      "scripts/pilot-credential-reset.mjs",
      `--email=${email}`,
      "--execute",
      "--actor=cli:homologacao",
      "--reason=teste de recuperação assistida",
    ],
    {
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: ambiente.supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: ambiente.serviceRoleKey,
      },
    },
  );
  const encontrado = stdout.match(/Senha temporária:\s*(\S+)/);
  assert.ok(encontrado, "a CLI precisa devolver a senha temporária");
  return encontrado[1];
}

test("recuperação assistida devolve o acesso e invalida a sessão anterior", async () => {
  const registro = conta(TURMA, "aluno", 20);
  const definitiva = senhaDefinitiva(registro);

  const emUso = await autenticar(registro);
  assert.equal((await emUso.navegar("/dashboard")).caminhoFinal, "/dashboard");

  const temporaria = await recuperarAcesso(registro.email);

  // A sessão que estava aberta deixa de abrir a área privada.
  const depois = await emUso.navegar("/dashboard");
  assert.notEqual(
    depois.caminhoFinal,
    "/dashboard",
    "a sessão anterior à recuperação precisa deixar de valer",
  );

  // A senha antiga não entra mais; a temporária entra e exige troca.
  const antiga = new SessaoHttp(BASE_URL, registro.email);
  assert.equal((await antiga.entrar(registro.email, definitiva)).ok, false);

  const nova = new SessaoHttp(BASE_URL, registro.email);
  assert.equal((await nova.entrar(registro.email, temporaria)).ok, true);
  const gate = await nova.navegar("/dashboard");
  assert.equal(
    gate.caminhoFinal,
    "/entrar/nova-senha",
    "credencial temporária precisa cair na troca obrigatória",
  );
});

test("senha errada não revela se a conta existe", async () => {
  const registro = conta(TURMA, "aluno", 21);
  const existente = new SessaoHttp(BASE_URL);
  const inexistente = new SessaoHttp(BASE_URL);

  const a = await existente.entrar(registro.email, "senha-que-nao-e-a-dele");
  const b = await inexistente.entrar("ninguem.aqui@beryon.test", "outra-senha-qualquer");

  assert.equal(a.ok, false);
  assert.equal(b.ok, false);
  assert.equal(a.erro, b.erro, "as duas recusas precisam ser indistinguíveis");
});

test("insistência na mesma conta é barrada sem derrubar a turma que compartilha o IP", async () => {
  const alvo = conta(TURMA, "aluno", 22);
  const vizinho = conta(TURMA, "aluno", 23);

  // Todas as tentativas saem do mesmo IP (127.0.0.1), como a turma na
  // rede da escola.
  for (let i = 0; i < 9; i += 1) {
    const tentativa = new SessaoHttp(BASE_URL);
    await tentativa.entrar(alvo.email, `errada-${i}`);
  }

  const alvoComSenhaCerta = new SessaoHttp(BASE_URL);
  const bloqueado = await alvoComSenhaCerta.entrar(alvo.email, alvo.senha);
  assert.equal(bloqueado.ok, false, "a conta atacada precisa estar bloqueada por um tempo");

  const colega = new SessaoHttp(BASE_URL);
  const entrada = await colega.entrar(vizinho.email, vizinho.senha);
  assert.equal(
    entrada.ok,
    true,
    "o colega no mesmo IP precisa continuar entrando normalmente",
  );
});

test("/api/versao identifica o ambiente para o gestor e some para os demais", async () => {
  const autenticado = await autenticar(conta(TURMA, "gestor", 0));

  const resposta = await autenticado.get("/api/versao");
  assert.equal(resposta.status, 200);
  const corpo = await resposta.json();
  assert.equal(corpo.modo, "supabase", "o ambiente precisa se declarar persistente");
  assert.equal(corpo.ambiente, "homologacao-local");
  assert.ok(corpo.commit, "o commit servido precisa aparecer");

  const anonimo = new SessaoHttp(BASE_URL);
  const semSessao = await anonimo.get("/api/versao");
  assert.ok(
    [401, 403, 404].includes(semSessao.status),
    `sem sessão, /api/versao não pode responder ${semSessao.status}`,
  );

  const aluno = new SessaoHttp(BASE_URL);
  const registroAluno = conta(OUTRA_TURMA, "aluno", 1);
  await aluno.entrar(registroAluno.email, registroAluno.senha);
  const comoAluno = await aluno.get("/api/versao");
  assert.equal(comoAluno.status, 404, "para quem não é gestor, a rota não existe");
});

test("sondagem e DocentIAH continuam fora do modo real", async () => {
  const autenticado = await autenticar(conta(TURMA, "professor", 0));
  const { resposta } = await autenticado.navegar("/professor/docente-iah");
  const html = await resposta.text();
  assert.ok(
    html.includes("não está disponível"),
    "no modo real o DocentIAH precisa se declarar indisponível",
  );
});

test("'Esqueci minha senha' leva à orientação de recuperação assistida, sem autoatendimento", async () => {
  const anonimo = new SessaoHttp(BASE_URL);

  const entrar = await anonimo.get("/entrar");
  assert.equal(entrar.status, 200);
  const login = await entrar.text();
  assert.match(login, /<a[^>]+href="\/entrar\/esqueci-senha"[^>]*>Esqueci minha senha<\/a>/);
  // O link fica fora do <label>: o rótulo continua apontando para o campo.
  assert.match(login, /<label[^>]+for="entrar-senha"[^>]*>Senha<\/label>/);
  assert.match(login, /<input[^>]+id="entrar-senha"[^>]+type="password"|<input[^>]+type="password"[^>]+id="entrar-senha"/);

  const pagina = await anonimo.get("/entrar/esqueci-senha");
  assert.equal(pagina.status, 200, "a orientação é pública, como o login");
  const html = await pagina.text();
  const texto = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(texto, /Alunos: procurem o professor da turma/);
  assert.match(texto, /Professores e gestores: acionem o responsável pela operação do piloto/);
  assert.match(texto, /Não há envio de e-mail de recuperação/);
  assert.match(texto, /Ninguém da escola ou da plataforma pede a sua senha/);
  // Nada a preencher e nenhuma promessa de envio.
  assert.doesNotMatch(html, /<form|<input/);
  assert.doesNotMatch(texto, /enviamos|enviaremos|link de redefinição|verifique (seu|sua caixa)/i);
  assert.match(html, /<a[^>]+href="\/entrar"[^>]*>[\s\S]*?Voltar para o login<\/a>/);
  // O layout acrescenta "IAH Educacional" uma única vez.
  assert.match(html, /<title>Esqueci minha senha \| IAH Educacional<\/title>/);
});

/** Título do documento — sem os <title> de SVG (o do logotipo é o rótulo acessível dele). */
function titulosDoDocumento(html) {
  return html.replace(/<svg[\s\S]*?<\/svg>/g, "").match(/<title>[^<]*<\/title>/g);
}

test("títulos das páginas de senha com 'IAH Educacional' uma única vez", async () => {
  const anonimo = new SessaoHttp(BASE_URL);
  const esqueci = await (await anonimo.get("/entrar/esqueci-senha")).text();
  assert.deepEqual(titulosDoDocumento(esqueci), ["<title>Esqueci minha senha | IAH Educacional</title>"]);

  // A troca de senha só abre com sessão: entra (sem trocar nada nesta leitura) e lê o título.
  const sessao = await autenticar(conta(OUTRA_TURMA, "aluno", 2));
  const { resposta, caminhoFinal } = await sessao.navegar("/entrar/nova-senha");
  assert.equal(caminhoFinal, "/entrar/nova-senha");
  const novaSenha = await resposta.text();
  assert.deepEqual(titulosDoDocumento(novaSenha), ["<title>Trocar senha | IAH Educacional</title>"]);
});
