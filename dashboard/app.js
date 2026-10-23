(function () {
  const DATA = window.DASHBOARD_DATA;
  const stage = document.getElementById("stage");
  const art = document.getElementById("art");
  const tip = document.getElementById("tip");
  const frame = document.getElementById("frame");
  const viewport = document.getElementById("viewport");

  if (!DATA) {
    stage.textContent = "缺少 data.js";
    return;
  }

  const PNL_STATUS = new Set(["已发货，待签收", "已签收", "已签收，退款成功", "已发货，退款成功"]);
  const state = {
    page: "overview",
    week: DATA.weeks.length - 1,
    shop: "all",
    skuQuery: "",
    skuWeek: "all",
    skuSort: { key: "gmv", dir: -1 },
    skuPage: 0,
    orderQuery: "",
    orderShop: "all",
    orderStatus: "pnl",
    orderSort: { key: "recv", dir: -1 },
    orderPage: 0,
  };

  const GROUP_COLOR = {
    袋面主链接: "#e879f9",
    "整箱/大包": "#a78bfa",
    杯面: "#818cf8",
    袋面次链接: "#f0abfc",
    口味与组合: "#67e8f9",
    天猫U选: "#fb7185",
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function yuan(value) {
    if (value == null || Number.isNaN(value)) return "—";
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);
    const digits = abs !== 0 && abs < 1000 ? 2 : 0;
    const body = abs.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
    return sign + "¥" + body;
  }

  function wan(value) {
    if (value == null || Number.isNaN(value)) return "—";
    const sign = value < 0 ? "-" : "";
    return sign + (Math.abs(value) / 10000).toFixed(1) + "万";
  }

  function pct(value, digits) {
    if (value == null || Number.isNaN(value)) return "—";
    const d = digits == null ? 1 : digits;
    return value.toFixed(d) + "%";
  }

  function num(value, digits) {
    if (value == null || Number.isNaN(value)) return "—";
    return Number(value).toLocaleString("zh-CN", {
      minimumFractionDigits: digits || 0,
      maximumFractionDigits: digits || 0,
    });
  }

  function zhDate(iso) {
    if (!iso) return "";
    const parts = iso.split("-");
    return Number(parts[1]) + "月" + Number(parts[2]) + "日";
  }

  function shortProv(name) {
    return String(name).replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区/g, "");
  }

  function tone(delta, higherIsBetter) {
    if (delta == null || Math.abs(delta) < 0.005) return "flat";
    const good = higherIsBetter ? delta > 0 : delta < 0;
    return good ? "good" : "bad";
  }

  function deltaText(current, previous, digits, suffix, higherIsBetter) {
    if (previous == null || current == null) return '<span class="delta flat">首个可比周</span>';
    const delta = current - previous;
    const cls = tone(delta, higherIsBetter);
    const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "·";
    const body = (delta > 0 ? "+" : "") + delta.toFixed(digits) + suffix;
    return '<span class="delta ' + cls + '">' + arrow + " " + body + " 较上周</span>";
  }

  function smoothPath(points) {
    if (!points.length) return "";
    let d = "M " + points[0].x + " " + points[0].y;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + p2.x + " " + p2.y;
    }
    return d;
  }

  function icon(name) {
    const paths = {
      overview: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
      stores: '<path d="M4 10h16v9H4z"/><path d="M3 10l2-6h14l2 6"/><path d="M9 19v-5h6v5"/>',
      table: '<path d="M4 5h16v14H4z"/><path d="M4 9h16M4 13h16M9 5v14"/>',
      orders: '<path d="M6 6h12l-1 13H7L6 6z"/><path d="M9 6V5a3 3 0 0 1 6 0v1"/>',
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + "</svg>";
  }

  function rail(active) {
    const items = [
      ["overview", "经营总览", "overview"],
      ["stores", "双店销售", "stores"],
      ["skus", "商品周损益", "table"],
      ["orders", "订单明细", "orders"],
    ];
    return (
      '<aside class="rail">' +
      '<div class="brand-mark" title="营多捞面">营</div>' +
      items
        .map(
          (item) =>
            '<button class="rail-btn' +
            (item[0] === active ? " is-active" : "") +
            '" data-nav="' +
            item[0] +
            '" aria-label="' +
            item[1] +
            '" title="' +
            item[1] +
            '">' +
            icon(item[2]) +
            "</button>"
        )
        .join("") +
      '<div class="rail-spacer"></div></aside>'
    );
  }

  function groupsFor(week) {
    const map = new Map();
    week.groups.forEach((group) => {
      const name = group.share < 1 ? "口味与组合" : group.name;
      map.set(name, (map.get(name) || 0) + group.gmv);
    });
    const total = week.totals.gmv || 1;
    return Array.from(map.entries())
      .map(([name, gmv]) => ({ name: name, gmv: gmv, share: (gmv / total) * 100 }))
      .sort((a, b) => b.gmv - a.gmv);
  }

  function comboChart(weeks, selected) {
    const width = 760;
    const height = 292;
    const left = 48;
    const right = 46;
    const top = 16;
    const bottom = 32;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const yMax = 150000;
    const yMinProfit = -10000;
    const yMaxProfit = 0;
    const slot = plotW / weeks.length;
    const barW = Math.min(46, slot * 0.56);
    const yG = (value) => top + plotH - (value / yMax) * plotH;
    const yP = (value) => top + plotH - ((value - yMinProfit) / (yMaxProfit - yMinProfit)) * plotH;
    const points = weeks.map((week, index) => ({
      x: left + slot * index + slot / 2,
      y: yP(week.totals.profitAfter),
      index: index,
    }));
    const grid = [0, 50000, 100000, 150000]
      .map((value) => {
        const y = yG(value);
        return (
          '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '" stroke="rgba(255,255,255,.08)"/>' +
          '<text x="' + (left - 8) + '" y="' + (y + 4) + '" fill="#b9b0d4" font-size="11" text-anchor="end">' +
          (value / 10000).toFixed(0) +
          "万</text>"
        );
      })
      .join("");
    const rightAxis = [0, -5000, -10000]
      .map((value) => {
        const y = yP(value);
        return (
          '<text x="' + (width - right + 8) + '" y="' + (y + 4) + '" fill="#7dd3fc" font-size="11">' +
          (value / 10000).toFixed(1) +
          "万</text>"
        );
      })
      .join("");
    const bars = weeks
      .map((week, index) => {
        const x = left + slot * index + (slot - barW) / 2;
        const y = yG(week.totals.gmv);
        const h = top + plotH - y;
        const on = index === selected;
        return (
          '<g data-tip="week" data-index="' + index + '" style="cursor:pointer">' +
          (on ? '<rect x="' + (x - 8) + '" y="' + top + '" width="' + (barW + 16) + '" height="' + plotH + '" rx="10" fill="rgba(255,255,255,.05)"/>' : "") +
          '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + Math.max(h, 0) + '" rx="8" fill="url(#barFill)" opacity="' + (on ? 1 : 0.78) + '"/>' +
          '<text x="' + (x + barW / 2) + '" y="' + (y - 6) + '" text-anchor="middle" fill="#f5f3ff" font-size="11">' +
          (week.totals.gmv / 10000).toFixed(1) +
          "</text>" +
          '<text x="' + (x + barW / 2) + '" y="' + (height - 10) + '" text-anchor="middle" fill="' + (on ? "#fff" : "#b9b0d4") + '" font-size="11">' +
          week.label.split("–")[0] +
          "</text></g>"
        );
      })
      .join("");
    const line = smoothPath(points);
    const dots = points
      .map((point) => {
        const selectedDot = point.index === selected;
        const label = selectedDot
          ? '<text x="' + (point.x - 8) + '" y="' + (point.y - 8) + '" text-anchor="end" fill="#a5f3fc" font-size="11">' + (weeks[point.index].totals.profitAfter / 10000).toFixed(2) + "万</text>"
          : "";
        return label + '<circle data-tip="week" data-index="' + point.index + '" cx="' + point.x + '" cy="' + point.y + '" r="' + (selectedDot ? 5.5 : 3.5) + '" fill="#e0f2fe" stroke="#67e8f9" stroke-width="2"/>';
      })
      .join("");
    return (
      '<svg viewBox="0 0 ' + width + " " + height + '" class="plot" role="img" aria-label="各周成交金额与推广后净利润">' +
      "<defs><linearGradient id=\"barFill\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
      '<stop offset="0" stop-color="#f5d0fe"/><stop offset="0.45" stop-color="#c026d3"/><stop offset="1" stop-color="#6d28d9"/>' +
      "</linearGradient></defs>" +
      grid +
      rightAxis +
      bars +
      '<path d="' + line + '" fill="none" stroke="#67e8f9" stroke-width="2.4"/>' +
      dots +
      "</svg>"
    );
  }

  function donut(id, percent, colors, caption) {
    const shown = Math.max(0, Math.min(percent || 0, 100));
    const radius = 42;
    const circ = 2 * Math.PI * radius;
    const dash = circ * (shown / 100);
    const label = percent == null ? "—" : Math.round(percent) + "%";
    return (
      '<div data-tip="donut" data-label="' + esc(caption.name) + '" data-value="' + esc(pct(percent, 1) + " · " + caption.amount) + '">' +
      '<svg viewBox="0 0 120 120" class="donut-svg" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + colors[0] + '"/><stop offset="1" stop-color="' + colors[1] + '"/>' +
      '</linearGradient></defs><circle class="donut-track" cx="60" cy="60" r="' + radius + '"/>' +
      '<circle class="donut-value" cx="60" cy="60" r="' + radius + '" stroke="url(#' + id + ')" stroke-dasharray="' + dash.toFixed(2) + " " + (circ - dash).toFixed(2) + '" transform="rotate(-90 60 60)"/>' +
      '<text class="donut-num" x="60" y="66">' + label + "</text></svg>" +
      '<div class="donut-cap">' + esc(caption.amount) + "</div>" +
      '<div class="donut-name">' + esc(caption.name) + "</div></div>"
    );
  }

  function fanSvg(groups) {
    const cx = 148;
    const cy = 176;
    const maxGmv = Math.max.apply(null, groups.map((group) => group.gmv));
    let angle = Math.PI;
    const slices = groups.map((group) => {
      const span = Math.PI * (group.share / 100);
      const outer = 48 + 92 * (group.gmv / maxGmv);
      const start = angle;
      angle += span;
      return { group: group, start: start, end: angle, outer: outer };
    });
    function pt(radius, radians) {
      return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
    }
    const paths = slices
      .map((slice) => {
        const large = slice.end - slice.start > Math.PI ? 1 : 0;
        const outerStart = pt(slice.outer, slice.start);
        const outerEnd = pt(slice.outer, slice.end);
        const innerEnd = pt(34, slice.end);
        const innerStart = pt(34, slice.start);
        const color = GROUP_COLOR[slice.group.name] || "#ddd";
        const d = [
          "M", outerStart[0], outerStart[1],
          "A", slice.outer, slice.outer, 0, large, 1, outerEnd[0], outerEnd[1],
          "L", innerEnd[0], innerEnd[1],
          "A", 34, 34, 0, large, 0, innerStart[0], innerStart[1],
          "Z",
        ].join(" ");
        return '<path data-tip="group" data-name="' + esc(slice.group.name) + '" data-share="' + slice.group.share.toFixed(1) + '" data-gmv="' + Math.round(slice.group.gmv) + '" d="' + d + '" fill="' + color + '" opacity="0.95"><title>' + esc(slice.group.name) + "</title></path>";
      })
      .join("");
    return '<svg viewBox="0 0 300 198" class="plot" role="img" aria-label="本周成交结构">' + paths + "</svg>";
  }

  function ringsSvg(items) {
    const center = 108;
    const radii = [88, 70, 52, 34];
    const arcs = items
      .map((item, index) => {
        const radius = radii[index];
        const circ = 2 * Math.PI * radius;
        const portion = Math.max(0, Math.min(item.value || 0, 100)) / 100;
        return (
          '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="9"/>' +
          '<circle data-tip="ring" data-name="' + esc(item.name) + '" data-value="' + esc(pct(item.value, 1)) + '" cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="' + item.color + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (circ * portion).toFixed(2) + " " + (circ * (1 - portion)).toFixed(2) + '" transform="rotate(-90 ' + center + " " + center + ')"/>'
        );
      })
      .join("");
    return '<svg viewBox="0 0 216 216" class="plot" role="img" aria-label="结构比率">' + arcs + "</svg>";
  }

  function overviewPage() {
    const week = DATA.weeks[state.week];
    const prev = state.week > 0 ? DATA.weeks[state.week - 1] : null;
    const totals = week.totals;
    const previous = prev && prev.totals;
    const groups = groupsFor(week);
    const top3Gmv = (totals.top3Share / 100) * totals.gmv;
    const pills = DATA.weeks
      .map(
        (item, index) =>
          '<button class="pill' + (index === state.week ? " is-on" : "") + '" data-week="' + index + '">' + item.label.split("–")[0] + "</button>"
      )
      .join("");
    const legend = groups
      .map(
        (group) =>
          '<div class="legend-row"><i class="swatch" style="background:' + (GROUP_COLOR[group.name] || "#ddd") + '"></i><span>' +
          esc(group.name) +
          "</span><b>" +
          pct(group.share, 1) +
          "</b></div>"
      )
      .join("");
    const ringItems = [
      { name: "袋面主链接占比", value: totals.mainShare, color: "#e879f9" },
      { name: "整箱/大包占比", value: groups.find((group) => group.name === "整箱/大包")?.share || 0, color: "#a78bfa" },
      { name: "推广费率", value: totals.adRate, color: "#67e8f9" },
      { name: "日销占比", value: totals.organicShare, color: "#fb7185" },
    ];
    const ringLegend = ringItems
      .map(
        (item) =>
          '<div class="legend-row"><i class="swatch" style="background:' + item.color + '"></i><span>' +
          esc(item.name) +
          "</span><b>" +
          pct(item.value, 1) +
          "</b></div>"
      )
      .join("");
    return (
      '<div class="page page-overview">' +
      '<section class="kpi-row">' +
      cardOverview(week) +
      cardMetrics("PROFITABILITY · 盈利能力", [
        [pct(totals.marginBefore), "推广前净利率", "metric-margin-before"],
        [pct(totals.marginAfter), "推广后净利率"],
        [yuan(totals.profitBefore), "推广前利润"],
      ], deltaText(totals.marginBefore, previous && previous.marginBefore, 2, " pt", true)) +
      cardMetrics("EFFICIENCY · 推广效率", [
        [totals.adRoi == null ? "—" : totals.adRoi.toFixed(2), "推广 ROI", "metric-ad-roi"],
        [totals.wxtRoi == null ? "—" : totals.wxtRoi.toFixed(2), "万相台 ROI"],
        [pct(totals.adRate), "推广费率"],
      ], deltaText(totals.adRoi, previous && previous.adRoi, 2, "", true)) +
      '<article class="card card-pad card-accent">' +
      '<div class="kicker">MIX · 链接健康</div>' +
      '<div class="hero-num">' + pct(totals.mainShare) + "</div>" +
      '<div class="metric-label">主链接占比</div>' +
      '<div class="metric-list">' +
      metricLine(pct(totals.top3Share), "前三链接") +
      metricLine(pct(totals.organicShare), "日销占比") +
      "</div>" +
      deltaText(totals.mainShare, previous && previous.mainShare, 1, " pt", true) +
      "</article></section>" +
      '<section class="mid-row">' +
      '<article class="card card-pad">' +
      '<div><div class="kicker">WEEKLY RESULT · 成交与推广后利润</div>' +
      '<div class="footnote chart-note">柱是成交金额，左轴万元。青色线是推广后净利润，右轴。选中周的数字标在线上。这 8 周全部为负。</div>' +
      '<div class="pills">' + pills + "</div></div>" +
      '<div class="chart-body">' + comboChart(DATA.weeks, state.week) + "</div></article>" +
      '<article class="card card-pad">' +
      '<div class="kicker">SELECTED WEEK · ' + esc(week.label) + "</div>" +
      '<div class="donuts">' +
      donut("g1", totals.wxtCover, ["#67e8f9", "#6366f1"], { amount: wan(totals.wxtSales), name: "万相台覆盖" }) +
      donut("g2", totals.adCover, ["#fb7185", "#e879f9"], { amount: wan(totals.adSales), name: "推广覆盖" }) +
      donut("g3", totals.top3Share, ["#c4b5fd", "#7c3aed"], { amount: wan(top3Gmv), name: "前三集中" }) +
      "</div></article></section>" +
      '<section class="bot-row">' +
      '<article class="card card-pad"><div class="card-head"><div class="kicker">MIX · 成交结构</div><div class="footnote">' + esc(week.label) + " · 占成交金额</div></div>" +
      '<div class="split"><div>' + fanSvg(groups) + '</div><div class="legend">' + legend + "</div></div></article>" +
      '<article class="card card-pad"><div class="kicker">STRUCTURE · 结构比率</div>' +
      '<div class="split ring-split"><div>' + ringsSvg(ringItems) + '</div><div class="center-readout"><div class="footnote">推广后净利率</div>' +
      '<div class="hero-num" id="metric-margin-after">' + pct(totals.marginAfter) + "</div>" +
      deltaText(totals.marginAfter, previous && previous.marginAfter, 2, " pt", true) +
      '<div class="legend" style="margin-top:10px">' + ringLegend + "</div></div></div>" +
      '<div class="footnote">环长等于该项占成交金额的比例。净利率 = 净利润 ÷ 去税金额。' +
      (week.note ? " " + esc(week.note) + "。" : "") +
      "</div></article></section></div>"
    );
  }

  function cardOverview(week) {
    return (
      '<article class="card card-pad"><div class="icon-row"><span class="icon-badge">' + icon("overview") + '</span><div class="kicker">OVERVIEW · 经营总览</div></div>' +
      '<div class="week-name">' + esc(week.label) + "</div>" +
      '<div class="metric-list"><div class="metric-line"><span class="metric-label">在售链接</span><b>' + week.totals.skuCount + "</b></div>" +
      '<div class="metric-line"><span class="metric-label">成交金额</span><b id="metric-gmv">' + yuan(week.totals.gmv) + "</b></div></div>" +
      "</article>"
    );
  }

  function metricLine(value, label) {
    return '<div class="metric-line"><span class="metric-label">' + label + "</span><b>" + value + "</b></div>";
  }

  function cardMetrics(kicker, rows, delta) {
    const hero = rows[0];
    const rest = rows.slice(1).map((row) => metricLine(row[0], row[1])).join("");
    return (
      '<article class="card card-pad"><div class="kicker">' + kicker + "</div>" +
      '<div class="hero-num"' + (hero[2] ? ' id="' + hero[2] + '"' : "") + ">" + hero[0] + "</div>" +
      '<div class="metric-label">' + hero[1] + "</div>" +
      '<div class="metric-list">' + rest + "</div>" + delta + "</article>"
    );
  }

  let sparkSeq = 0;
  function spark(values, color) {
    sparkSeq += 1;
    const gradientId = "spark" + sparkSeq;
    const width = 116;
    const height = 46;
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const span = max - min || 1;
    const points = values.map((value, index) => ({
      x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * (width - 6) + 3,
      y: height - 6 - ((value - min) / span) * (height - 14),
    }));
    const line = smoothPath(points);
    const area = line + " L " + points[points.length - 1].x + " " + height + " L " + points[0].x + " " + height + " Z";
    return (
      '<svg class="spark" viewBox="0 0 ' + width + " " + height + '" aria-hidden="true"><defs><linearGradient id="' + gradientId + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + color + '" stop-opacity="0.45"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + gradientId + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2"/></svg>'
    );
  }

  function storeSlice() {
    const orders = DATA.orders;
    const shopName = state.shop === "flagship" ? "天猫旗舰店" : "天猫淘宝店";
    const shop = orders.shops.find((item) => item.name === shopName);
    const daily = orders.daily;
    if (state.shop === "all") {
      return {
        label: "两家店",
        recv: orders.total.recv,
        qty: orders.total.qty,
        cost: orders.total.cost,
        profit: orders.total.profit,
        margin: orders.total.margin,
        orders: orders.total.orders,
        subRecv: "旗舰店占 " + pct((orders.shops[0].recv / orders.total.recv) * 100, 1),
        subQty: "旗舰店占 " + pct((orders.shops[0].qty / orders.total.qty) * 100, 1),
        subCost: "占去税收入 " + pct((orders.total.cost / orders.total.net) * 100, 1),
        subProfit: "推广前净利率 " + pct(orders.total.margin, 1),
        recvSeries: daily.map((day) => day.flagship + day.taobao),
        qtySeries: daily.map((day) => day.qtyFlagship + day.qtyTaobao),
        costSeries: daily.map((day) => day.costFlagship + day.costTaobao),
        profitSeries: daily.map((day) => day.profitFlagship + day.profitTaobao),
        lines: [
          { name: "旗舰店", color: "#5eead4", values: daily.map((day) => day.flagship) },
          { name: "淘宝店", color: "#f9a8d4", values: daily.map((day) => day.taobao) },
        ],
      };
    }
    const key = state.shop === "flagship" ? "Flagship" : "Taobao";
    const recvKey = state.shop;
    return {
      label: shop.name,
      recv: shop.recv,
      qty: shop.qty,
      cost: shop.cost,
      profit: shop.profit,
      margin: shop.margin,
      orders: shop.orders,
      subRecv: "占双店 " + pct((shop.recv / orders.total.recv) * 100, 1),
      subQty: "占双店 " + pct((shop.qty / orders.total.qty) * 100, 1),
      subCost: "占去税收入 " + pct((shop.cost / shop.net) * 100, 1),
      subProfit: "推广前净利率 " + pct(shop.margin, 1),
      recvSeries: daily.map((day) => day[recvKey]),
      qtySeries: daily.map((day) => day["qty" + key]),
      costSeries: daily.map((day) => day["cost" + key]),
      profitSeries: daily.map((day) => day["profit" + key]),
      lines: [{ name: shop.name.replace("天猫", ""), color: "#5eead4", values: daily.map((day) => day[recvKey]) }],
    };
  }

  function lineChart(days, lines) {
    const width = 700;
    const height = 280;
    const left = 46;
    const right = 16;
    const top = 16;
    const bottom = 28;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const max = Math.max.apply(null, lines.flatMap((line) => line.values));
    const yMax = Math.ceil(max / 2000) * 2000 || 2000;
    const y = (value) => top + plotH - (value / yMax) * plotH;
    const x = (index) => left + (days.length === 1 ? plotW / 2 : (index / (days.length - 1)) * plotW);
    const grid = [0, 0.5, 1]
      .map((step) => {
        const value = yMax * step;
        const yy = y(value);
        return '<line x1="' + left + '" y1="' + yy + '" x2="' + (width - right) + '" y2="' + yy + '" stroke="rgba(255,255,255,.08)"/>' +
          '<text x="' + (left - 6) + '" y="' + (yy + 4) + '" fill="#a7cdc6" font-size="11" text-anchor="end">' + (value / 10000).toFixed(1) + "万</text>";
      })
      .join("");
    const series = lines
      .map((line) => {
        const points = line.values.map((value, index) => ({ x: x(index), y: y(value), index: index, value: value }));
        const path = smoothPath(points);
        const dots = points
          .map(
            (point) =>
              '<circle data-tip="day" data-date="' + days[point.index].date + '" data-name="' + esc(line.name) + '" data-value="' + Math.round(point.value) + '" cx="' + point.x + '" cy="' + point.y + '" r="3.5" fill="' + line.color + '"/>'
          )
          .join("");
        return '<path d="' + path + '" fill="none" stroke="' + line.color + '" stroke-width="2.4"/>' + dots;
      })
      .join("");
    const labels = days
      .map((day, index) => '<text x="' + x(index) + '" y="' + (height - 8) + '" text-anchor="middle" fill="#a7cdc6" font-size="11">' + zhDate(day.date).replace("月", "/") .replace("日", "") + "</text>")
      .join("");
    return '<svg viewBox="0 0 ' + width + " " + height + '" class="plot" role="img" aria-label="每日商家实收">' + grid + series + labels + "</svg>";
  }

  function horizontalBars(rows) {
    const both = state.shop === "all";
    const width = 560;
    const rowH = 36;
    const height = 20 + rows.length * rowH;
    const labelW = 52;
    const max = Math.max.apply(
      null,
      rows.map((row) => Math.max(row.flagship, row.taobao, both ? 0 : state.shop === "flagship" ? row.flagship : row.taobao))
    ) || 1;
    const plotW = width - labelW - 70;
    const body = rows
      .map((row, index) => {
        const y = 8 + index * rowH;
        const series = both
          ? [
              ["flagship", "#5eead4", row.flagship],
              ["taobao", "#f9a8d4", row.taobao],
            ]
          : [[state.shop, "#5eead4", state.shop === "flagship" ? row.flagship : row.taobao]];
        const bars = series
          .map((item, barIndex) => {
            const h = both ? 8 : 12;
            const yy = y + (both ? 6 + barIndex * 12 : 8);
            const w = Math.max(2, (item[2] / max) * plotW);
            return '<rect data-tip="prov" data-name="' + esc(row.name) + '" data-series="' + item[0] + '" data-value="' + Math.round(item[2]) + '" x="' + labelW + '" y="' + yy + '" width="' + w + '" height="' + h + '" rx="4" fill="' + item[1] + '"/>';
          })
          .join("");
        const total = both ? row.total : state.shop === "flagship" ? row.flagship : row.taobao;
        return '<text x="0" y="' + (y + 22) + '" fill="#d8fff6" font-size="12">' + esc(shortProv(row.name)) + "</text>" + bars +
          '<text x="' + (width - 4) + '" y="' + (y + 22) + '" text-anchor="end" fill="#a7cdc6" font-size="11">' + wan(total) + "</text>";
      })
      .join("");
    return '<svg viewBox="0 0 ' + width + " " + height + '" class="plot" role="img" aria-label="省份商家实收">' + body + "</svg>";
  }

  function columnBars(rows) {
    const both = state.shop === "all";
    const width = 620;
    const height = 300;
    const left = 36;
    const bottom = 58;
    const top = 12;
    const plotH = height - top - bottom;
    const max = Math.max.apply(null, rows.map((row) => Math.max(row.flagship, row.taobao))) || 1;
    const slot = (width - left - 10) / rows.length;
    const y = (value) => top + plotH - (value / max) * plotH;
    const grid = '<line x1="' + left + '" y1="' + (top + plotH) + '" x2="' + (width - 8) + '" y2="' + (top + plotH) + '" stroke="rgba(255,255,255,.12)"/>';
    const cols = rows
      .map((row, index) => {
        const series = both
          ? [
              ["旗舰店", "#5eead4", row.flagship],
              ["淘宝店", "#f9a8d4", row.taobao],
            ]
          : [["本店", "#5eead4", state.shop === "flagship" ? row.flagship : row.taobao]];
        const barW = both ? 16 : 26;
        const origin = left + slot * index + slot / 2;
        const bars = series
          .map((item, barIndex) => {
            const x = origin + (barIndex - (series.length - 1) / 2) * (barW + 4) - barW / 2;
            const yy = y(item[2]);
            const h = top + plotH - yy;
            return '<rect data-tip="series" data-name="' + esc(row.name) + '" data-series="' + esc(item[0]) + '" data-value="' + Math.round(item[2]) + '" x="' + x + '" y="' + yy + '" width="' + barW + '" height="' + Math.max(h, 0) + '" rx="4" fill="' + item[1] + '"/>';
          })
          .join("");
        const parts = row.name.split("+");
        const labels = parts
          .slice(0, 3)
          .map((part, line) => '<tspan x="' + origin + '" dy="' + (line === 0 ? 0 : 12) + '">' + esc(part) + (line < Math.min(parts.length, 3) - 1 ? "+" : "") + "</tspan>")
          .join("");
        return bars + '<text x="' + origin + '" y="' + (height - 40) + '" text-anchor="middle" fill="#d8fff6" font-size="11">' + labels + "</text>";
      })
      .join("");
    return '<svg viewBox="0 0 ' + width + " " + height + '" class="plot" role="img" aria-label="系列商家实收">' + grid + cols + "</svg>";
  }

  function storesPage() {
    const view = storeSlice();
    const orders = DATA.orders;
    const chips = [
      ["all", "两家店"],
      ["flagship", "旗舰店"],
      ["taobao", "淘宝店"],
    ]
      .map(
        (item) =>
          '<button class="chip' + (state.shop === item[0] ? " is-on" : "") + '" data-shop="' + item[0] + '">' + item[1] + "</button>"
      )
      .join("");
    const legend = view.lines
      .map((line) => '<span class="legend-row" style="display:inline-grid;margin-left:12px"><i class="swatch" style="background:' + line.color + '"></i><span>' + esc(line.name) + "</span></span>")
      .join("");
    function kpi(kicker, name, value, id, sub, series, color) {
      return (
        '<article class="card kpi"><div class="kpi-top"><div><div class="kicker">' + kicker + '</div><div class="kpi-name">' + name + "</div>" +
        '<div class="kpi-value"' + (id ? ' id="' + id + '"' : "") + ">" + value + "</div></div>" +
        spark(series, color) + "</div><div class=\"kpi-sub\">" + sub + "</div></article>"
      );
    }
    return (
      '<div class="page page-stores">' +
      '<header class="store-head"><div><div class="kicker">SALES PERFORMANCE · 双店销售</div><div class="headline">' + esc(zhDate(orders.start)) + " – " + esc(zhDate(orders.end)) + "</div></div>" +
      '<div class="chips">' + chips + "</div></header>" +
      '<section class="store-mid"><div class="store-kpis">' +
      kpi("RECEIPTS", "商家实收", yuan(view.recv), "store-recv", view.subRecv + " · " + num(view.orders) + " 单", view.recvSeries, "#5eead4") +
      kpi("QUANTITY", "成交件数", num(view.qty), "", view.subQty, view.qtySeries, "#99f6e4") +
      kpi("COST", "总成本", yuan(view.cost), "", view.subCost, view.costSeries, "#5eead4") +
      kpi("PROFIT", "推广前利润", yuan(view.profit), "store-profit", view.subProfit, view.profitSeries, "#f9a8d4") +
      '</div><article class="card card-pad"><div class="card-head"><div><div class="kicker">DAILY RECEIPTS · 每日商家实收</div><div class="footnote">' + esc(view.label) + " · 支付日</div></div><div>" + legend + "</div></div>" +
      '<div class="chart-body">' + lineChart(orders.daily, view.lines) + "</div></article></section>" +
      '<section class="store-bot"><article class="card card-pad"><div class="card-head"><div class="kicker">REGION · 省份商家实收</div><div class="footnote">前 8 省 · 元</div></div><div class="chart-body">' + horizontalBars(orders.provinces) + '</div></article>' +
      '<article class="card card-pad"><div class="card-head"><div class="kicker">SERIES · 系列商家实收</div><div class="footnote">前 6 个系列 · 旗舰店青、淘宝店粉</div></div><div class="chart-body">' + columnBars(orders.series) + "</div></article></section></div>"
    );
  }

  const SKU_COLS = [
    ["week", "周次", "text"],
    ["id", "商品ID", "text"],
    ["role", "定位", "text"],
    ["name", "商品名称", "text"],
    ["gmv", "成交金额", "money"],
    ["net", "去税金额", "money"],
    ["qty", "件数", "num"],
    ["asp", "件单价", "money"],
    ["wxtSpend", "万相台花费", "money"],
    ["wxtRoi", "万相台ROI", "roi"],
    ["adSpend", "推广花费", "money"],
    ["adRoi", "推广ROI", "roi"],
    ["organic", "日销成交", "money"],
    ["profitBefore", "推广前利润", "money"],
    ["marginBefore", "推广前净利率", "pct"],
    ["profitAfter", "推广后利润", "money"],
    ["marginAfter", "推广后净利率", "pct"],
  ];

  function skuRows() {
    const query = state.skuQuery.trim().toLowerCase();
    let rows = [];
    DATA.weeks.forEach((week, index) => {
      if (state.skuWeek !== "all" && String(index) !== state.skuWeek) return;
      week.skus.forEach((sku) => {
        rows.push(Object.assign({ week: week.label, weekIndex: index }, sku));
      });
    });
    if (query) {
      rows = rows.filter((row) => (row.id + row.role + row.name + row.week).toLowerCase().includes(query));
    }
    const sort = state.skuSort;
    rows.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "string" || typeof bv === "string") return String(av).localeCompare(String(bv), "zh") * sort.dir;
      return ((av || 0) - (bv || 0)) * sort.dir;
    });
    return rows;
  }

  function formatCell(type, value) {
    if (type === "money") return '<span class="' + (value < 0 ? "neg" : "") + '">' + yuan(value) + "</span>";
    if (type === "pct") return '<span class="' + (value < 0 ? "neg" : "") + '">' + pct(value, 1) + "</span>";
    if (type === "roi") return value == null ? "—" : Number(value).toFixed(2);
    if (type === "num") return num(value);
    return esc(value);
  }

  function pager(page, pages, kind, total) {
    return (
      '<div class="pager"><span>第 ' + (pages ? page + 1 : 0) + " / " + pages + " 页 · " + total + ' 行</span><div class="pager-btns">' +
      '<button data-move="' + kind + '" data-delta="-1"' + (page <= 0 ? " disabled" : "") + ">上一页</button>" +
      '<button data-move="' + kind + '" data-delta="1"' + (page >= pages - 1 ? " disabled" : "") + ">下一页</button></div></div>"
    );
  }

  function skusPage() {
    const rows = skuRows();
    const pageSize = 20;
    const pages = Math.ceil(rows.length / pageSize) || 1;
    state.skuPage = Math.min(state.skuPage, pages - 1);
    const slice = rows.slice(state.skuPage * pageSize, state.skuPage * pageSize + pageSize);
    const head = SKU_COLS.map((col) => {
      const mark = state.skuSort.key === col[0] ? (state.skuSort.dir < 0 ? " ↓" : " ↑") : "";
      return '<th class="' + (col[2] === "text" ? "" : "num") + '" data-sort="' + col[0] + '" data-table="sku">' + col[1] + mark + "</th>";
    }).join("");
    const body = slice
      .map((row) => {
        const cells = SKU_COLS.map((col) => '<td class="' + (col[0] === "name" ? "name" : col[2] === "text" ? "" : "num") + '">' + formatCell(col[2], row[col[0]]) + "</td>").join("");
        return "<tr>" + cells + "</tr>";
      })
      .join("");
    const weekOptions = '<option value="all">全部周次</option>' + DATA.weeks.map((week, index) => '<option value="' + index + '"' + (String(index) === state.skuWeek ? " selected" : "") + ">" + esc(week.label) + "</option>").join("");
    return (
      '<div class="page page-table"><header class="toolbar"><div><div class="kicker">TABLE · 商品周损益</div><h2>链接明细</h2></div>' +
      '<div class="toolbar-controls"><input id="sku-q" type="search" placeholder="搜索 ID、定位、名称" value="' + esc(state.skuQuery) + '"/><select id="sku-week">' + weekOptions + "</select></div></header>" +
      '<div class="footnote">金额来自各周 CSV 的链接行，合计由链接加总。净利率 = 净利润 ÷ 去税金额。件单价保留两位小数。表格可横向滚动。7.6–7.12 的日期列在源文件里误写，表内周次按文件名。</div>' +
      '<div class="table-scroll"><table><thead><tr>' + head + "</tr></thead><tbody>" + (body || '<tr><td colspan="17">没有匹配的链接</td></tr>') + "</tbody></table></div>" +
      pager(state.skuPage, rows.length ? pages : 0, "sku", rows.length) + "</div>"
    );
  }

  const ORDER_COLS = [
    ["shop", "店铺", "text", 0],
    ["day", "支付日", "text", 12],
    ["id", "商品ID", "text", 1],
    ["title", "商品标题", "text", 2],
    ["category", "品类", "text", 3],
    ["series", "系列", "text", 4],
    ["province", "省", "text", 5],
    ["status", "订单状态", "text", 6],
    ["qty", "件数", "num", 7],
    ["pay", "买家实付", "money", 8],
    ["recv", "商家实收", "money", 9],
    ["cost", "总成本", "money", 10],
    ["profit", "推广前利润", "money", 11],
  ];

  function orderRows() {
    const query = state.orderQuery.trim().toLowerCase();
    let rows = DATA.orders.rows.filter((row) => {
      if (state.orderStatus === "pnl" && !PNL_STATUS.has(row[6])) return false;
      if (state.orderStatus !== "pnl" && state.orderStatus !== "all" && row[6] !== state.orderStatus) return false;
      if (state.orderShop === "flagship" && row[0] !== "旗舰店") return false;
      if (state.orderShop === "taobao" && row[0] !== "淘宝店") return false;
      if (!query) return true;
      return row.join(" ").toLowerCase().includes(query);
    });
    const col = ORDER_COLS.find((item) => item[0] === state.orderSort.key);
    const index = col[3];
    const dir = state.orderSort.dir;
    rows.sort((a, b) => {
      const av = a[index];
      const bv = b[index];
      if (typeof av === "string" || typeof bv === "string") return String(av).localeCompare(String(bv), "zh") * dir;
      return (av - bv) * dir;
    });
    return rows;
  }

  function ordersPage() {
    const rows = orderRows();
    const pageSize = 20;
    const pages = Math.ceil(rows.length / pageSize) || 1;
    state.orderPage = Math.min(state.orderPage, pages - 1);
    const slice = rows.slice(state.orderPage * pageSize, state.orderPage * pageSize + pageSize);
    const head = ORDER_COLS.map((col) => {
      const mark = state.orderSort.key === col[0] ? (state.orderSort.dir < 0 ? " ↓" : " ↑") : "";
      return '<th class="' + (col[2] === "text" ? "" : "num") + '" data-sort="' + col[0] + '" data-table="order">' + col[1] + mark + "</th>";
    }).join("");
    const body = slice
      .map((row) => {
        const cells = ORDER_COLS.map((col) => '<td class="' + (col[0] === "title" ? "name" : col[2] === "text" ? "" : "num") + '">' + formatCell(col[2], row[col[3]]) + "</td>").join("");
        return "<tr>" + cells + "</tr>";
      })
      .join("");
    const statuses = ["pnl", "all"].concat(DATA.orders.statusCounts.map((item) => item.name));
    const statusLabels = { pnl: "计入损益的订单", all: "全部状态" };
    const statusOptions = statuses
      .map((status) => '<option value="' + esc(status) + '"' + (status === state.orderStatus ? " selected" : "") + ">" + esc(statusLabels[status] || status) + "</option>")
      .join("");
    const shopOptions = [
      ["all", "两家店"],
      ["flagship", "旗舰店"],
      ["taobao", "淘宝店"],
    ]
      .map((item) => '<option value="' + item[0] + '"' + (state.orderShop === item[0] ? " selected" : "") + ">" + item[1] + "</option>")
      .join("");
    return (
      '<div class="page page-table"><header class="toolbar"><div><div class="kicker">TABLE · 订单明细</div><h2>7.27–8.2 子订单</h2></div>' +
      '<div class="toolbar-controls"><input id="order-q" type="search" placeholder="搜索标题、ID、省、状态" value="' + esc(state.orderQuery) + '"/>' +
      '<select id="order-shop">' + shopOptions + '</select><select id="order-status">' + statusOptions + "</select></div></header>" +
      '<div class="footnote">默认口径与工作簿「字段复核」一致：已发货待签收、已签收、已发货退款成功、已签收退款成功。商家实收 115,659，总成本 50,371。未支付取消和未发货退款不在这个口径里。</div>' +
      '<div class="table-scroll"><table><thead><tr>' + head + "</tr></thead><tbody>" + (body || '<tr><td colspan="13">没有匹配的订单</td></tr>') + "</tbody></table></div>" +
      pager(state.orderPage, rows.length ? pages : 0, "order", rows.length) + "</div>"
    );
  }

  function render() {
    const active = document.activeElement;
    const activeId = active && active.id;
    const caret = active && typeof active.selectionStart === "number" ? active.selectionStart : null;
    const theme = state.page === "stores" ? "theme-teal" : state.page === "overview" ? "theme-violet" : "theme-ink";
    art.className = theme;
    let page = overviewPage();
    if (state.page === "stores") page = storesPage();
    if (state.page === "skus") page = skusPage();
    if (state.page === "orders") page = ordersPage();
    stage.innerHTML = '<div class="shell">' + rail(state.page) + "<main>" + page + "</main></div>";
    hideTip();
    if (activeId) {
      const next = document.getElementById(activeId);
      if (next) {
        next.focus();
        if (caret != null && next.setSelectionRange) {
          const pos = Math.min(caret, next.value.length);
          next.setSelectionRange(pos, pos);
        }
      }
    }
  }

  function hideTip() {
    tip.hidden = true;
  }

  function showTip(html, event) {
    tip.hidden = false;
    tip.innerHTML = html;
    const bounds = art.getBoundingClientRect();
    const scale = bounds.width / 1440;
    let x = (event.clientX - bounds.left) / scale + 14;
    let y = (event.clientY - bounds.top) / scale + 14;
    if (x > 1100) x -= 260;
    if (y > 820) y -= 70;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  function tipFor(target) {
    const kind = target.dataset.tip;
    if (kind === "week") {
      const week = DATA.weeks[Number(target.dataset.index)];
      const totals = week.totals;
      return "<b>" + esc(week.label) + "</b><br>成交 " + yuan(totals.gmv) + "<br>推广后利润 " + yuan(totals.profitAfter) + "<br>推广 ROI " + (totals.adRoi == null ? "—" : totals.adRoi.toFixed(2)) + "<br>推广前净利率 " + pct(totals.marginBefore);
    }
    if (kind === "group") return "<b>" + esc(target.dataset.name) + "</b><br>" + target.dataset.share + "% · " + yuan(Number(target.dataset.gmv));
    if (kind === "donut" || kind === "ring") return "<b>" + esc(target.dataset.label || target.dataset.name) + "</b><br>" + esc(target.dataset.value);
    if (kind === "day") return "<b>" + esc(zhDate(target.dataset.date)) + " · " + esc(target.dataset.name) + "</b><br>商家实收 " + yuan(Number(target.dataset.value));
    if (kind === "prov" || kind === "series") {
      const who = target.dataset.series === "flagship" ? "旗舰店" : target.dataset.series === "taobao" ? "淘宝店" : target.dataset.series;
      return "<b>" + esc(target.dataset.name) + "</b><br>" + esc(who) + " " + yuan(Number(target.dataset.value));
    }
    return "";
  }

  function fit() {
    const scale = Math.min(viewport.clientWidth / 1440, viewport.clientHeight / 900);
    const safe = Math.max(scale, 0.01);
    frame.style.width = 1440 * safe + "px";
    frame.style.height = 900 * safe + "px";
    art.style.transform = "scale(" + safe + ")";
  }

  art.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      state.page = nav.dataset.nav;
      render();
      return;
    }
    const week = event.target.closest("[data-week]");
    if (week) {
      state.week = Number(week.dataset.week);
      render();
      return;
    }
    const step = event.target.closest("[data-week-step]");
    if (step) {
      state.week = Math.max(0, Math.min(DATA.weeks.length - 1, state.week + Number(step.dataset.weekStep)));
      render();
      return;
    }
    const shop = event.target.closest("[data-shop]");
    if (shop) {
      state.shop = shop.dataset.shop;
      render();
      return;
    }
    const move = event.target.closest("[data-move]");
    if (move && !move.disabled) {
      if (move.dataset.move === "sku") state.skuPage += Number(move.dataset.delta);
      else state.orderPage += Number(move.dataset.delta);
      render();
      return;
    }
    const sort = event.target.closest("[data-sort]");
    if (sort) {
      const key = sort.dataset.sort;
      if (sort.dataset.table === "sku") {
        state.skuSort = { key: key, dir: state.skuSort.key === key ? state.skuSort.dir * -1 : key === "week" || key === "name" || key === "role" || key === "id" ? 1 : -1 };
        state.skuPage = 0;
      } else {
        state.orderSort = { key: key, dir: state.orderSort.key === key ? state.orderSort.dir * -1 : -1 };
        state.orderPage = 0;
      }
      render();
      return;
    }
    const barWeek = event.target.closest('[data-tip="week"]');
    if (barWeek) {
      state.week = Number(barWeek.dataset.index);
      render();
    }
  });

  art.addEventListener("compositionstart", () => {
    state.composing = true;
  });
  art.addEventListener("compositionend", (event) => {
    state.composing = false;
    if (event.target.id === "sku-q") state.skuQuery = event.target.value;
    if (event.target.id === "order-q") state.orderQuery = event.target.value;
    state.skuPage = 0;
    state.orderPage = 0;
    render();
  });
  art.addEventListener("input", (event) => {
    if (state.composing) return;
    if (event.target.id === "sku-q") {
      state.skuQuery = event.target.value;
      state.skuPage = 0;
      render();
    }
    if (event.target.id === "order-q") {
      state.orderQuery = event.target.value;
      state.orderPage = 0;
      render();
    }
  });

  art.addEventListener("change", (event) => {
    if (event.target.id === "sku-week") {
      state.skuWeek = event.target.value;
      state.skuPage = 0;
      render();
    }
    if (event.target.id === "order-shop") {
      state.orderShop = event.target.value;
      state.orderPage = 0;
      render();
    }
    if (event.target.id === "order-status") {
      state.orderStatus = event.target.value;
      state.orderPage = 0;
      render();
    }
  });

  art.addEventListener("mousemove", (event) => {
    const target = event.target.closest("[data-tip]");
    if (!target) {
      hideTip();
      return;
    }
    showTip(tipFor(target), event);
  });

  art.addEventListener("mouseleave", hideTip);

  document.addEventListener("keydown", (event) => {
    if (event.target && (event.target.tagName === "INPUT" || event.target.tagName === "SELECT")) return;
    if (state.page !== "overview") return;
    if (event.key === "ArrowRight") state.week = Math.min(DATA.weeks.length - 1, state.week + 1);
    else if (event.key === "ArrowLeft") state.week = Math.max(0, state.week - 1);
    else return;
    render();
  });

  window.addEventListener("resize", fit);
  render();
  fit();
})();
