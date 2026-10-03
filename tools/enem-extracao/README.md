# Extração de cadernos do Enem (ferramenta offline)

Converte um caderno oficial do INEP (`AAAA_PV_impresso_Dn_CDn.pdf`) e o
gabarito correspondente em itens no formato **híbrido** do banco de questões
IAH (D-050): texto com marcação mínima (`<sub>`, `<sup>`, `<em>`, `<strong>`,
`<small>`) e recortes de imagem para figuras, tabelas e fórmulas,
referenciados por `{{figura:N}}`.

Não faz parte da aplicação nem carrega nada no banco. A saída é a matéria-prima
da **conferência humana**, que é obrigatória antes da revisão editorial no sistema.

```bash
pip install -r tools/enem-extracao/requirements.txt
python3 tools/enem-extracao/extrair.py \
  --prova  "2º dia/2024/2024_PV_impresso_D2_CD5.pdf" \
  --gabarito "2º dia/2024/2024_GB_impresso_D2_CD5.pdf" \
  --saida  _extracao-iah/2024-D2-CD5
```

Saída: `itens.json` (meta + itens), `qNNN-figN.png` (recortes usados no item),
`qNNN-originalN.png` (questão inteira, só para conferência) e `conferencia.html`
(extraído × original, lado a lado, com alertas por questão).

## Regras de extração

| Elemento | Tratamento |
|---|---|
| Cabeçalho `QUESTÃO NN` | Delimita a questão; segue colunas e páginas, inclusive faixas de largura total |
| Alternativas | Glifo próprio do caderno (A–E); cada uma tem uma faixa (lista ou grade) |
| Alternativa com figura ou fórmula | A alternativa inteira vira um recorte limitado à própria faixa |
| Fração, radical, expressão com glifos posicionados | Recorte da expressão inteira (não sobram números soltos) |
| Tabelas, diagramas, gráficos, legendas | Recorte; rótulos de legenda vão junto dos símbolos |
| Índices e expoentes | `<sub>`/`<sup>` pelo tamanho e posição da fonte |
| Créditos ("Disponível em…", referências) | `<small>` no enunciado e lista `creditos` (base da verificação de direitos) |
| Decoração | Barras de cabeçalho, filetes, logotipo, rodapé, abas de margem e marca d'água descartados |
| Gabarito | Lido do PDF oficial; "Anulado" vira `anulada: true` |

## Limitações conhecidas

- Testada no piloto 2024 · 2º dia · caderno 5. Outros anos têm diagramação
  diferente (2021 e 2025 em especial) e devem ser conferidos antes da carga.
- 1º dia: as questões 1–5 existem em inglês e espanhol; esta versão mantém só
  a primeira ocorrência de cada número.
- O alerta "possível hifenização" é conservador (marca também hífens reais).
