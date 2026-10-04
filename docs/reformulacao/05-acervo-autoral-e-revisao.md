# Incremento 4 — Acervo autoral IAH e revisão editorial

Decisão: `DECISIONS.md` D-052. Branch `reform/em-curriculo-banco-questoes`,
**não publicada**. Escolhas do Founder (04/10/2026):

| Decisão | Escolha |
|---|---|
| Destino das 80 questões | **Catálogo IAH** (comum às escolas parceiras) |
| Acervo 01 sem BNCC/Matriz/série | **IA propõe, a revisão confirma** |
| Devolutivas por alternativa | **Guardar todas**; aluno lê a da alternativa marcada depois de entregar |
| Revisão | **Tela de revisão construída agora** |

## O que existe agora

| Peça | Onde |
|---|---|
| Migração | `app/db/migrations/0020_authored_items_review.sql` — devolutiva por alternativa, `marcacao_v2` (tabelas), habilidade corrigível só antes da 1ª aprovação |
| Leitura dos arquivos e carga | `catalog/iah-authored-import.ts` + `scripts/catalogo-iah-autoral-carga.mjs` (simulação por padrão) |
| Classificação proposta (acervo 01) | `app/db/reference/iah-acervo-01-classificacao-proposta.json` — BNCC, Matriz e série por item, com confiança e motivo |
| Matriz do Enem LC/CH | `app/db/reference/matriz-enem-2009-lc-ch.json` (60 habilidades) — **conferir com o PDF oficial** |
| Revisão (professor) | `/professor/revisao` e `/professor/revisao/[versão]` |
| Revisão (gestão) | `/gestor/revisao` e `/gestor/revisao/[versão]` |
| Fontes e direitos (gestão) | `/gestor/fontes` |
| Devolutiva da alternativa ao aluno | `/dashboard/listas/[id]`, depois da entrega |

Os dois arquivos .md continuam material de origem **fora do repositório**;
o repositório guarda só o importador e testes com itens sintéticos.

## Como os itens entram

| Campo | Acervo 01 (40) | Acervo 02 (40) |
|---|---|---|
| Habilidade oficial | BNCC **proposta por IA** (marcada na tela) | BNCC do autor ("associação editorial") |
| Matriz do Enem | sugestão da IA | sugestão do autor (extraída de "Habilidade trabalhada") |
| Série sugerida | proposta por IA | do autor |
| Enunciado | `marcacao_v2`; tabelas viram tabela de verdade | idem; referências históricas guardadas |
| Resolução | devolutiva da alternativa correta | idem |
| Devolutiva por alternativa | as cinco | as cinco |
| Status | **em revisão** | **em revisão** |
| Fonte | `autoral_iah`, direitos **pendentes** até a gestão IAH verificar | idem |

Simulação com os arquivos reais (04/10/2026): **80 itens, 0 problemas**;
40 com habilidade do autor, 40 propostas por IA; 15 com tabela; 80
sugestões da Matriz. Todos os 40 códigos BNCC do acervo 02 existem na
referência e batem com a área do item.

Habilidades de Língua Portuguesa (EM13LP…) levam o componente de LP (a
BNCC as prende a esse componente); as demais ficam no componente da área.

## Fluxo de revisão

1. **Gestão IAH** verifica a fonte em `/gestor/fontes` (uma vez).
2. **Revisor** (professor ou gestão, diferente do autor) abre o item: vê
   enunciado renderizado, alternativas com as devolutivas, resolução,
   habilidade oficial com o selo "proposta por IA" quando for o caso,
   série, referências e sugestões da Matriz (confirmar/rejeitar).
3. **Aprovar** exige os quatro itens da conferência (gabarito/devolutivas,
   habilidade, direitos, linguagem). **Devolver** exige comentário.
4. **Autor** corrige a versão devolvida: o editor cria a versão seguinte
   (a anterior fica no histórico), pode trocar a habilidade oficial e já
   enviar de novo. Depois da primeira aprovação, a habilidade não muda mais.

## Testes (04/10/2026)

- 415 unitários (6 novos: leitura dos dois formatos, `marcacao_v2`, plano,
  devolutiva na devolutiva automática).
- 63 de integração com banco real (6 novos em
  `tests/pilot/authored-review.test.mjs`); 2 mutações na 0020 detectadas.
- 59 da fila; 20 migrações válidas; build OK.
- Percurso HTTP com navegador e os **80 itens reais** num banco
  descartável (10/10): carga, verificação da fonte, fila com 80, aprovação
  e devolução pela tela, editor do autor, item aprovado na lista da escola,
  tabela renderizada, aluno lendo a devolutiva da alternativa marcada.
  Nada foi gravado fora do banco descartável.

## Pendências

1. **Inquilino e contas do Catálogo na homologação** — necessários para
   carregar de verdade (mesma pendência do incremento 2).
2. **Revisão humana dos 80 itens** — em especial as 40 classificações
   propostas por IA.
3. **Matriz LC/CH** transcrita sem acesso ao PDF oficial: conferir.
4. **Dificuldade editorial** não veio nos arquivos; fica "não informada"
   até a revisão definir.
5. O "texto da habilidade" do acervo 02 é paráfrase do autor; fica como
   texto editorial da sugestão, não como redação oficial da Matriz.
