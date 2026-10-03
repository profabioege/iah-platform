#!/usr/bin/env python3
"""
Extração de questões de cadernos oficiais do Enem (INEP) para o banco de
questões IAH — formato HÍBRIDO (D-050):

  * enunciado e alternativas em TEXTO, com marcação mínima e segura
    (<sub>, <sup>, <em>, <strong>, <small>);
  * figuras, diagramas, tabelas e gráficos como RECORTES DE IMAGEM fiéis
    do caderno, referenciados no texto por {{figura:N}};
  * créditos de fonte ("Disponível em…", referências) preservados — são
    a base da verificação de direitos de cada item;
  * recorte da questão inteira, só para conferência humana.

NÃO carrega nada no banco. Produz uma pasta de saída com `itens.json`,
os PNGs e `conferencia.html` (lado a lado: extraído × original) para a
revisão editorial. Toda questão precisa de conferência humana antes de
ir para a revisão no sistema — o script aponta onde olhar primeiro.

Ferramenta OFFLINE (não faz parte da aplicação). Requer PyMuPDF:
    pip install -r tools/enem-extracao/requirements.txt
Uso:
    python3 tools/enem-extracao/extrair.py \
        --prova 2024_PV_impresso_D2_CD5.pdf \
        --gabarito 2024_GB_impresso_D2_CD5.pdf \
        --saida ./saida-2024-D2-CD5
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

QUESTION_RE = re.compile(r"^QUEST[ÃA]O\s+(\d{1,3})\b")
AREA_HEADER_RE = re.compile(
    r"^(CI[ÊE]NCIAS|MATEM[ÁA]TICA|LINGUAGENS)\b.*TECNOLOGIAS|^Quest[õo]es de \d+ a \d+",
    re.IGNORECASE,
)
HEADER_Y = 58  # acima disso: código de barras e logotipo
FOOTER_Y = 742  # abaixo disso: rodapé e marca d'água
RENDER_ZOOM = 2.0  # 144 dpi nos recortes
BODY_SIZE_MIN = 9.0
CREDIT_SIZE_MAX = 8.6


# ----------------------------------------------------------------------
# Estruturas
# ----------------------------------------------------------------------
@dataclass
class Line:
    page: int
    col: int
    bbox: tuple[float, float, float, float]
    spans: list[dict]
    text: str

    @property
    def y0(self) -> float:
        return self.bbox[1]

    @property
    def x0(self) -> float:
        return self.bbox[0]


@dataclass
class Zone:
    page: int
    col: int
    rect: pymupdf.Rect
    parts: list[pymupdf.Rect] = field(default_factory=list)  # retângulos originais (imagens/desenhos)


@dataclass
class Item:
    number: int
    lines: list[Line] = field(default_factory=list)
    zones: list[Zone] = field(default_factory=list)


# ----------------------------------------------------------------------
# Leitura da página
# ----------------------------------------------------------------------
def column_of(x: float, page_width: float) -> int:
    return 0 if x < page_width / 2 else 1


def page_lines(page: pymupdf.Page, pno: int) -> tuple[list[Line], list[pymupdf.Rect]]:
    width = page.rect.width
    lines: list[Line] = []
    images: list[pymupdf.Rect] = []
    for block in page.get_text("dict")["blocks"]:
        bbox = pymupdf.Rect(block["bbox"])
        if block["type"] == 1:
            if (bbox.y1 > HEADER_Y and bbox.y0 < FOOTER_Y and bbox.width > 8 and bbox.height > 8
                    and bbox.x0 < width - 30 and bbox.x1 > 25):  # descarta abas/faixas de margem
                images.append(bbox)
            continue
        for ln in block["lines"]:
            spans = [s for s in ln["spans"] if s["text"].strip() or "\t" in s["text"] or s["text"] == " "]
            spans = [s for s in spans if s["size"] >= 3]  # descarta marca d'água "ENEM2024…"
            if not spans:
                continue
            lb = ln["bbox"]
            if lb[1] < HEADER_Y or lb[3] > FOOTER_Y + 10:
                continue
            text = "".join(s["text"] for s in spans).strip()
            if not text:
                continue
            lines.append(Line(pno, column_of(lb[0], width), tuple(lb), spans, text))
    return lines, images


def content_drawings(page: pymupdf.Page, header_ys: list[tuple[int, float]]) -> list[pymupdf.Rect]:
    """Desenhos vetoriais que são CONTEÚDO (diagramas, tabelas, gráficos)."""
    out = []
    w = page.rect.width
    for d in page.get_drawings():
        r = pymupdf.Rect(d["rect"])
        if r.y1 < HEADER_Y or r.y0 > FOOTER_Y:
            continue  # logotipo, código, rodapé
        if r.x1 < 25 or r.x0 > w - 30 or r.width > w * 0.9:
            continue  # marcas de corte e moldura da página
        # Barra decorativa ao lado de "QUESTÃO NN" (altura ≤ 6, mesma linha).
        if r.height <= 6.5 and any(abs(r.y0 - hy) < 12 and column_of(r.x0, w) == hc for hc, hy in header_ys):
            continue
        out.append(r)
    return out


def cluster_parts(rects: list[pymupdf.Rect], gap: float = 10) -> list[tuple[pymupdf.Rect, list[pymupdf.Rect]]]:
    """Agrupa e devolve também as peças originais de cada grupo."""
    zones = cluster(rects, gap)
    out = []
    for z in zones:
        members = [r for r in rects if (pymupdf.Rect(r) + (-1, -1, 1, 1)).intersects(z)]
        out.append((z, members))
    return out


def cluster(rects: list[pymupdf.Rect], gap: float = 10) -> list[pymupdf.Rect]:
    # Linhas de tabela/eixo têm largura ou altura zero: um Rect "vazio" não
    # intersecta nada, e a tabela viraria dezenas de recortes. Engorda 1pt.
    rects = [pymupdf.Rect(r) + (-1, -1, 1, 1) for r in rects]
    merged = True
    while merged:
        merged = False
        out: list[pymupdf.Rect] = []
        for r in rects:
            for i, o in enumerate(out):
                grown = pymupdf.Rect(o.x0 - gap, o.y0 - gap, o.x1 + gap, o.y1 + gap)
                if grown.intersects(r):
                    out[i] = o | r
                    merged = True
                    break
            else:
                out.append(r)
        rects = out
    return rects


# ----------------------------------------------------------------------
# Segmentação em questões (ordem de leitura: página → coluna → y)
# ----------------------------------------------------------------------
def full_width_headers(page: pymupdf.Page, lines: list[Line]) -> list[float]:
    """Cabeçalhos de questão cuja barra decorativa atravessa a página: a
    questão ocupa a largura toda (sem colunas) até o próximo cabeçalho."""
    w = page.rect.width
    bars = [pymupdf.Rect(d["rect"]) for d in page.get_drawings()]
    ys = []
    for l in lines:
        if QUESTION_RE.match(l.text) and l.x0 < w / 2:
            # Uma ÚNICA barra que começa na coluna esquerda e cruza o meio da
            # página (dois cabeçalhos lado a lado têm duas barras separadas).
            if any(abs(b.y0 - l.y0) < 12 and b.height <= 6.5 and b.x0 < w / 2 and b.x1 > w * 0.75 for b in bars):
                ys.append(l.y0)
    return ys


def page_bands(lines: list[Line], full_ys: list[float]) -> list[tuple[float, float, bool]]:
    """Faixas verticais da página: (y0, y1, largura_total)."""
    if not full_ys:
        return [(0, 10_000, False)]
    headers = sorted(l.y0 for l in lines if QUESTION_RE.match(l.text))
    bands, cursor = [], 0.0
    for fy in sorted(full_ys):
        nxt = next((h for h in headers if h > fy + 1), 10_000)
        if fy > cursor:
            bands.append((cursor, fy - 0.5, False))
        bands.append((fy - 0.5, nxt - 0.5, True))
        cursor = nxt - 0.5
    if cursor < 10_000:
        bands.append((cursor, 10_000, False))
    return bands


def expand_math(z: pymupdf.Rect, parts: list[pymupdf.Rect], lines: list[Line]) -> pymupdf.Rect:
    """Traço de fração ou radical (zona baixa, sem imagem): o recorte precisa
    levar numerador, denominador e o restante da linha da expressão — senão
    sobram números soltos no texto. Só linhas cujo centro vertical está na
    faixa da expressão entram (não engole o parágrafo vizinho)."""
    out = pymupdf.Rect(z)
    if z.width < 40 and z.height >= 30:
        # Coluna estreita de símbolos (legenda): leva junto os rótulos à
        # direita de cada símbolo, na mesma faixa vertical.
        for l in lines:
            b = pymupdf.Rect(l.bbox)
            cy = (b.y0 + b.y1) / 2
            if z.y0 - 2 <= cy <= z.y1 + 2 and z.x1 - 2 <= b.x0 <= z.x1 + 40:
                out |= b
        return out
    if z.height >= 30:  # radicais e frações compostas chegam a ~25pt
        return z
    for l in lines:
        b = pymupdf.Rect(l.bbox)
        cy = (b.y0 + b.y1) / 2
        if z.y0 - 9 <= cy <= z.y1 + 9 and b.x1 >= z.x0 - 40 and b.x0 <= z.x1 + 40:
            out |= b
    return out


CONTROL_RE = re.compile(r"[\x00-\x08\x0e-\x1f]")


def is_fragment(line: Line) -> bool:
    """Pedaço de expressão matemática montada com glifos posicionados:
    linha minúscula (ex.: "!", "4", "×") ou com caracteres de controle da
    fonte de símbolos (parênteses grandes em pedaços)."""
    if QUESTION_RE.match(line.text) or is_option_start(line):
        return False
    if CONTROL_RE.search(line.text):
        return True
    width = line.bbox[2] - line.bbox[0]
    return width < 20 and len(line.text.strip()) <= 3


def is_decorative(members: list[pymupdf.Rect], images: list[pymupdf.Rect]) -> bool:
    """Grupo formado só por filetes horizontais finos (fim de coluna, régua)."""
    return all(m.height < 1.5 and m.width > 60 for m in members) and not any(
        m.intersects(i) for m in members for i in images
    )


def segment(doc: pymupdf.Document) -> list[Item]:
    stream: list[Line] = []
    zones_by_page_col: dict[tuple[int, int], list[tuple[pymupdf.Rect, list[pymupdf.Rect]]]] = {}
    for pno in range(len(doc)):
        page = doc[pno]
        lines, images = page_lines(page, pno)
        bands = page_bands(lines, full_width_headers(page, lines))
        full = [(a, b) for a, b, f in bands if f]
        in_full = lambda y: any(a <= y < b for a, b in full)
        for l in lines:
            if in_full(l.y0):
                l.col = 0  # faixa de largura total: uma coluna só
        header_ys = [(l.col, l.y0) for l in lines if QUESTION_RE.match(l.text)]
        drawings = content_drawings(page, header_ys)
        fragments = [pymupdf.Rect(l.bbox) for l in lines if is_fragment(l)]
        for z, members in cluster_parts(images + drawings + fragments, gap=8):
            if is_decorative(members, images):
                continue
            only_fragments = all(any(m == f for f in fragments) for m in members)
            if only_fragments and len(members) < 2:
                continue  # caractere curto isolado no texto não é expressão
            has_image = any(pymupdf.Rect(m).intersects(i) for m in members for i in images)
            if not has_image:
                z = expand_math(z, members, lines)
            col = 0 if in_full(z.y0) else column_of((z.x0 + z.x1) / 2, page.rect.width)
            zones_by_page_col.setdefault((pno, col), []).append((z, members))
        for a, b, is_full in bands:
            band = [l for l in lines if a <= l.y0 < b]
            if is_full:
                stream.extend(sorted(band, key=lambda l: (l.y0, l.x0)))
            else:
                for col in (0, 1):
                    stream.extend(sorted((l for l in band if l.col == col), key=lambda l: (l.y0, l.x0)))

    items: list[Item] = []
    current: Item | None = None
    for line in stream:
        m = QUESTION_RE.match(line.text)
        if m:
            current = Item(int(m.group(1)))
            current.lines.append(line)
            items.append(current)
            continue
        if current is None or AREA_HEADER_RE.search(line.text):
            continue
        current.lines.append(line)

    # Atribui zonas à questão cujo trecho (página, coluna, faixa de y) as contém.
    for (pno, col), zones in zones_by_page_col.items():
        for z, members in zones:
            owner = None
            for it in items:
                ys = [l for l in it.lines if l.page == pno and l.col == col]
                if not ys:
                    continue
                top = min(l.bbox[1] for l in ys) - 4
                bottom = max(l.bbox[3] for l in ys) + 40
                if top <= z.y0 <= bottom or top <= z.y1 <= bottom:
                    owner = it
                    if z.y0 >= top:
                        break
            if owner is not None:
                owner.zones.append(Zone(pno, col, z, members))
    return items


# ----------------------------------------------------------------------
# Texto com marcação mínima
# ----------------------------------------------------------------------
def main_size(line: Line) -> float:
    """Tamanho dominante da linha (ponderado pelo nº de caracteres): um
    símbolo maior (ex.: →) não pode virar a referência e rebaixar o resto
    para índice."""
    weight: dict[float, int] = {}
    for s in line.spans:
        k = round(s["size"], 1)
        weight[k] = weight.get(k, 0) + len(s["text"].strip())
    return max(weight, key=weight.get) if weight else 10


def span_markup(line: Line, skip: list[pymupdf.Rect] | None = None) -> str:
    main = main_size(line)
    baseline = max((s["origin"][1] for s in line.spans if s["size"] >= main - 0.3), default=0)
    out = []
    for s in line.spans:
        if skip:
            sb = pymupdf.Rect(s["bbox"])
            if any(z.contains((sb.tl + sb.br) / 2) for z in skip):
                continue  # já está no recorte da expressão
        t = html.escape(s["text"].replace("\t", " "))
        if not t:
            continue
        if s["size"] < main * 0.8:
            tag = "sup" if s["origin"][1] < baseline - 1 else "sub"
            t = f"<{tag}>{t.strip()}</{tag}>"
        else:
            if s["flags"] & 2:
                t = f"<em>{t}</em>"
            if s["flags"] & 16 and main >= BODY_SIZE_MIN and "Bold" in s["font"]:
                t = f"<strong>{t}</strong>"
        out.append(t)
    text = "".join(out)
    text = re.sub(r"</(em|strong|sub|sup)><\1>", "", text)
    return re.sub(r"[  ]+", " ", text).strip()


def is_option_start(line: Line) -> str | None:
    first = line.spans[0]
    if "Bundesbahn" in first["font"]:
        key = first["text"].strip()[:1]
        if key in "ABCDE":
            return key
    return None


def is_credit(line: Line) -> bool:
    return main_size(line) <= CREDIT_SIZE_MAX


COL_WIDTH = 246  # largura útil aproximada de uma coluna do caderno


def is_centered(line: Line, col_left: dict[tuple[int, int], float]) -> bool:
    left = line.x0 - col_left.get((line.page, line.col), line.x0)
    width = line.bbox[2] - line.x0
    return left > 4 and width < COL_WIDTH * 0.85 and abs((left + width / 2) - COL_WIDTH / 2) < 30


def join_lines(parts: list[tuple[Line, str]], col_left: dict[tuple[int, int], float]) -> str:
    paragraphs: list[str] = []
    buf = ""
    prev: Line | None = None
    for line, text in parts:
        new_par = prev is None
        if prev is not None and (is_centered(line, col_left) or is_centered(prev, col_left)):
            new_par = True
        elif prev is not None:
            gap = line.y0 - prev.bbox[3]
            indent = line.x0 - col_left.get((line.page, line.col), line.x0)
            height = prev.bbox[3] - prev.bbox[1]
            if line.page != prev.page or line.col != prev.col:
                new_par = indent > 8
            else:
                new_par = indent > 8 or gap > height * 0.9
        if new_par and buf:
            paragraphs.append(buf.strip())
            buf = ""
        if buf.endswith("-"):
            buf += text
        else:
            buf += (" " if buf else "") + text
        prev = line
    if buf:
        paragraphs.append(buf.strip())
    return "\n\n".join(paragraphs)


# ----------------------------------------------------------------------
# Montagem de cada questão
# ----------------------------------------------------------------------
def widest_gap(lo: float, hi: float, x0: float, x1: float, rects: list[pymupdf.Rect]) -> float:
    """Meio do maior vão vertical em branco entre lo e hi, considerando só o
    conteúdo que sobrepõe [x0, x1]. É a fronteira natural entre duas
    alternativas empilhadas (gráficos altos, rótulos de eixo)."""
    occ = sorted((max(r.y0, lo), min(r.y1, hi)) for r in rects
                 if r.x1 > x0 and r.x0 < x1 and r.y1 > lo and r.y0 < hi)
    gaps, cursor = [], lo
    for a, b in occ:
        if a > cursor:
            gaps.append((a - cursor, (cursor + a) / 2))
        cursor = max(cursor, b)
    if hi > cursor:
        gaps.append((hi - cursor, (cursor + hi) / 2))
    if not gaps:
        return (lo + hi) / 2
    best = max(g for g, _ in gaps)
    # Empate (entrelinhas iguais): fica o vão MAIS BAIXO — a linha de
    # continuação pertence à alternativa de cima.
    return [mid for g, mid in gaps if g >= best - 1.5][-1]


def option_bands(glyphs: list[Line], it: Item, zones: list[Zone]) -> dict[str, tuple[int, int, pymupdf.Rect]]:
    """Faixa de cada alternativa (lista ou grade): do maior vão em branco
    acima até o maior vão abaixo, e do glifo até o glifo vizinho à direita
    ou o fim do conteúdo. Devolve {letra: (página, coluna, faixa)}."""
    bands = {}
    for g in glyphs:
        key = is_option_start(g)
        same = [o for o in glyphs if (o.page, o.col) == (g.page, g.col) and o is not g]
        below = [o for o in same if abs(o.x0 - g.x0) < 25 and o.y0 > g.y0 + 4]
        above = [o for o in same if abs(o.x0 - g.x0) < 25 and o.y0 < g.y0 - 4]
        right = [o for o in same if o.x0 > g.x0 + 40 and abs(o.y0 - g.y0) < 30]
        content = [pymupdf.Rect(l.bbox) for l in it.lines if (l.page, l.col) == (g.page, g.col) and l is not it.lines[0]]
        content += [pymupdf.Rect(m) for z in zones if (z.page, z.col) == (g.page, g.col) for m in (z.parts or [z.rect])]
        col_right = max((r.x1 for r in content), default=g.bbox[2])
        x0 = g.spans[0]["bbox"][2] + 1
        x1 = (min(o.x0 for o in right) - 3) if right else col_right + 1
        gc = (g.bbox[1] + g.bbox[3]) / 2
        if above:
            prev = max(above, key=lambda o: o.y0)
            pc = (prev.bbox[1] + prev.bbox[3]) / 2
            y0 = widest_gap(pc, gc, g.x0, x1, [r for r in content if not r.contains(pymupdf.Rect(prev.bbox))])
        else:
            # Topo da coluna da grade: logo abaixo do enunciado (linhas antes
            # do primeiro glifo desta página/coluna) ou do topo do trecho.
            first_top = min(o.bbox[1] for o in [g] + same)
            stem = [l.bbox[3] for l in it.lines[1:] if (l.page, l.col) == (g.page, g.col)
                    and l.bbox[3] <= first_top + 2 and not is_option_start(l)
                    and not any(pymupdf.Rect(m).contains(pymupdf.Rect(l.bbox).tl + (1, 1))
                                for z in zones for m in (z.parts or [z.rect]) if z.rect.y1 > first_top - 2)]
            y0 = (max(stem) + 0.5) if stem else min((r.y0 for r in content), default=g.bbox[1]) - 1
        if below:
            nxt = min(below, key=lambda o: o.y0)
            nc = (nxt.bbox[1] + nxt.bbox[3]) / 2
            y1 = widest_gap(gc, nc, g.x0, x1, content)
        else:
            y1 = max((r.y1 for r in content if r.y1 > g.bbox[1] and r.x1 > g.x0 and r.x0 < x1), default=g.bbox[3]) + 1
        bands[key] = (g.page, g.col, pymupdf.Rect(x0, y0, x1, y1))
    return bands


def crop(doc, pno: int, rect: pymupdf.Rect, path: Path, zoom: float = RENDER_ZOOM, pad_left: float = 3,
         mask: list[pymupdf.Rect] | None = None) -> list[float]:
    """Recorta a região; linhas de texto que NÃO pertencem ao recorte mas
    invadem a moldura (vizinhas de uma fração no parágrafo, crédito logo
    abaixo de uma figura) são pintadas de branco."""
    clip = (pymupdf.Rect(rect) + (-pad_left, -3, 3, 3)) & doc[pno].rect
    pix = doc[pno].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=clip)
    for m in mask or []:
        r = (pymupdf.Rect(m) - (0.5, 0.5, -0.5, -0.5)) & clip
        if r.is_empty:
            continue
        # Coordenadas ABSOLUTAS do pixmap (pix.irect começa em clip × zoom).
        full = pymupdf.IRect(pix.irect)
        ox, oy = full.x0, full.y0
        ir = pymupdf.IRect(ox + int((r.x0 - clip.x0) * zoom), oy + int((r.y0 - clip.y0) * zoom),
                           ox + int((r.x1 - clip.x0) * zoom) + 1, oy + int((r.y1 - clip.y0) * zoom) + 1) & full
        if not ir.is_empty:
            pix.set_rect(ir, (255, 255, 255))
    pix.save(path)
    return [round(v, 1) for v in clip]


page_text_lines: dict[int, list[Line]] = {}


def build_item(doc: pymupdf.Document, it: Item, out_dir: Path, area: str, col_left) -> dict:
    flags: list[str] = []
    zones = sorted(it.zones, key=lambda z: (z.page, z.col, z.rect.y0, z.rect.x0))
    glyphs = sorted((l for l in it.lines if is_option_start(l)), key=lambda l: is_option_start(l))
    bands = option_bands(glyphs, it, zones)

    def in_band(page: int, col: int, r: pymupdf.Rect) -> str | None:
        """Linha/peça pertence à faixa: centro vertical dentro da faixa e
        sobreposição horizontal (linhas curtas como "Ⓐ 6" têm o centro à
        esquerda do início da faixa)."""
        cy = (r.y0 + r.y1) / 2
        for key, (bp, bc, br) in bands.items():
            g = next(x for x in glyphs if is_option_start(x) == key)
            if (bp, bc) == (page, col) and br.y0 <= cy <= br.y1 and r.x1 > g.x0 - 1 and r.x0 < br.x1:
                return key
        return None

    def zone_hits_band(z: Zone, key: str) -> bool:
        bp, bc, br = bands[key]
        return (z.page, z.col) == (bp, bc) and pymupdf.Rect(z.rect).intersects(br)

    # Zonas que pertencem às alternativas (tocam alguma faixa) x enunciado.
    option_zone_keys = {k for k in bands for z in zones if zone_hits_band(z, k)}
    stem_zones = [z for z in zones if not any(zone_hits_band(z, k) for k in bands)]

    def in_stem_zone(l: Line) -> bool:
        """Linha absorvida pelo recorte só se ficar majoritariamente dentro
        dele (crédito logo abaixo da figura continua sendo texto)."""
        lb = pymupdf.Rect(l.bbox)
        area = max(lb.get_area(), 1e-6)
        return any((z.page, z.col) == (l.page, l.col) and (lb & (pymupdf.Rect(z.rect) + (-2, -2, 2, 2))).get_area() / area >= 0.6
                   for z in stem_zones)

    def foreign_lines(page: int, rect: pymupdf.Rect, own) -> list[pymupdf.Rect]:
        """Linhas de texto desta página que tocam a moldura e não são do recorte."""
        frame = pymupdf.Rect(rect) + (-3, -3, 3, 3)
        out = []
        for l in page_text_lines.get(page, []):
            lb = pymupdf.Rect(l.bbox)
            if lb.intersects(frame) and not own(l):
                out.append(lb)
        return out

    figures: list[dict] = []
    for z in stem_zones:
        n = len(figures) + 1
        name = f"q{it.number:03d}-fig{n}.png"
        zr = pymupdf.Rect(z.rect)
        own = lambda l, zr=zr: (pymupdf.Rect(l.bbox) & (zr + (-2, -2, 2, 2))).get_area() / max(pymupdf.Rect(l.bbox).get_area(), 1e-6) >= 0.6
        figures.append({"n": n, "arquivo": name, "pagina": z.page + 1,
                        "bbox": crop(doc, z.page, z.rect, out_dir / name, mask=foreign_lines(z.page, z.rect, own)), "_zone": z})

    # ------------------------------------------------------------ enunciado
    stem_lines = [l for l in it.lines[1:]
                  if not in_stem_zone(l) and in_band(l.page, l.col, pymupdf.Rect(l.bbox)) is None and not is_option_start(l)]

    def order_key(page, col, y):
        return (page, col, y)

    events = [(order_key(l.page, l.col, l.y0), "line", l) for l in stem_lines]
    events += [(order_key(f["_zone"].page, f["_zone"].col, f["_zone"].rect.y0), "fig", f) for f in figures]
    events.sort(key=lambda e: (e[0], 0 if e[1] == "fig" else 1))

    chunks: list[str] = []
    credits: list[str] = []
    stem_parts: list[tuple[Line, str]] = []
    credit_buf: list[str] = []

    def flush_text():
        nonlocal stem_parts
        if stem_parts:
            chunks.append(join_lines(stem_parts, col_left))
            stem_parts = []

    def flush_credit():
        nonlocal credit_buf
        if credit_buf:
            text = re.sub(r"(\S)- (\S)", r"\1-\2", " ".join(credit_buf))
            credits.append(re.sub(r"<[^>]+>", "", text))
            chunks.append(f"<small>{text}</small>")
            credit_buf = []

    for _, kind, obj in events:
        if kind == "fig":
            flush_text(); flush_credit()
            chunks.append(f"{{{{figura:{obj['n']}}}}}")
            continue
        markup = span_markup(obj)
        if is_credit(obj):
            flush_text()
            credit_buf.append(markup)
        else:
            flush_credit()
            stem_parts.append((obj, markup))
    flush_text(); flush_credit()
    stem = "\n\n".join(c for c in chunks if c.strip())

    # ------------------------------------------------------------ alternativas
    options: list[dict] = []
    for g in glyphs:
        key = is_option_start(g)
        bp, bc, br = bands[key]
        band_lines = sorted(
            (l for l in it.lines if l is g or in_band(l.page, l.col, pymupdf.Rect(l.bbox)) == key),
            key=lambda l: (l.y0, l.x0),
        )
        graphic = key in option_zone_keys or any(is_fragment(l) for l in band_lines if l is not g)
        if graphic:
            # A alternativa inteira vira um recorte limitado à própria faixa.
            # Só as peças (imagem/desenho/fragmento) cujo centro cai nesta
            # faixa — evita levar pedaço da alternativa vizinha.
            content = [pymupdf.Rect(m) for z in zones if zone_hits_band(z, key)
                       for m in (z.parts or [z.rect]) if in_band(z.page, z.col, pymupdf.Rect(m)) == key]
            for l in band_lines:
                lb = pymupdf.Rect(l.bbox)
                if l is g:
                    lb.x0 = g.spans[0]["bbox"][2] + 1
                content.append(lb & br)
            content = [r for r in content if not r.is_empty]
            if not content:  # peças cruzam a fronteira da faixa: usa a interseção
                content = [pymupdf.Rect(z.rect) & br for z in zones if zone_hits_band(z, key)]
                content = [r for r in content if not r.is_empty]
                flags.append(f"alternativa {key}: recorte pela faixa — conferir")
            area_r = content[0]
            for r in content[1:]:
                area_r |= r
            n = len(figures) + 1
            name = f"q{it.number:03d}-fig{n}.png"
            area_r.x0 = max(area_r.x0, g.spans[0]["bbox"][2] + 1.5)
            own_ids = {id(l) for l in band_lines}
            mask = foreign_lines(bp, area_r, lambda l: id(l) in own_ids or
                                 (pymupdf.Rect(l.bbox) & br).get_area() / max(pymupdf.Rect(l.bbox).get_area(), 1e-6) >= 0.6)
            figures.append({"n": n, "arquivo": name, "pagina": bp + 1,
                            "bbox": crop(doc, bp, area_r, out_dir / name, pad_left=0, mask=mask), "alternativa": key})
            options.append({"key": key, "text": f"{{{{figura:{n}}}}}"})
        else:
            parts = []
            for l in band_lines:
                m = span_markup(l)
                if l is g:
                    m = re.sub(rf"^{key}\s*", "", m, count=1)
                parts.append(m)
            text = ""
            for m in parts:
                text = text + m if text.endswith("-") else (text + " " + m if text else m)
            options.append({"key": key, "text": text.strip()})

    for f in figures:
        f.pop("_zone", None)

    # Recorte da questão inteira, por trecho (só para conferência).
    originals = []
    spans_by_pc: dict[tuple[int, int], list[pymupdf.Rect]] = {}
    for l in it.lines:
        spans_by_pc.setdefault((l.page, l.col), []).append(pymupdf.Rect(l.bbox))
    for z in zones:
        spans_by_pc.setdefault((z.page, z.col), []).append(pymupdf.Rect(z.rect))
    for k, ((pno, col), rects) in enumerate(sorted(spans_by_pc.items()), start=1):
        r = rects[0]
        for x in rects[1:]:
            r |= x
        name = f"q{it.number:03d}-original{k}.png"
        crop(doc, pno, r, out_dir / name, zoom=1.5)
        originals.append(name)

    # Sinais para a conferência humana.
    keys = [o["key"] for o in options]
    if keys != list("ABCDE"):
        flags.append(f"alternativas encontradas: {''.join(keys) or 'nenhuma'}")
    if any(not o["text"] for o in options):
        flags.append("alternativa vazia")
    if not stem.strip():
        flags.append("enunciado vazio")
    if figures:
        flags.append(f"{len(figures)} recorte(s) — conferir enquadramento")
    if any(f.get("alternativa") for f in figures):
        flags.append("alternativas como recorte (fórmula/figura)")
    if re.search(r"[A-Za-zÀ-ú]-\s?[a-zà-ú]", stem):
        flags.append("possível hifenização de fim de linha")
    if len({(l.page, l.col) for l in it.lines}) > 1:
        flags.append("questão em mais de um trecho (coluna/página)")
    if any("<sub>" in t or "<sup>" in t for t in [stem] + [o["text"] for o in options]):
        flags.append("contém índices/expoentes — conferir")
    if CONTROL_RE.search(stem):
        flags.append("caractere de controle no enunciado — conferir")

    return {
        "numero": it.number,
        "area": area,
        "enunciado": stem,
        "alternativas": options,
        "creditos": credits,
        "figuras": figures,
        "recortes_originais": originals,
        "paginas": sorted({l.page + 1 for l in it.lines}),
        "alertas": flags,
    }


# ----------------------------------------------------------------------
# Gabarito
# ----------------------------------------------------------------------
def parse_answer_key(path: Path) -> dict[int, str | None]:
    text = pymupdf.open(path)[0].get_text("text")
    tokens = [t.strip() for t in re.split(r"\s+", text) if t.strip()]
    answers: dict[int, str | None] = {}
    i = 0
    while i < len(tokens) - 1:
        if tokens[i].isdigit() and 1 <= int(tokens[i]) <= 180:
            nxt = tokens[i + 1]
            if nxt in list("ABCDE"):
                answers[int(tokens[i])] = nxt
                i += 2
                continue
            if nxt.lower().startswith("anulad"):
                answers[int(tokens[i])] = None
                i += 2
                continue
        i += 1
    return answers


AREA_BY_RANGE = [
    (1, 45, "LC"), (46, 90, "CH"), (91, 135, "CN"), (136, 180, "MT"),
]


def area_of(n: int) -> str:
    return next(a for lo, hi, a in AREA_BY_RANGE if lo <= n <= hi)


# ----------------------------------------------------------------------
# Página de conferência
# ----------------------------------------------------------------------
def render_markup(text: str, figures: dict[int, str]) -> str:
    def para(p: str) -> str:
        m = re.fullmatch(r"\{\{figura:(\d+)\}\}", p.strip())
        if m:
            return f'<img class="fig" src="{figures[int(m.group(1))]}" alt="figura {m.group(1)}">'
        p = re.sub(r"\{\{figura:(\d+)\}\}", lambda m: f'<img class="fig inline" src="{figures[int(m.group(1))]}" alt="figura">', p)
        return f"<p>{p}</p>"
    return "".join(para(p) for p in text.split("\n\n"))


def write_review(items: list[dict], meta: dict, out_dir: Path) -> None:
    rows = []
    for it in items:
        figs = {f["n"]: f["arquivo"] for f in it["figuras"]}
        opts = "".join(
            f'<li class="{"ok" if o["key"] == it.get("gabarito") else ""}"><b>{o["key"]})</b> {render_markup(o["text"], figs)}</li>'
            for o in it["alternativas"]
        )
        alerts = "".join(f"<li>{html.escape(a)}</li>" for a in it["alertas"])
        orig = "".join(f'<img src="{o}" alt="original">' for o in it["recortes_originais"])
        gab = it.get("gabarito") or "ANULADA"
        rows.append(
            f'<section id="q{it["numero"]}"><h2>Questão {it["numero"]} · {it["area"]} · gabarito {gab}</h2>'
            f'<div class="grid"><div class="ext">{render_markup(it["enunciado"], figs)}<ol>{opts}</ol></div>'
            f'<div class="orig">{orig}</div></div>'
            f'{"<ul class=alerts>" + alerts + "</ul>" if alerts else ""}</section>'
        )
    css = (
        "body{font:15px/1.5 system-ui,sans-serif;margin:0 auto;max-width:1200px;padding:16px;color:#111;background:#fff}"
        "@media (prefers-color-scheme:dark){body{background:#111;color:#eee}.orig img{filter:none}}"
        "section{border-top:1px solid #8884;padding:12px 0}h2{font-size:15px;margin:0 0 8px}"
        ".grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:800px){.grid{grid-template-columns:1fr}}"
        ".orig img{max-width:100%;border:1px solid #8885;background:#fff}.fig{max-width:100%;display:block;margin:6px 0;background:#fff}"
        ".fig.inline{display:inline-block;max-height:160px;vertical-align:middle}ol{list-style:none;padding:0}li.ok{font-weight:600;color:#0a7}"
        ".alerts{font-size:13px;color:#b45309;margin:6px 0 0}small{font-size:12px;opacity:.8}"
    )
    head = (
        f"<h1>Conferência — Enem {meta['ano']} · {meta['dia']}º dia · caderno {meta['caderno']}</h1>"
        f"<p>{len(items)} questões extraídas. Esquerda: o que será carregado (texto + recortes). "
        "Direita: recorte original do caderno. Conferir texto, índices, figuras, alternativas e gabarito "
        "antes de enviar à revisão editorial. Conteúdo do INEP e de terceiros — uso condicionado à "
        "verificação de direitos (fonte 'licenciado').</p>"
    )
    (out_dir / "conferencia.html").write_text(
        f'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>Conferência Enem {meta['ano']} D{meta['dia']}</title><style>{css}</style><body>{head}{''.join(rows)}</body></html>",
        encoding="utf-8",
    )


# ----------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prova", required=True, type=Path)
    ap.add_argument("--gabarito", required=True, type=Path)
    ap.add_argument("--saida", required=True, type=Path)
    args = ap.parse_args()

    m = re.match(r"(\d{4})_PV_impresso_D(\d)_CD(\d+)", args.prova.name)
    if not m:
        print("Nome de arquivo fora do padrão oficial do INEP (AAAA_PV_impresso_Dn_CDn.pdf).", file=sys.stderr)
        return 2
    meta = {"ano": int(m.group(1)), "dia": int(m.group(2)), "caderno": int(m.group(3)),
            "arquivo_prova": args.prova.name, "arquivo_gabarito": args.gabarito.name}

    args.saida.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(args.prova)
    raw = segment(doc)
    for pno in range(len(doc)):
        page_text_lines[pno] = page_lines(doc[pno], pno)[0]

    # Margem esquerda de cada coluna (para detectar recuo de parágrafo).
    col_left: dict[tuple[int, int], float] = {}
    for it in raw:
        for l in it.lines:
            k = (l.page, l.col)
            col_left[k] = min(col_left.get(k, l.x0), l.x0)

    answers = parse_answer_key(args.gabarito)
    items = []
    seen = set()
    for it in raw:
        if it.number in seen:
            continue  # cabeçalho repetido (continuação) — mantém a primeira ocorrência
        seen.add(it.number)
        data = build_item(doc, it, args.saida, area_of(it.number), col_left)
        data["gabarito"] = answers.get(it.number, "?")
        data["anulada"] = it.number in answers and answers[it.number] is None
        if data["gabarito"] == "?":
            data["alertas"].append("sem gabarito no arquivo de gabarito")
        items.append(data)

    expected = list(range(1, 91)) if meta["dia"] == 1 else list(range(91, 181))
    found = [i["numero"] for i in items]
    missing = sorted(set(expected) - set(found))
    summary = {
        **meta,
        "questoes_extraidas": len(items),
        "faltando": missing,
        "anuladas": [i["numero"] for i in items if i["anulada"]],
        "com_figura": sum(1 for i in items if i["figuras"]),
        "com_indices": sum(1 for i in items if any("índices" in a for a in i["alertas"])),
        "alternativas_como_recorte": [i["numero"] for i in items if any(f.get("alternativa") for f in i["figuras"])],
        "alternativas_incompletas": [i["numero"] for i in items if [o["key"] for o in i["alternativas"]] != list("ABCDE")],
    }
    (args.saida / "itens.json").write_text(json.dumps({"meta": summary, "itens": items}, ensure_ascii=False, indent=2), encoding="utf-8")
    write_review(items, meta, args.saida)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
