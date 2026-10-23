#!/usr/bin/env python3
"""Build dashboard/data.js from the Tmall weekly P&L files in this repo."""

import csv
import json
from collections import defaultdict
from datetime import datetime, date
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "新建文件夹 (2)"
OUT = Path(__file__).resolve().parent / "data.js"

WEEKS = [
    ("5.11–5.17", "天猫ID周损益_5.11-5.17.csv", "2026-05-11", "2026-05-17", None),
    ("5.25–5.31", "天猫ID周损益_5.25-5.31.csv", "2026-05-25", "2026-05-31", "与上一周之间缺 5.18–5.24"),
    ("6.15–6.21", "天猫，ID周损益_6.15-6.21.csv", "2026-06-15", "2026-06-21", "与上一周之间缺 6.01–6.14"),
    ("6.22–6.28", "天猫ID周损益6.22-6.28.csv", "2026-06-22", "2026-06-28", None),
    ("6.29–7.5", "天猫ID周损益_6.29-7.5.csv", "2026-06-29", "2026-07-05", None),
    (
        "7.6–7.12",
        "天猫ID周损益_7.6-7.12.csv",
        "2026-07-06",
        "2026-07-12",
        "文件名是 7.6–7.12，表内日期列误写为 6.29-7.5，这里按文件名归周",
    ),
    ("7.13–7.19", "天猫ID周损益_7.13-7.19.csv", "2026-07-13", "2026-07-19", None),
    (
        "7.27–8.2",
        "天猫ID周损益_7.27-8.2.csv",
        "2026-07-27",
        "2026-08-02",
        "文件名是 7.27–8.2，表内日期列写为 7.20-8.2；与订单表对齐时采用文件名",
    ),
]

# Same population as the workbook's 字段复核 sheet: shipped or signed orders,
# including shipped refunds that already consumed cost. Unpaid cancels and
# refunds before shipment are left out. 商家实收 stays 115,659 because those
# shipped refunds have zero receipts; 总成本 / 推广前利润 pick up their loss.
VALID_STATUS = {"已发货，待签收", "已签收", "已签收，退款成功", "已发货，退款成功"}


def parse_num(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace("￥", "").replace(",", "").replace("%", "").replace(" ", "")
    if text in ("", "-", "—", "/", "None", "null"):
        return None
    try:
        return float(text)
    except ValueError:
        return None


def money(value):
    if value is None:
        return 0.0
    return round(float(value), 2)


def ratio(part, whole):
    if not whole:
        return None
    return round(part / whole * 100, 2)


def roi(sales, spend):
    if not spend:
        return None
    return round(sales / spend, 2)


def bucket(role):
    name = (role or "").strip()
    if name == "袋面主链接":
        return "袋面主链接"
    if name == "袋面次链接":
        return "袋面次链接"
    if "杯" in name:
        return "杯面"
    if any(token in name for token in ("30包", "24包", "24/30", "15包", "20包", "12包", "原味大包", "大大")):
        return "整箱/大包"
    if "U选" in name:
        return "天猫U选"
    return "口味与组合"


def load_week(label, filename, start, end, note):
    path = SRC / filename
    with path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    header = [cell.replace("\n", "").strip() for cell in rows[0]]
    skus = []
    for raw in rows[1:]:
        if not raw or not any(cell.strip() for cell in raw):
            continue
        record = {header[i]: raw[i].strip() if i < len(raw) else "" for i in range(len(header))}
        if record.get("日期") == "总计" or not record.get("商品ID"):
            continue
        sku = {
            "id": record["商品ID"],
            "role": record.get("定位", ""),
            "name": record.get("商品名称", ""),
            "group": bucket(record.get("定位", "")),
            "gmv": money(parse_num(record.get("成交金额"))),
            "net": money(parse_num(record.get("去税金额"))),
            "qty": money(parse_num(record.get("成交件数"))),
            "asp": money(parse_num(record.get("件单价"))),
            "wxtSpend": money(parse_num(record.get("万相台花费"))),
            "wxtSales": money(parse_num(record.get("万相台成交"))),
            "wxtRoi": parse_num(record.get("万相台ROI")),
            "pxbSpend": money(parse_num(record.get("品销宝花费"))),
            "pxbSales": money(parse_num(record.get("品销宝成交"))),
            "pxbRoi": parse_num(record.get("品销宝ROI")),
            "adSpend": money(parse_num(record.get("推广总花费"))),
            "adSales": money(parse_num(record.get("推广总成交"))),
            "organic": money(parse_num(record.get("日销成交"))),
            "other": money(parse_num(record.get("其他费用"))),
            "profitBefore": money(parse_num(record.get("净利润(推广前)"))),
            "profitAfter": money(parse_num(record.get("净利润(推广后)"))),
        }
        sku["wxtRoi"] = None if sku["wxtRoi"] is None else round(sku["wxtRoi"], 2)
        sku["pxbRoi"] = None if sku["pxbRoi"] is None else round(sku["pxbRoi"], 2)
        sku["marginBefore"] = ratio(sku["profitBefore"], sku["net"])
        sku["marginAfter"] = ratio(sku["profitAfter"], sku["net"])
        sku["adRoi"] = roi(sku["adSales"], sku["adSpend"])
        skus.append(sku)

    def total(key):
        return round(sum(item[key] for item in skus), 2)

    gmv = total("gmv")
    net = total("net")
    ad_spend = total("adSpend")
    ad_sales = total("adSales")
    wxt_spend = total("wxtSpend")
    wxt_sales = total("wxtSales")
    pxb_spend = total("pxbSpend")
    pxb_sales = total("pxbSales")
    organic = total("organic")
    profit_before = total("profitBefore")
    profit_after = total("profitAfter")
    ranked = sorted(skus, key=lambda item: item["gmv"], reverse=True)
    top3 = sum(item["gmv"] for item in ranked[:3])
    main = sum(item["gmv"] for item in skus if item["role"] == "袋面主链接")
    cup = sum(item["gmv"] for item in skus if item["role"] == "杯面主链接")
    groups = defaultdict(float)
    for item in skus:
        groups[item["group"]] += item["gmv"]
    group_rows = [
        {"name": name, "gmv": round(value, 2), "share": ratio(value, gmv)}
        for name, value in sorted(groups.items(), key=lambda pair: pair[1], reverse=True)
    ]
    totals = {
        "gmv": gmv,
        "net": net,
        "qty": total("qty"),
        "asp": round(gmv / total("qty"), 2) if total("qty") else None,
        "wxtSpend": wxt_spend,
        "wxtSales": wxt_sales,
        "wxtRoi": roi(wxt_sales, wxt_spend),
        "pxbSpend": pxb_spend,
        "pxbSales": pxb_sales,
        "pxbRoi": roi(pxb_sales, pxb_spend),
        "adSpend": ad_spend,
        "adSales": ad_sales,
        "adRoi": roi(ad_sales, ad_spend),
        "organic": organic,
        "other": total("other"),
        "profitBefore": profit_before,
        "profitAfter": profit_after,
        "marginBefore": ratio(profit_before, net),
        "marginAfter": ratio(profit_after, net),
        "adRate": ratio(ad_spend, gmv),
        "otherRate": ratio(total("other"), net),
        "organicShare": ratio(organic, gmv),
        "wxtCover": ratio(wxt_sales, gmv),
        "adCover": ratio(ad_sales, gmv),
        "mainShare": ratio(main, gmv),
        "cupShare": ratio(cup, gmv),
        "top3Share": ratio(top3, gmv),
        "skuCount": len(skus),
    }
    return {
        "label": label,
        "file": filename,
        "start": start,
        "end": end,
        "note": note,
        "totals": totals,
        "groups": group_rows,
        "skus": ranked,
    }


def as_date(value):
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    if not text:
        return None
    return text[:10]


def load_orders():
    path = SRC / "天猫周报数据_7.27-8.2两家店.xlsx"
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = workbook["周报数据_7.27-8.2"]
    iterator = sheet.iter_rows(values_only=True)
    headers = [str(cell).strip() if cell is not None else "" for cell in next(iterator)]
    index = {name: position for position, name in enumerate(headers)}

    def cell(row, name):
        return row[index[name]]

    def amount(row, name):
        return money(parse_num(cell(row, name)) or 0)

    daily = defaultdict(
        lambda: {
            "flagship": 0.0,
            "taobao": 0.0,
            "qtyFlagship": 0.0,
            "qtyTaobao": 0.0,
            "profitFlagship": 0.0,
            "profitTaobao": 0.0,
            "costFlagship": 0.0,
            "costTaobao": 0.0,
        }
    )
    provinces = defaultdict(lambda: {"flagship": 0.0, "taobao": 0.0})
    series = defaultdict(lambda: {"flagship": 0.0, "taobao": 0.0})
    categories = defaultdict(lambda: {"flagship": 0.0, "taobao": 0.0})
    shops = {
        "天猫旗舰店": defaultdict(float),
        "天猫淘宝店": defaultdict(float),
    }
    status_counts = defaultdict(int)
    rows_out = []
    dates = []

    for row in iterator:
        status = str(cell(row, "订单状态") or "")
        status_counts[status] += 1
        shop = str(cell(row, "店铺") or "")
        shop_key = "flagship" if shop == "天猫旗舰店" else "taobao"
        pay_day = as_date(cell(row, "支付时间"))
        record = [
            "旗舰店" if shop == "天猫旗舰店" else "淘宝店",
            str(cell(row, "商品ID") or ""),
            str(cell(row, "商品标题") or ""),
            str(cell(row, "品类") or ""),
            str(cell(row, "系列") or ""),
            str(cell(row, "省") or "").strip(),
            status,
            int(parse_num(cell(row, "购买数量")) or 0),
            amount(row, "买家实付金额"),
            amount(row, "商家实收"),
            amount(row, "总成本"),
            amount(row, "推广前利润"),
            pay_day or "",
        ]
        rows_out.append(record)
        if status not in VALID_STATUS:
            continue
        if shop not in shops:
            continue
        bucket_shop = shops[shop]
        qty = parse_num(cell(row, "购买数量")) or 0
        recv = amount(row, "商家实收")
        bucket_shop["orders"] += 1
        bucket_shop["qty"] += qty
        bucket_shop["pay"] += amount(row, "买家实付金额")
        bucket_shop["recv"] += recv
        bucket_shop["net"] += amount(row, "去税收入")
        bucket_shop["cost"] += amount(row, "总成本")
        bucket_shop["profit"] += amount(row, "推广前利润")
        bucket_shop["platform"] += amount(row, "平台费")
        bucket_shop["ops"] += amount(row, "代运营费")
        bucket_shop["pack"] += amount(row, "包材运")
        bucket_shop["logistics"] += amount(row, "物流费")
        bucket_shop["admin"] += amount(row, "管理费")
        if pay_day:
            dates.append(pay_day)
            daily[pay_day][shop_key] += recv
            daily[pay_day]["qty" + ("Flagship" if shop_key == "flagship" else "Taobao")] += qty
            daily[pay_day]["profit" + ("Flagship" if shop_key == "flagship" else "Taobao")] += amount(row, "推广前利润")
            daily[pay_day]["cost" + ("Flagship" if shop_key == "flagship" else "Taobao")] += amount(row, "总成本")
        province = str(cell(row, "省") or "").strip() or "未知"
        provinces[province][shop_key] += recv
        series_name = str(cell(row, "系列") or "").strip() or "未分类"
        series[series_name][shop_key] += recv
        category = str(cell(row, "品类") or "").strip() or "未分类"
        categories[category][shop_key] += recv

    workbook.close()

    def pack_shop(name):
        raw = shops[name]
        recv = raw["recv"]
        return {
            "name": name,
            "orders": int(raw["orders"]),
            "qty": int(round(raw["qty"])),
            "pay": round(raw["pay"], 2),
            "recv": round(recv, 2),
            "net": round(raw["net"], 2),
            "cost": round(raw["cost"], 2),
            "profit": round(raw["profit"], 2),
            "margin": ratio(raw["profit"], raw["net"]),
            "platform": round(raw["platform"], 2),
            "ops": round(raw["ops"], 2),
            "pack": round(raw["pack"], 2),
            "logistics": round(raw["logistics"], 2),
            "admin": round(raw["admin"], 2),
        }

    shop_rows = [pack_shop("天猫旗舰店"), pack_shop("天猫淘宝店")]
    combined = {}
    for key in ("orders", "qty", "pay", "recv", "net", "cost", "profit", "platform", "ops", "pack", "logistics", "admin"):
        combined[key] = round(sum(item[key] for item in shop_rows), 2)
    combined["orders"] = int(combined["orders"])
    combined["qty"] = int(combined["qty"])
    combined["margin"] = ratio(combined["profit"], combined["net"])

    def split_rows(mapping, limit=None):
        items = []
        for name, value in mapping.items():
            total = value["flagship"] + value["taobao"]
            items.append(
                {
                    "name": name,
                    "flagship": round(value["flagship"], 2),
                    "taobao": round(value["taobao"], 2),
                    "total": round(total, 2),
                }
            )
        items.sort(key=lambda item: item["total"], reverse=True)
        if limit:
            return items[:limit]
        return items

    daily_rows = []
    for day in sorted(daily):
        value = daily[day]
        daily_rows.append(
            {
                "date": day,
                "flagship": round(value["flagship"], 2),
                "taobao": round(value["taobao"], 2),
                "qtyFlagship": int(round(value["qtyFlagship"])),
                "qtyTaobao": int(round(value["qtyTaobao"])),
                "profitFlagship": round(value["profitFlagship"], 2),
                "profitTaobao": round(value["profitTaobao"], 2),
                "costFlagship": round(value["costFlagship"], 2),
                "costTaobao": round(value["costTaobao"], 2),
            }
        )

    print(
        "ORDER recv",
        combined["recv"],
        "net",
        combined["net"],
        "profit",
        combined["profit"],
        "cost",
        combined["cost"],
        "platform",
        combined["platform"],
        "pack",
        combined["pack"],
    )
    print("dates", dates and min(dates), dates and max(dates), "days", len(daily_rows))
    print("status", dict(status_counts))
    print("top provinces", [item["name"] for item in split_rows(provinces, 8)])
    print("top series", [item["name"] for item in split_rows(series, 8)])

    return {
        "rangeLabel": "7.27–8.2",
        "start": min(dates) if dates else None,
        "end": max(dates) if dates else None,
        "file": "天猫周报数据_7.27-8.2两家店.xlsx",
        "validStatuses": sorted(VALID_STATUS),
        "statusCounts": [{"name": name, "count": count} for name, count in sorted(status_counts.items(), key=lambda item: -item[1])],
        "shops": shop_rows,
        "total": combined,
        "daily": daily_rows,
        "provinces": split_rows(provinces, 8),
        "series": split_rows(series, 6),
        "categories": split_rows(categories),
        "columns": ["店铺", "商品ID", "商品标题", "品类", "系列", "省", "订单状态", "件数", "买家实付", "商家实收", "总成本", "推广前利润", "支付日"],
        "rows": rows_out,
    }


def main():
    weeks = [load_week(*item) for item in WEEKS]
    for week in weeks:
        totals = week["totals"]
        print(
            week["label"],
            "gmv",
            round(totals["gmv"]),
            "margin",
            totals["marginBefore"],
            "after",
            totals["marginAfter"],
            "roi",
            totals["adRoi"],
            "wxt",
            totals["wxtCover"],
            "main",
            totals["mainShare"],
            "top3",
            totals["top3Share"],
            "groups",
            [(item["name"], item["share"]) for item in week["groups"]],
        )
    orders = load_orders()
    payload = {
        "brand": "营多捞面 · 天猫",
        "generatedFrom": "仓库内周损益 CSV 与双店订单表",
        "weeks": weeks,
        "orders": orders,
        "definitions": {
            "margin": "净利率 = 净利润 ÷ 去税金额",
            "rate": "推广费率、日销占比、成交覆盖 = 对应金额 ÷ 成交金额",
            "roi": "ROI = 渠道成交 ÷ 渠道花费",
            "orders": "双店仪表盘与字段复核同口径：已发货待签收、已签收、已签收退款成功、已发货退款成功。未支付取消和未发货退款不计入。",
        },
    }
    OUT.write_text("window.DASHBOARD_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print("wrote", OUT, "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
