/**
 * Cliente HTTP dos testes de homologação.
 *
 * Nada daqui importa código da aplicação: estes testes falam com o
 * servidor Next pela rede, como um navegador. Cada `SessaoHttp` tem seu
 * próprio pote de cookies — é o que significa "sessões próprias" no
 * ensaio de carga, e é o que impede que um teste tome emprestada a
 * sessão de outro sem perceber.
 *
 * O login é o login: `GET /api/auth/csrf` e `POST
 * /api/auth/callback/credentials`, a mesma rota que o formulário de
 * `/entrar` aciona. Nenhum cookie é fabricado aqui; o cookie de sessão
 * é o que o Auth.js devolveu.
 */

export class SessaoHttp {
  constructor(baseUrl, rotulo = "anônimo") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.rotulo = rotulo;
    this.cookies = new Map();
  }

  cabecalhoCookie() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  guardarCookies(resposta) {
    const brutos = resposta.headers.getSetCookie?.() ?? [];
    for (const bruto of brutos) {
      const [par] = bruto.split(";");
      const idx = par.indexOf("=");
      if (idx < 1) continue;
      const nome = par.slice(0, idx).trim();
      const valor = par.slice(idx + 1).trim();
      if (valor === "" || /expires=Thu, 01 Jan 1970/i.test(bruto)) this.cookies.delete(nome);
      else this.cookies.set(nome, valor);
    }
  }

  async requisitar(caminho, options = {}) {
    const resposta = await fetch(`${this.baseUrl}${caminho}`, {
      ...options,
      redirect: "manual",
      headers: {
        ...(options.headers ?? {}),
        ...(this.cookies.size ? { cookie: this.cabecalhoCookie() } : {}),
      },
    });
    this.guardarCookies(resposta);
    return resposta;
  }

  async get(caminho) {
    return this.requisitar(caminho, { method: "GET" });
  }

  /** Segue redirecionamentos internos mantendo os cookies (como o navegador). */
  async navegar(caminho, limite = 5) {
    let atual = caminho;
    let resposta = await this.get(atual);
    let saltos = 0;
    while ([301, 302, 303, 307, 308].includes(resposta.status) && saltos < limite) {
      const destino = resposta.headers.get("location");
      if (!destino) break;
      atual = destino.startsWith("http") ? new URL(destino).pathname + new URL(destino).search : destino;
      resposta = await this.get(atual);
      saltos += 1;
    }
    return { resposta, caminhoFinal: atual };
  }

  get temSessao() {
    return [...this.cookies.keys()].some((nome) => nome.includes("session-token"));
  }

  /**
   * Login normal. Devolve `{ ok, status, erro }`; `ok` só é verdadeiro
   * quando o Auth.js emitiu o cookie de sessão.
   */
  async entrar(email, senha) {
    const csrfResposta = await this.get("/api/auth/csrf");
    const { csrfToken } = await csrfResposta.json();

    const corpo = new URLSearchParams({
      csrfToken,
      email,
      password: senha,
      callbackUrl: `${this.baseUrl}/entrar`,
    });
    const resposta = await this.requisitar("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: corpo.toString(),
    });

    const destino = resposta.headers.get("location") ?? "";
    const erro = destino.includes("error=") ? new URL(destino, this.baseUrl).searchParams.get("error") : null;
    return { ok: this.temSessao && !erro, status: resposta.status, destino, erro };
  }

  async sair() {
    const csrfResposta = await this.get("/api/auth/csrf");
    const { csrfToken } = await csrfResposta.json();
    await this.requisitar("/api/auth/signout", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, callbackUrl: `${this.baseUrl}/` }).toString(),
    });
    this.cookies.clear();
  }

  /**
   * Envia um formulário da página como um navegador sem JavaScript: lê
   * o `$ACTION_ID_…` que o Next renderiza no HTML e faz o POST
   * multipart para a mesma URL. É a interação da interface, não uma
   * chamada interna.
   */
  async enviarFormulario(caminho, campos) {
    const pagina = await this.get(caminho);
    const html = await pagina.text();
    const encontrado = html.match(/\$ACTION_ID_([0-9a-f]+)/);
    if (!encontrado) {
      throw new Error(`Nenhum formulário com Server Action em ${caminho}.`);
    }
    const corpo = new FormData();
    corpo.append(`$ACTION_ID_${encontrado[1]}`, "");
    for (const [nome, valor] of Object.entries(campos)) corpo.append(nome, valor);
    const resposta = await this.requisitar(caminho, { method: "POST", body: corpo });
    return { status: resposta.status, destino: resposta.headers.get("location"), resposta };
  }

  /**
   * Como `enviarFormulario`, mas escolhe, entre os formulários da página,
   * o primeiro cujo HTML contém `marcador` (ex.: `value="aprovada"`,
   * `name="versionIds"`). Os campos ocultos desse formulário vão junto,
   * como num navegador; `campos` acrescenta ou substitui. Listas de
   * valores (checkboxes) vão repetidas.
   */
  async enviarFormularioCom(caminho, marcador, campos = {}) {
    const pagina = await this.get(caminho);
    const html = await pagina.text();
    const formulario = html
      .split(/<form\b/)
      .slice(1)
      .map((trecho) => trecho.split("</form>")[0])
      .find((trecho) => trecho.includes(marcador));
    const encontrado = formulario?.match(/\$ACTION_ID_([0-9a-f]+)/);
    if (!encontrado) {
      throw new Error(`Nenhum formulário com Server Action contendo ${marcador} em ${caminho}.`);
    }
    const ocultos = {};
    for (const tag of formulario.match(/<input\b[^>]*>/g) ?? []) {
      if (!/type="hidden"/.test(tag)) continue;
      const nome = tag.match(/\bname="([^"]*)"/)?.[1];
      if (!nome || nome.startsWith("$ACTION")) continue;
      ocultos[nome] = decodificar(tag.match(/\bvalue="([^"]*)"/)?.[1] ?? "");
    }
    const corpo = new FormData();
    corpo.append(`$ACTION_ID_${encontrado[1]}`, "");
    for (const [nome, valor] of Object.entries({ ...ocultos, ...campos })) {
      for (const v of Array.isArray(valor) ? valor : [valor]) corpo.append(nome, v);
    }
    const resposta = await this.requisitar(caminho, { method: "POST", body: corpo });
    return { status: resposta.status, destino: resposta.headers.get("location"), resposta };
  }

  /** GET seguindo redirecionamentos e devolvendo o HTML final. */
  async html(caminho) {
    const { resposta, caminhoFinal } = await this.navegar(caminho);
    return { status: resposta.status, caminhoFinal, html: await resposta.text() };
  }

  /**
   * Chama uma Server Action por HTTP, do mesmo jeito que o navegador:
   * POST na própria página, cabeçalho `Next-Action` com o id do build e
   * os argumentos serializados. A ação executada é a da aplicação, com
   * a sessão desta instância.
   */
  async acao(caminhoDaPagina, actionId, argumentos = []) {
    const resposta = await this.requisitar(caminhoDaPagina, {
      method: "POST",
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        "next-action": actionId,
      },
      body: JSON.stringify(argumentos),
    });
    const texto = await resposta.text();
    return { status: resposta.status, texto, resposta };
  }
}

/** Entidades HTML básicas (valores de atributo e texto renderizado). */
export function decodificar(texto) {
  return texto
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Texto da página como o leitor vê: sem os marcadores `<!-- -->` que o
 * React põe entre trechos de texto e com entidades decodificadas — para
 * procurar frases como "Em revisão · 3" sem depender da renderização.
 */
export function textoVisivel(html) {
  return decodificar(html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}

/**
 * Extrai o retorno da Server Action do fluxo do Next.
 *
 * A resposta traz o retorno da ação na linha `1:` e, depois dela, o
 * re-render da página. Ler a linha `1:` é o que separa "o que a ação
 * devolveu" de "o que a tela mostrou em seguida".
 */
export function valorDaAcao(texto) {
  for (const linha of texto.split(/\r?\n/)) {
    if (!linha.startsWith("1:")) continue;
    const bruto = linha.slice(2);
    if (!bruto.startsWith("{") && !bruto.startsWith("[")) continue;
    try {
      return JSON.parse(bruto);
    } catch {
      return null;
    }
  }
  return null;
}

/** Mensagem de erro quando a ação foi recusada pelo servidor. */
export function erroDaAcao(texto) {
  const encontrado = texto.match(/"message":"([^"]*)"/);
  return encontrado ? encontrado[1] : null;
}

/**
 * A ação foi recusada pelo servidor?
 *
 * Em produção o Next não devolve a mensagem do erro: ele responde 200 e
 * marca a linha da ação como erro (`1:E{"digest":…}`). Procurar a
 * mensagem, como fazíamos, dava "aprovado" para recusa e para sucesso —
 * este é o sinal certo.
 */
export function acaoRecusada({ status, texto }) {
  if (status >= 400) return true;
  return /^1:E\{/m.test(texto);
}
