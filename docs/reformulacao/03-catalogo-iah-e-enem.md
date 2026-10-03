# Incremento 2 — Catálogo IAH e carga do Enem (formato híbrido)

Decisão: `DECISIONS.md` D-050. Branch `reform/em-curriculo-banco-questoes`,
**não publicada**. Escolhas do Founder (03/10/2026): importação completa como
`licenciado` (banco de questões inéditas IAH virá depois, no mesmo catálogo);
formato **híbrido**; piloto **Enem 2024 · 2º dia · caderno 5**; habilidade
**Matriz do Enem (oficial) + BNCC sugerida**.

## O que existe agora

| Peça | Onde | Estado |
|---|---|---|
| Migração do catálogo | `app/db/migrations/0018_iah_catalog.sql` | Aplicada só em bancos efêmeros de teste |
| Referências | `app/db/reference/` — BNCC EM (183 habilidades, bncc.dev, CC BY 4.0), Matriz do Enem 2009 CN/MT (60), BNCC sugerida para o caderno piloto (90) | Matriz transcrita: **conferir com o PDF oficial do INEP** |
| Extração dos PDFs | `tools/enem-extracao/` (PyMuPDF, offline) | Caderno piloto: 90/90 itens; saída na pasta do acervo, fora do repositório |
| Biblioteca de carga | `app/src/modules/question-bank/catalog/enem-import.ts` | Testada com dados sintéticos |
| Script de carga | `app/scripts/catalogo-enem-carga.mjs` | Simulação por padrão; **nunca executado fora do banco efêmero** |
| Renderização | `domain/markup.ts` + `components/question-bank/question-content.tsx` | Lista de permissão; sem `dangerouslySetInnerHTML` |
| Figuras | `GET /api/questoes/figura/<versão>/<n>` | Lê pelo `iah_app` do ator; recusa = 404 |
| Telas | Banco do professor, lista do aluno | Rótulos de origem e de vínculo |

## Modelo

- **Catálogo IAH = inquilino especial** (`institutions.kind = 'catalogo'`). A
  equipe IAH trabalha nele com as contas e o fluxo editorial que já existem
  (autor ≠ revisor; gestão do catálogo verifica direitos).
- **Escolas leem só versões aprovadas** (ou aprovadas e depois substituídas)
  do catálogo e as usam em listas. **Não escrevem** no catálogo: questão,
  versão, figura e sugestão são recusadas pela RLS. Listas, tentativas,
  respostas e devolutivas continuam da escola.
- **Formato híbrido:** texto com `<sub>`, `<sup>`, `<em>`, `<strong>`,
  `<small>` e `{{figura:N}}` (`content_format = 'marcacao_v1'`); figuras em
  `question_assets` (PNG ≤ 2 MB, imutáveis depois do envio à revisão, mesma
  visibilidade da versão).
- **Habilidade oficial** da questão Enem = habilidade da **Matriz**
  (`framework = 'enem_matriz'`, vinda de `CO_HABILIDADE` dos microdados).
- **BNCC sugerida** (`question_skill_suggestions`): proposta por IA ou pela
  equipe, com confiança e motivo; só a equipe do inquilino dono confirma ou
  rejeita. Na tela: "sugerida por IA · confiança … · não revisada" ou
  "confirmada pela equipe". Sugestão não revisada **não** tira a lista do
  status provisório.
- **Resolução exigida na aprovação** (antes era ao criar o gabarito): itens
  importados entram em rascunho sem resolução e só o autor da versão a
  escreve (`writeResolution`).
- **Procedência externa** em `questions.external_ref` (ano, dia, caderno, cor,
  CO_PROVA, posição, CO_ITEM, habilidade, parâmetros TRI com procedência,
  páginas, alertas da extração). Chave única por inquilino: reimportar não
  duplica. **TRI nunca vira dificuldade editorial** e uma lista curta não gera
  proficiência na escala do Enem.

## Como carregar (quando os bloqueios abaixo forem resolvidos)

```
cd app
node --experimental-strip-types scripts/catalogo-enem-carga.mjs \
  --extracao="<ENEM>\_extracao-iah\2024-D2-CD5" \
  --microdados="<ENEM>\microdados\ITENS_PROVA_2024.csv" \
  --sugestoes=db/reference/enem-2024-d2-cd5-bncc-sugerida.json \
  --catalogo=<id do inquilino catálogo> --autor=<id da conta de autoria IAH>
```

Sem `--execute`, só confere e mostra o que seria criado. Com `--execute`,
grava apenas no banco local ou no projeto de homologação confirmado duas vezes
(`pilot-target-guard.mjs`). O CO_PROVA é descoberto pela sequência de
gabaritos (o número do caderno não está nos microdados); casamento ambíguo ou
ausente é recusado.

Depois da carga, por item: a equipe IAH escreve a resolução → envia à revisão
→ outra pessoa revisa → a gestão IAH verifica a licença da fonte da edição.
Só então o item aparece para as escolas.

## Qualidade da extração (caderno piloto)

| Indicador | Valor |
|---|---|
| Itens extraídos | 90 de 90 (91–180), todos com A–E |
| Anulados (gabarito oficial) | 1 (102) — não entra na carga |
| Com figura | 60; alternativas como figura: 15 |
| Com índices sub/sup | 21 |
| Simulação da carga (microdados de teste) | 89 itens, 135 figuras, 0 problemas de marcação |
| Conferência visual | ~20 itens conferidos por mim contra o PDF; **revisão humana item a item ainda obrigatória** (`conferencia.html` na pasta da extração) |

## Testes (03/10/2026)

- 401 unitários (11 novos: marcação, microdados, plano de carga, PNG).
- 48 de integração com banco real (7 novos em `tests/pilot/question-bank-catalog.test.mjs`).
  Três mutações na 0018 (catálogo visível em rascunho; aprovação sem resolução;
  lista sem item do catálogo) foram detectadas.
- 59 da fila; 18 migrações válidas; build de produção OK.
- Percurso HTTP com navegador (servidor de produção + banco efêmero, 12/12):
  professor vê itens do catálogo rotulados com figuras e índices, publica
  lista, aluno responde e recebe a devolutiva; aluno de outra escola e
  visitante sem sessão recebem 404 na figura. Feito localmente com três itens
  reais e microdados **fictícios**; nada disso foi gravado fora do banco
  descartável.

## Bloqueios e pendências

1. **Microdados** `ITENS_PROVA_2021…2024.csv` (INEP): o download é bloqueado
   aqui. Sem eles a carga não roda: falta a habilidade oficial e o TRI.
2. **Base legal / evidência de licença** para uso dos itens e do conteúdo de
   terceiros citado neles: decisão e verificação da gestão IAH. Enquanto
   faltar, a fonte fica `pendente` e nada é aprovado.
3. **Contas e inquilino do catálogo** em homologação: não criados. O
   provisionamento atual pede turma e aluno; um provisionamento próprio do
   catálogo é decisão a tomar.
4. **Telas editoriais do catálogo** (escrever resolução, revisar, confirmar
   sugestão BNCC, texto alternativo das figuras): os casos de uso existem no
   serviço e estão testados, mas as telas não foram feitas.
5. **Resoluções comentadas**: produção da equipe IAH.
6. **Matriz LC/CH** (1º dia) e conferência da Matriz CN/MT e da BNCC com os
   documentos oficiais.
7. **Texto alternativo** das figuras: `alt_text` nulo; a tela usa "Figura N da
   questão". Acessibilidade fica pendente até a equipe descrever as figuras.
