# Inventário do acervo Enem local — 03/10/2026

Pasta: `C:\Users\profabio77\OneDrive\Documentos\ENEM` (acervo compartilhado
entre Aprova ENEM e IAH escolar — ambos produtos IAH Educacional).
Levantamento **somente leitura**: nada foi importado, movido ou apagado.
Nenhum enunciado é reproduzido neste documento.

> **Pendente — base legal.** O compartilhamento entre produtos IAH está
> decidido; o uso de conteúdo do INEP e de terceiros contido nos itens, não.
> Até essa definição, a regra da D-049 vale: item de terceiros só vai para
> aluno como fonte `licenciado`, com evidência e direitos verificados.

## 1. Conteúdo

| Item | Verificado |
|---|---|
| Arquivos | 28 PDFs, 65 MB — 14 cadernos (`*_PV_*`) + 14 gabaritos (`*_GB_*`) |
| Procedência | Nomes idênticos aos arquivos oficiais do INEP (`download.inep.gov.br/enem/provas_e_gabaritos/<arquivo>`). Integridade contra o servidor do INEP **não conferida**. |
| Formato | PDF digital (texto extraível), 32 páginas por caderno; layout em duas colunas com imagens (10 a 173 por caderno); diagramação de 2021 e 2025 difere das demais |
| Edições | 2021–2025, aplicação regular impressa, 1º e 2º dias |

### Cadernos presentes

| Ano | 1º dia | 2º dia |
|---|---|---|
| 2021 | CD1 Azul, CD2 Amarela | CD5, CD7 Azul |
| 2022 | CD2 Amarela, CD4 Rosa | CD5 (duas cópias idênticas) |
| 2023 | CD1 | CD5 |
| 2024 | CD1 | CD5 |
| 2025 | CD1 | CD5 |

Cadernos de cores diferentes de uma mesma aplicação têm os mesmos itens em
outra ordem — confirmado por texto para 2022/1º dia (148 de 149 linhas longas
em comum); provável para 2021 (comparação textual inconclusiva por diferença
de extração).

### Itens únicos (estimativa)

| Dia | Itens por edição | Total 2021–2025 | Anulados (gabarito oficial) |
|---|---|---|---|
| 1º — Linguagens e Humanas | 95 (90 + 5 da língua estrangeira alternativa) | ~475 | 0 |
| 2º — Natureza e Matemática | 90 | ~450 | 7 (2021: 1 · 2022: 1 · 2023: 1 · 2024: 1 · 2025: 3) |
| **Total** | | **~925 (~918 válidos)** | |

## 2. Organização da pasta (problemas encontrados)

| Situação | Caminho atual | Observação |
|---|---|---|
| Duplicata exata (mesmo MD5) | `1º dia/d2_Amarela_2022/2022_{PV,GB}_impresso_D2_CD5.pdf` | Igual a `2º dia/2022/` |
| 2º dia arquivado no 1º | `1º dia/d2_Azul_2021/2021_{PV,GB}_impresso_D2_CD7.pdf` | Pertence a `2º dia/2021/` |
| Nome de pasta trocado | `1º dia/d1_Amarela_2023/` | Contém **2022** CD2 (Amarela) |
| Padrão misto de nomes | `2021-amarela`, `rosa - 2022`, `d1_Azul_2021`, `2023` | Pastas por ano em um lugar, por cor/ano em outro |

Proposta (só com autorização; sem apagar nada — o que sobrar vai para
`_to_delete/` para exclusão manual):

```
ENEM/
  1º dia/
    2021/  2021_*_D1_CD1.pdf (Azul)  2021_*_D1_CD2.pdf (Amarela)
    2022/  2022_*_D1_CD2.pdf (Amarela)  2022_*_D1_CD4.pdf (Rosa)
    2023/  2024/  2025/            (como estão)
  2º dia/
    2021/  2021_*_D2_CD5.pdf  2021_*_D2_CD7.pdf (Azul)
    2022/  2023/  2024/  2025/     (como estão)
  _to_delete/
    2022_{PV,GB}_impresso_D2_CD5.pdf   (duplicata de 2º dia/2022)
```

A cor fica no nome do arquivo oficial (`CDn`), não no nome da pasta.

## 3. Lacunas para virar item de banco

| Lacuna | Onde obter | Situação |
|---|---|---|
| Resolução comentada | Produção própria (IAH) | Ausente no acervo |
| Habilidade da Matriz de Referência por item | Microdados do INEP, arquivo `ITENS_PROVA` (`CO_HABILIDADE`) | Hipótese a confirmar no dicionário oficial; colunas citadas por fonte secundária: `ANO_APLICACAO`, `CO_POSICAO`, `SG_AREA`, `CO_ITEM`, `TX_GABARITO`, `CO_HABILIDADE`, `NU_PARAM_A/B/C`, `CO_PROVA`, `TX_COR` |
| Parâmetros TRI oficiais | Mesmos microdados (`NU_PARAM_A/B/C`) | Idem; microdados de 2025 provavelmente ainda não publicados |
| Item a item com imagens | Extração dos PDFs + conferência humana | Viável; layout varia por ano |

Uso dos parâmetros TRI, se adotados: guardados com procedência ("parâmetro
oficial INEP, aplicação de AAAA"), distintos do rótulo editorial. Uma lista
curta na escola **não** gera proficiência na escala do Enem.

## 4. Conteúdo de terceiros (indicador de risco de direitos)

| Caderno | "Disponível em… Acesso em…" | "adaptado" |
|---|---|---|
| 2024 · 1º dia | 58 | 70 |
| 2024 · 2º dia | 21 | 36 |

Textos de sites, livros, jornais, charges e imagens creditados a terceiros —
concentrados no 1º dia. Matemática e Ciências da Natureza dependem menos disso.

## 5. Caminhos e implicação no modelo

| Caminho | O que entra | Risco de direitos | Mudança no banco |
|---|---|---|---|
| 1. Catálogo de metadados | Ano, dia, caderno, posição, área, gabarito, anulado (+ habilidade e TRI dos microdados) e link para a página do PDF oficial; **sem enunciado** | Baixo | Camada "catálogo IAH" (itens sem `institution_id`, só leitura para escolas) — D-050 |
| 2. Importação completa como `licenciado` | Enunciado, alternativas, imagens, com fonte e evidência | Depende da base legal | Catálogo IAH + carga com revisão; começar pelo 2º dia |
| 3. Referência para itens originais | Nada do Enem entra no banco | Nenhum | Nenhuma |
