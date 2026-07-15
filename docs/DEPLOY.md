# Deploy — Versionamento e Publicação do IAH

Como o código sai da máquina de desenvolvimento e chega à internet. Estado em 15/07/2026.

## Estado atual

| Item | Situação |
|---|---|
| Controle de versão | ✅ Git local, branch principal `main` (commit inicial `a6b3f91`) |
| Repositório remoto (GitHub) | ❌ Não criado — falta conta/permissão |
| Deploy contínuo (CI/CD) | ❌ Não configurado — falta conta no provedor de hospedagem |
| Produção | ⚠️ O domínio `iaheducacional.com.br` ainda serve o **WordPress temporário**, desconectado deste repositório (ver [07_DECISIONS.md](07_DECISIONS.md)) |

Ou seja: hoje, alterações aprovadas ficam **apenas no ambiente local** até que os passos da seção "O que falta" sejam concluídos.

## Fluxo-alvo (boas práticas)

```
desenvolvimento local
      │  git commit
      ▼
   branch main  ──── push ────▶  GitHub (repositório privado)
                                     │
                                     │  integração nativa
                                     ▼
                                  Vercel
                       ┌─────────────┴─────────────┐
              push na main                  pull request
                       │                           │
                       ▼                           ▼
              PRODUÇÃO (domínio)          PREVIEW (URL única por PR)
```

- **`main` é produção.** Todo push na `main` gera deploy de produção automaticamente.
- **Toda mudança relevante entra por Pull Request**, que ganha uma *preview URL* própria na Vercel — dá para validar visualmente antes de mesclar.
- **Vercel** é o alvo recomendado por ser o encaixe nativo de uma aplicação Next.js com servidor (rotas de API, SSR, imagem OG dinâmica — decisão D-005 em [07_DECISIONS.md](07_DECISIONS.md)). Netlify ou um host Node próprio também funcionam; os passos abaixo assumem Vercel.

## Configuração na Vercel (quando houver conta)

1. Criar o repositório no GitHub (privado) e conectar este repo local:
   ```bash
   git remote add origin https://github.com/<usuario>/iah-educacional.git
   git push -u origin main
   ```
2. Na Vercel: **Add New Project → Import** do repositório.
3. **Root Directory: `app`** ← essencial; o projeto Next.js vive na subpasta `app/`, não na raiz do repositório.
4. Framework preset: Next.js (detectado automaticamente). Build padrão (`next build`) — sem configuração extra.
5. Cadastrar as variáveis de ambiente (abaixo) em *Settings → Environment Variables*.
6. Ao final, a Vercel fornece uma URL `*.vercel.app`. A troca do domínio real é o último passo (seção "Virada do domínio").

## Variáveis de ambiente de produção

Referência completa em [`app/.env.example`](../app/.env.example). Nenhuma delas é obrigatória para o site subir — mas cada ausência desliga a funcionalidade correspondente:

| Variável | Para quê | Sem ela |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URLs canônicas, sitemap, Open Graph | usa o padrão `https://iaheducacional.com.br` |
| `RESEND_API_KEY` | Envio real do formulário de demonstração (rota `/api/contato`, hoje dormente) | formulário segue no modo `mailto:` |
| `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` | Destino/remetente dos leads via Resend | usa `contato@iaheducacional.com.br` / remetente de teste |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Botão de WhatsApp (componente pronto, fora do fluxo atual) | botão não aparece |

**Regra de segurança:** segredos existem apenas em dois lugares — `app/.env.local` na máquina (ignorado pelo Git) e no painel da Vercel. Nunca em código ou commit. O `.gitignore` já garante isso (`.env*` ignorado, só `.env.example` versionado).

## Virada do domínio (WordPress → Next)

Quando decidirmos aposentar o WordPress:

1. Na Vercel: *Settings → Domains* → adicionar `iaheducacional.com.br` (e `www`).
2. No provedor de DNS do domínio: apontar o registro `A`/`CNAME` conforme instruído pela Vercel.
3. Conferir propagação, certificado TLS automático e os metadados (title/OG) em produção.
4. Manter o WordPress acessível por alguns dias (rollback barato: basta reverter o DNS).

## O que falta para publicar com segurança (checklist)

- [ ] **Conta GitHub** (ou org) e criação do repositório privado — *precisa de você*.
- [ ] **Push da `main`** para o remoto (comando na seção acima) — eu executo assim que o remoto existir e você autorizar.
- [ ] **Conta Vercel** conectada ao GitHub e importação do projeto com Root Directory `app` — *precisa de você (login/autorização)*.
- [ ] **Variáveis de ambiente** cadastradas na Vercel (mínimo: nenhuma; ideal: `NEXT_PUBLIC_SITE_URL`; para o formulário Resend: `RESEND_API_KEY` + verificação do domínio no Resend).
- [ ] **Acesso ao DNS** do domínio para a virada (somente quando formos substituir o WordPress).
- [ ] (Recomendado) **Proteção da branch `main`** no GitHub: exigir Pull Request para mesclar.

## Rotina de trabalho a partir de agora

- Cada entrega aprovada vira um **commit** na `main` (ou um PR, quando o GitHub existir).
- Mensagens de commit descrevem a entrega (ex.: `E2: navegação real da plataforma`).
- Com a Vercel conectada, **mesclar na `main` = publicar** — nenhum passo manual adicional.
