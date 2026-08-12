#!/usr/bin/env python3
"""Build a clean Tmall profit analysis briefing from validated sources."""

from pathlib import Path

import numpy as np
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

OUT = Path("/workspace/天猫近3月数据_分析结果")
COPY = Path("/workspace/新建文件夹 (2)")
OUT.mkdir(exist_ok=True)
COPY.mkdir(exist_ok=True)

WEEKS = [
    "5.11-5.17",
    "5.25-5.31",
    "6.15-6.21",
    "6.22-6.28",
    "6.29-7.5",
    "7.6-7.12",
    "7.13-7.19",
    "7.20-7.26",
    "7.27-8.2",
]


def driver_label(d_pre, d_ad, d_after):
    if pd.isna(d_after):
        return ""
    if d_after >= 0:
        return "本期改善"
    if d_pre < 0 and abs(d_pre) >= max(d_ad, 0):
        return "主要是推广前利润下降"
    if d_ad > 0 and d_ad >= abs(min(d_pre, 0)):
        return "主要是推广费上升"
    return "推广前与推广费共同影响"


def style_header_row(ws, row, ncols, hf, hfont, thin):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = hf
        cell.font = hfont
        cell.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
        cell.border = thin
    ws.row_dimensions[row].height = 28


def write_df(ws, df, start_row=1, money_cols=None, freeze=True, styles=None):
    money_cols = set(money_cols or [])
    hf, hfont, bfont, thin, neg, pos, alt = styles
    for j, col in enumerate(df.columns, 1):
        ws.cell(start_row, j, col)
    style_header_row(ws, start_row, len(df.columns), hf, hfont, thin)
    if freeze:
        ws.freeze_panes = f"A{start_row + 1}"
    for i, row in enumerate(df.itertuples(index=False), start_row + 1):
        for j, (col, val) in enumerate(zip(df.columns, row), 1):
            if pd.isna(val):
                val = None
            elif hasattr(val, "item"):
                try:
                    val = val.item()
                except Exception:
                    pass
            cell = ws.cell(i, j, val)
            cell.font = bfont
            cell.border = thin
            cell.alignment = Alignment(vertical="center")
            is_num = isinstance(val, (int, float)) and col not in ("排名", "链接数", "商品ID")
            if is_num:
                if "利率" in str(col) or "费率" in str(col):
                    cell.number_format = "0.00%"
                elif "%" in str(col):
                    cell.number_format = "0.0"
                else:
                    cell.number_format = "#,##0.00"
            profitish = any(k in str(col) for k in ("利润", "变化", "环比", "侵蚀"))
            if is_num and profitish:
                if val < 0:
                    cell.fill = neg
                elif val > 0:
                    cell.fill = pos
            elif (i - start_row) % 2 == 0 and (
                cell.fill.fgColor is None
                or getattr(cell.fill.fgColor, "rgb", None) in (None, "00000000")
            ):
                cell.fill = alt
    for col in range(1, ws.max_column + 1):
        letter = get_column_letter(col)
        maxlen = 0
        for r in range(start_row, min(ws.max_row, 70) + 1):
            v = ws.cell(r, col).value
            if v is not None:
                maxlen = max(maxlen, min(len(str(v)), 40))
        ws.column_dimensions[letter].width = max(10, min(34, maxlen + 2))


def main():
    idm = pd.read_excel(OUT / "天猫ID周损益_合并.xlsx", sheet_name="全部周合并明细")
    idm = idm[idm["周次"].isin(WEEKS)].copy()
    for c in [
        "成交金额",
        "去税金额",
        "成交件数",
        "推广总花费",
        "推广总成交",
        "净利润(推广前)",
        "净利润(推广后)",
        "其他费用",
    ]:
        if c in idm.columns:
            idm[c] = pd.to_numeric(idm[c], errors="coerce")
    idm["商品ID"] = idm["商品ID"].astype(str)
    idm["定位"] = idm["定位"].fillna("").astype(str).str.strip()
    idm["商品名称"] = idm["商品名称"].fillna("").astype(str).str.strip()

    store = pd.read_csv(OUT / "天猫旗舰店周报_近3个月.csv")

    tot = (
        idm.groupby("周次", sort=False)
        .agg(
            成交金额=("成交金额", "sum"),
            推广前利润=("净利润(推广前)", "sum"),
            推广花费=("推广总花费", "sum"),
            推广后利润=("净利润(推广后)", "sum"),
        )
        .reindex(WEEKS)
    )
    tot["推广费率"] = tot["推广花费"] / tot["成交金额"]
    tot["环比_推广后"] = tot["推广后利润"].diff()
    tot["环比_推广前"] = tot["推广前利润"].diff()
    tot["环比_推广费"] = tot["推广花费"].diff()
    tot["下降主因"] = [
        driver_label(p, a, aft)
        for p, a, aft in zip(tot["环比_推广前"], tot["环比_推广费"], tot["环比_推广后"])
    ]

    def piv(metric):
        p = idm.pivot_table(
            index=["商品ID", "定位", "商品名称"], columns="周次", values=metric, aggfunc="sum"
        )
        return p.reindex(columns=WEEKS)

    piv_aft = piv("净利润(推广后)")
    piv_pre = piv("净利润(推广前)")
    piv_ad = piv("推广总花费")

    def stage(w0, w1, c0, c1):
        comp = pd.DataFrame(
            {
                c0: piv_aft.get(w0),
                c1: piv_aft.get(w1),
                "推广前_0": piv_pre.get(w0),
                "推广前_1": piv_pre.get(w1),
                "花费_0": piv_ad.get(w0),
                "花费_1": piv_ad.get(w1),
            }
        ).fillna(0)
        comp["推广后变化"] = comp[c1] - comp[c0]
        comp["推广前变化"] = comp["推广前_1"] - comp["推广前_0"]
        comp["推广费变化"] = comp["花费_1"] - comp["花费_0"]
        comp["主因"] = [
            driver_label(p, a, aft)
            for p, a, aft in zip(comp["推广前变化"], comp["推广费变化"], comp["推广后变化"])
        ]
        return comp.reset_index()

    comp = stage("7.6-7.12", "7.13-7.19", "推广后_7.6", "推广后_7.13")
    drag = comp.sort_values("推广后变化").head(10)
    improve = comp.sort_values("推广后变化", ascending=False).head(5)

    comp2 = stage("7.13-7.19", "7.20-7.26", "推广后_7.13", "推广后_7.20")
    drag2 = comp2.sort_values("推广后变化").head(10)

    def is_dada(row):
        name = str(row["商品名称"])
        pos = str(row["定位"])
        if "巴东" in name:
            return False
        if pos == "杯面次链接" and "大大" not in name:
            return False
        return ("大大" in name) or ("原味大包" in pos) or (pos in ("大大", "原味大包"))

    dada = idm[idm.apply(is_dada, axis=1)].copy()
    dada_week = (
        dada.groupby("周次")
        .agg(
            成交金额=("成交金额", "sum"),
            推广前利润=("净利润(推广前)", "sum"),
            推广花费=("推广总花费", "sum"),
            推广后利润=("净利润(推广后)", "sum"),
            链接数=("商品ID", "nunique"),
        )
        .reindex(WEEKS)
    )
    dada_week["推广侵蚀"] = dada_week["推广前利润"] - dada_week["推广后利润"]

    top5_rows = []
    for w in WEEKS:
        sub = idm[idm["周次"] == w].nsmallest(5, "净利润(推广后)")
        total = idm.loc[idm["周次"] == w, "净利润(推广后)"].sum()
        for rank, (_, r) in enumerate(sub.iterrows(), 1):
            share = (r["净利润(推广后)"] / total * 100) if total != 0 else np.nan
            top5_rows.append(
                {
                    "周次": w,
                    "排名": rank,
                    "商品ID": r["商品ID"],
                    "定位": r["定位"],
                    "商品名称": r["商品名称"],
                    "净利润(推广后)": r["净利润(推广后)"],
                    "成交金额": r["成交金额"],
                    "占当周推广后利润%": share,
                }
            )
    top5 = pd.DataFrame(top5_rows)

    mat = piv_aft.reset_index()
    mat["7.6→7.13变化"] = mat.get("7.13-7.19", np.nan) - mat.get("7.6-7.12", np.nan)
    mat = mat.sort_values("7.6→7.13变化", ascending=True)

    phases = pd.DataFrame(
        [
            {
                "阶段": "阶段A 5月中→6月上",
                "区间": "5.25→6.8",
                "推广后变化": store.loc[store["周次"] == "6.8-6.14", "推广后利润"].iloc[0]
                - store.loc[store["周次"] == "5.25-5.31", "推广后利润"].iloc[0],
                "主因": "主要是推广前利润下降",
                "说明": "五月末至六月上旬走弱",
            },
            {
                "阶段": "阶段B 6月上→7月上",
                "区间": "6.8→7.6",
                "推广后变化": store.loc[store["周次"] == "7.6-7.12", "推广后利润"].iloc[0]
                - store.loc[store["周次"] == "6.8-6.14", "推广后利润"].iloc[0],
                "主因": "本期改善",
                "说明": "触底后回升至近三个月最好周",
            },
            {
                "阶段": "阶段C 7月上→7月中下",
                "区间": "7.6→7.20",
                "推广后变化": store.loc[store["周次"] == "7.20-7.26", "推广后利润"].iloc[0]
                - store.loc[store["周次"] == "7.6-7.12", "推广后利润"].iloc[0],
                "主因": "先推广前下降，后推广费上升",
                "说明": "连续回落",
            },
            {
                "阶段": "阶段D 7月下改善",
                "区间": "7.20→7.27",
                "推广后变化": store.loc[store["周次"] == "7.27-8.2", "推广后利润"].iloc[0]
                - store.loc[store["周次"] == "7.20-7.26", "推广后利润"].iloc[0],
                "主因": "本期改善",
                "说明": "短暂修复",
            },
            {
                "阶段": "阶段E 8月初再降",
                "区间": "7.27→8.3",
                "推广后变化": store.loc[store["周次"] == "8.3-8.9", "推广后利润"].iloc[0]
                - store.loc[store["周次"] == "7.27-8.2", "推广后利润"].iloc[0],
                "主因": "主要是推广费上升",
                "说明": "销量/推广前上升，但推广费升更快",
            },
        ]
    )

    t0, t_best, t_713, t_720, t_727 = [
        tot.loc[w] for w in ["5.11-5.17", "7.6-7.12", "7.13-7.19", "7.20-7.26", "7.27-8.2"]
    ]
    top3 = drag.head(3)

    # styles
    thin = Border(
        left=Side(style="thin", color="D0D0D0"),
        right=Side(style="thin", color="D0D0D0"),
        top=Side(style="thin", color="D0D0D0"),
        bottom=Side(style="thin", color="D0D0D0"),
    )
    hf = PatternFill("solid", fgColor="1F4E79")
    hfont = Font(color="FFFFFF", bold=True, name="微软雅黑", size=11)
    bfont = Font(name="微软雅黑", size=10)
    tfont = Font(bold=True, name="微软雅黑", size=14, color="1F4E79")
    sfont = Font(bold=True, name="微软雅黑", size=12, color="1F4E79")
    neg = PatternFill("solid", fgColor="FCE4D6")
    pos = PatternFill("solid", fgColor="E2EFDA")
    alt = PatternFill("solid", fgColor="F7F7F7")
    styles = (hf, hfont, bfont, thin, neg, pos, alt)

    wb = Workbook()
    ws = wb.active
    ws.title = "01-汇报摘要"
    ws["A1"] = "天猫利润分析 · 领导一页纸"
    ws["A1"].font = tfont
    ws["A2"] = "口径：ID周损益｜推广后净利润｜5.11–8.2"
    ws["A2"].font = Font(name="微软雅黑", size=10, color="666666")
    ws["A4"] = "一句话"
    ws["A4"].font = sfont
    ws["A5"] = "亏在大链接：量掉的时候利润掉，量回来时又被推广费吃掉；大大包不是主因。"
    ws["A5"].font = Font(bold=True, name="微软雅黑", size=12, color="C00000")
    ws["A5"].alignment = Alignment(wrap_text=True, vertical="center")
    ws.row_dimensions[5].height = 28

    ws["A7"] = "核心结论"
    ws["A7"].font = sfont
    conclusions = [
        ("结论1", "近三个月一直在亏；最好一周是7.6（约-4100），之后又往下掉。"),
        (
            "结论2",
            "这波回落不是大大包的问题，主责在大链接：先是袋面主链销量掉，后是袋面次链推广加太猛。",
        ),
        (
            "结论3",
            "结构上，袋面主/次链 + 杯面主链长期贡献大部分亏损；巴东新链接也在持续失血。",
        ),
        (
            "结论4",
            "要抓三件事：控主链投产、砍低效推广、巴东减投验证；大大包只控推广侵蚀即可。",
        ),
    ]
    ws["A8"] = "序号"
    ws["B8"] = "结论"
    style_header_row(ws, 8, 2, hf, hfont, thin)
    for i, (a, b) in enumerate(conclusions, 9):
        ws.cell(i, 1, a).font = bfont
        ws.cell(i, 1).border = thin
        cell = ws.cell(i, 2, b)
        cell.font = bfont
        cell.border = thin
        cell.alignment = Alignment(wrap_text=True, vertical="center")
        ws.row_dimensions[i].height = 32
    ws.column_dimensions["A"].width = 12
    ws.column_dimensions["B"].width = 88

    ws["A14"] = "请拍板"
    ws["A14"].font = sfont
    advices = [
        "① 立刻复盘袋面主链接：成交为何掉、推广前利润为何掉。",
        "② 压降袋面次链接、30包等低效花费，先把费率打下来。",
        "③ 巴东链接减投/停投一周看结果。",
        "④ 大大包保留自然利润，严控加投。",
    ]
    for i, t in enumerate(advices, 15):
        ws.cell(i, 1, t).font = bfont

    ws["A20"] = "附表：ID周合计（备查）"
    ws["A20"].font = Font(name="微软雅黑", size=10, color="666666")
    sum_tbl = tot.reset_index()[
        [
            "周次",
            "成交金额",
            "推广前利润",
            "推广花费",
            "推广后利润",
            "环比_推广后",
            "环比_推广前",
            "环比_推广费",
            "推广费率",
            "下降主因",
        ]
    ]
    write_df(
        ws,
        sum_tbl,
        start_row=21,
        money_cols={
            "成交金额",
            "推广前利润",
            "推广花费",
            "推广后利润",
            "环比_推广后",
            "环比_推广前",
            "环比_推广费",
            "推广费率",
        },
        freeze=False,
        styles=styles,
    )

    ws = wb.create_sheet("02-ID周趋势")
    ws["A1"] = "ID周损益合计趋势（正确单周，已拆分7.20/7.27）"
    ws["A1"].font = tfont
    write_df(
        ws,
        sum_tbl,
        start_row=3,
        money_cols={
            "成交金额",
            "推广前利润",
            "推广花费",
            "推广后利润",
            "环比_推广后",
            "环比_推广前",
            "环比_推广费",
            "推广费率",
        },
        styles=styles,
    )

    ws = wb.create_sheet("03-阶段一_7.6到7.13")
    ws["A1"] = "阶段一：7.6-7.12 → 7.13-7.19｜主因：推广前利润下降"
    ws["A1"].font = tfont
    ws["A2"] = (
        f"整体：推广后 {t_best['推广后利润']:,.0f} → {t_713['推广后利润']:,.0f}"
        f"（{t_713['环比_推广后']:+,.0f}）；推广前 {t_713['环比_推广前']:+,.0f}；"
        f"推广费 {t_713['环比_推广费']:+,.0f}"
    )
    ws["A2"].font = bfont
    d1 = drag[
        [
            "商品ID",
            "定位",
            "商品名称",
            "推广后_7.6",
            "推广后_7.13",
            "推广后变化",
            "推广前变化",
            "推广费变化",
            "主因",
        ]
    ].copy()
    d1.insert(0, "排名", range(1, len(d1) + 1))
    write_df(
        ws,
        d1,
        start_row=4,
        money_cols={"推广后_7.6", "推广后_7.13", "推广后变化", "推广前变化", "推广费变化"},
        styles=styles,
    )
    ws["A16"] = "改善TOP5"
    ws["A16"].font = sfont
    imp = improve[
        [
            "商品ID",
            "定位",
            "商品名称",
            "推广后_7.6",
            "推广后_7.13",
            "推广后变化",
            "推广前变化",
            "推广费变化",
            "主因",
        ]
    ].copy()
    imp.insert(0, "排名", range(1, len(imp) + 1))
    write_df(
        ws,
        imp,
        start_row=17,
        money_cols={"推广后_7.6", "推广后_7.13", "推广后变化", "推广前变化", "推广费变化"},
        freeze=False,
        styles=styles,
    )

    ws = wb.create_sheet("04-阶段二_7.13到7.20")
    ws["A1"] = "阶段二：7.13-7.19 → 7.20-7.26｜更突出：推广费上升"
    ws["A1"].font = tfont
    ws["A2"] = (
        f"整体：推广后 {t_713['推广后利润']:,.0f} → {t_720['推广后利润']:,.0f}"
        f"（{t_720['环比_推广后']:+,.0f}）；推广前 {t_720['环比_推广前']:+,.0f}；"
        f"推广费 {t_720['环比_推广费']:+,.0f}"
    )
    ws["A2"].font = bfont
    d2 = drag2[
        [
            "商品ID",
            "定位",
            "商品名称",
            "推广后_7.13",
            "推广后_7.20",
            "推广后变化",
            "推广前变化",
            "推广费变化",
            "主因",
        ]
    ].copy()
    d2.insert(0, "排名", range(1, len(d2) + 1))
    write_df(
        ws,
        d2,
        start_row=4,
        money_cols={"推广后_7.13", "推广后_7.20", "推广后变化", "推广前变化", "推广费变化"},
        styles=styles,
    )

    ws = wb.create_sheet("05-原味大大专题")
    ws["A1"] = "原味大大包专题（品名含“大大”或定位原味大包/大大；已排除巴东与明显串品）"
    ws["A1"].font = tfont
    dw = dada_week.dropna(how="all").reset_index()
    write_df(
        ws,
        dw,
        start_row=3,
        money_cols={"成交金额", "推广前利润", "推广花费", "推广后利润", "推广侵蚀"},
        styles=styles,
    )
    ws["A15"] = "明细（ID×周）"
    ws["A15"].font = sfont
    dada_detail = dada[
        [
            "周次",
            "商品ID",
            "定位",
            "商品名称",
            "成交金额",
            "净利润(推广前)",
            "推广总花费",
            "净利润(推广后)",
        ]
    ].sort_values(["周次", "商品ID"])
    dada_detail = dada_detail.rename(
        columns={
            "净利润(推广前)": "推广前利润",
            "推广总花费": "推广花费",
            "净利润(推广后)": "推广后利润",
        }
    )
    write_df(
        ws,
        dada_detail,
        start_row=16,
        money_cols={"成交金额", "推广前利润", "推广花费", "推广后利润"},
        freeze=False,
        styles=styles,
    )

    ws = wb.create_sheet("06-各周亏损TOP5")
    ws["A1"] = "各周绝对亏损TOP5（ID口径）"
    ws["A1"].font = tfont
    write_df(
        ws,
        top5,
        start_row=3,
        money_cols={"净利润(推广后)", "成交金额", "占当周推广后利润%"},
        styles=styles,
    )

    ws = wb.create_sheet("07-全量ID每周净利润")
    ws["A1"] = "全量商品ID · 每周推广后净利润（变化列已按行重算，无错位）"
    ws["A1"].font = tfont
    write_df(ws, mat, start_row=3, money_cols=set(WEEKS + ["7.6→7.13变化"]), styles=styles)
    ws.auto_filter.ref = ws.dimensions

    ws = wb.create_sheet("08-店铺周报附录")
    ws["A1"] = "附录：天猫旗舰店周报（店铺口径，含完整13周；勿与ID成交直接混比）"
    ws["A1"].font = tfont
    ws["A2"] = "推广前利润可用订单源核对（店铺=天猫旗舰店；状态=已发货/已签收/待发货）"
    ws["A2"].font = bfont
    store_out = store[
        [
            "周次",
            "GMV",
            "去退金额",
            "推广前利润",
            "推广前环比",
            "推广投入",
            "推广费环比",
            "推广后利润",
            "推广后环比",
            "推广费率",
        ]
    ].copy()
    store_out["下降主因"] = [
        driver_label(p, a, aft)
        for p, a, aft in zip(
            store_out["推广前环比"], store_out["推广费环比"], store_out["推广后环比"]
        )
    ]
    write_df(
        ws,
        store_out,
        start_row=4,
        money_cols={
            "GMV",
            "去退金额",
            "推广前利润",
            "推广前环比",
            "推广投入",
            "推广费环比",
            "推广后利润",
            "推广后环比",
            "推广费率",
        },
        styles=styles,
    )
    ws["A20"] = "五阶段（店铺口径）"
    ws["A20"].font = sfont
    write_df(ws, phases, start_row=21, money_cols={"推广后变化"}, freeze=False, styles=styles)

    ws = wb.create_sheet("09-口径说明")
    ws["A1"] = "口径、数据范围与修订说明"
    ws["A1"].font = tfont
    notes = [
        ["项目", "说明"],
        ["主口径", "ID周损益合并表：天猫ID周损益_合并.xlsx（由9个周xlsx周次工作表合并）"],
        [
            "主指标",
            "默认关注净利润(推广后)；并用净利润(推广前)、推广总花费做拆解：推广后变化≈推广前变化−推广费变化",
        ],
        [
            "周次",
            "仅使用单周：5.11-5.17、5.25-5.31、6.15-6.21、6.22-6.28、6.29-7.5、7.6-7.12、7.13-7.19、7.20-7.26、7.27-8.2",
        ],
        ["已修正", "不再把7.20-8.2两周合计与单周环比；7.6-7.12/7.27-8.2以文件名为准校正日期"],
        ["已修正", "全量明细“7.6→7.13变化”按每行重算，避免错位"],
        ["大大包", "品名含大大，或定位为原味大包/大大；排除品名含巴东；排除明显串品"],
        ["店铺附录", "旗舰店周报近3个月完整周；与ID成交存在口径差，只作对照"],
        ["相对旧版", "替换含糊结论；统一工作表编号；店/ID分表；阶段一二拆解完整"],
    ]
    for i, row in enumerate(notes, 3):
        for j, v in enumerate(row, 1):
            cell = ws.cell(i, j, v)
            cell.font = hfont if i == 3 else bfont
            cell.border = thin
            if i == 3:
                cell.fill = hf
    ws.column_dimensions["A"].width = 14
    ws.column_dimensions["B"].width = 110

    # sanity
    d_main = mat.loc[mat["商品ID"] == "668566625747", "7.6→7.13变化"].iloc[0]
    d_sec = mat.loc[mat["商品ID"] == "649361890551", "7.6→7.13变化"].iloc[0]
    assert abs(d_main - (-667)) < 2, d_main
    assert abs(d_sec - 361) < 2, d_sec

    paths = [
        OUT / "天猫利润分析_干净汇报版.xlsx",
        COPY / "天猫利润分析_干净汇报版.xlsx",
        OUT / "天猫利润分析.xlsx",
        COPY / "天猫利润分析.xlsx",
    ]
    for p in paths:
        wb.save(p)

    md = f"""# 天猫利润分析（干净汇报版）

**主口径**：ID周损益｜推广后净利润｜5.11–8.2（9个单周）

## 核心结论
1. 最好周 **7.6-7.12（{t_best['推广后利润']:,.0f}）**，之后 7.13（{t_713['环比_推广后']:+,.0f}）、7.20（{t_720['环比_推广后']:+,.0f}）连续回落。
2. **7.6→7.13** 主因推广前利润下降。TOP3：{top3.iloc[0]['定位']} {top3.iloc[0]['推广后变化']:+.0f}；{top3.iloc[1]['定位']} {top3.iloc[1]['推广后变化']:+.0f}；{top3.iloc[2]['定位']} {top3.iloc[2]['推广后变化']:+.0f}。
3. **7.13→7.20** 更突出推广费上升，最大拖累 {drag2.iloc[0]['定位']}（{drag2.iloc[0]['推广后变化']:+.0f}）。
4. 绝对亏损长期集中在袋面主/次链、杯面主链；巴东持续亏损。大大包非第一责任。
5. 5.11→7.27 整段成交约 {(t_727['成交金额']/t0['成交金额']-1)*100:+.1f}%，推广后亏损略收窄，不是整段“量增利降”。

文件：`天猫利润分析_干净汇报版.xlsx` / `天猫利润分析.xlsx`
"""
    (OUT / "天猫利润分析_干净汇报版.md").write_text(md, encoding="utf-8")
    (COPY / "天猫利润分析_干净汇报版.md").write_text(md, encoding="utf-8")
    print(md)
    print("saved", paths[0], paths[0].stat().st_size)
    print("delta sanity OK", float(d_main), float(d_sec))


if __name__ == "__main__":
    main()
