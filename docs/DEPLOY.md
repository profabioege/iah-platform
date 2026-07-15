# Deploy — Versionamento e Publicação do IAH

Como o código sai da máquina de desenvolvimento e chega à internet. Estado em 15/07/2026.

## Estado atual

| Item | Situação |
|---|---|
| Controle de versão | ✅ Git local, branch principal `main` |
| Repositório remoto (GitHub) | ✅ `github.com/profabioege/iah-platform` (privado) |
| Deploy contínuo (CI/CD) | ✅ Vercel conectada ao GitHub; push na `main` → deploy automático |
| Ambiente de homologação | ✅ **https://iah-platform.vercel.app** (ambiente oficial de validação) |
| Produção definitiva (domínio) | ⚠️ `iaheducacional.com.br` ainda serve o **WordPress temporário**; virada de DNS pendente (ver "Virada do domínio") |

Fluxo operante hoje: **Desenvolvimento → Git → GitHub → Vercel → Validação → Produção**. Cada push na `main` gera um novo deploy automático em `iah-platform.vercel.app`.

### Configuração adotada na Vercel

- **Root Directory:** `app` (o projeto Next.js vive na subpasta).
- **Framework:** Next.js (detectado); build `next build` padrão.
- **Variáveis de ambiente:** `NEXT_PUBLIC_SITE_URL` cadastrada. As demais (Resend/WhatsApp) seguem pendentes — sem elas, o formulário opera em modo `mailto`.
- **Resolução de URL do site** (`app/src/lib/site.ts`): `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` (URL estável do projeto) → `VERCEL_URL` (deploy) → `localhost`. Isso garante `canonical`/Open Graph corretos e auto-referenciados na homologação, sem apontar para o domínio ainda não conectado.

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
| `NEXT_PUBLIC_SITE_URL` | URLs canônicas, sitemap, Open Graph | autodetecta a URL da Vercel (`VERCEL_PROJECT_PRODUCTION_URL`); só definir quando o domínio próprio entrar |
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

## O que falta para migrar o domínio definitivo (checklist)

Já concluído: ✅ repositório GitHub · ✅ Vercel conectada · ✅ deploy contínuo · ✅ homologação no ar.

Pendente para `iaheducacional.com.br` apontar para a aplicação Next:

- [ ] **Acesso ao DNS** do domínio (registrador) para adicionar os registros que a Vercel indicar.
- [ ] **Adicionar o domínio na Vercel** (*Settings → Domains* → `iaheducacional.com.br` + `www`) — *precisa de você*.
- [ ] **Definir `NEXT_PUBLIC_SITE_URL=https://iaheducacional.com.br`** na Vercel após a virada (para canonical/OG usarem o domínio final).
- [ ] (Opcional, para o formulário sair do `mailto`) **`RESEND_API_KEY`** + verificação do domínio no Resend.
- [ ] (Recomendado) **Proteção da branch `main`** no GitHub: exigir Pull Request para mesclar.

## Rotina de trabalho a partir de agora (fluxo-padrão)

**Desenvolvimento → Git → GitHub → Vercel → Validação → Produção.**

- Cada entrega aprovada vira um **commit** na `main` (idealmente via Pull Request).
- Mensagens de commit descrevem a entrega (ex.: `E2: navegação real da plataforma`).
- **Push na `main` = deploy automático** em `iah-platform.vercel.app` — validar sempre lá antes de considerar a entrega concluída.
- Nenhum passo manual de publicação; a Vercel cuida do build e da hospedagem.
