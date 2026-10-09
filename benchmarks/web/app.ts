/**
 * Benchmark page: shows server results (results.json) and runs the shared
 * suite in the browser. Bundled with numeric-2, math.js and stdlib into
 * bench.js by build.ts; numeric.js comes from jsDelivr (see page.html).
 */
import { mathjs, numeric2, stdlib, VERSIONS } from "../libs";
import { runAll, LIBS, LIB_TITLE, QUICK_TIMING, DEFAULT_TIMING, type Measurement, type ResultFile, type LibName } from "../suites";

// ── Data model ──

type EnvId = "bun" | "node" | "browser";
const ENV_ORDER: EnvId[] = ["bun", "node", "browser"];
const ENV_TITLE: Record<EnvId, string> = { bun: "Bun (server)", node: "Node (server)", browser: "This browser" };
const LIB_VAR: Record<LibName, string> = {
    "numeric-2": "--lib-numeric2", numeric: "--lib-numeric", mathjs: "--lib-mathjs", stdlib: "--lib-stdlib",
};
/** Marker shape per library: the secondary encoding beside colour. */
const LIB_SHAPE: Record<LibName, "circle" | "square" | "diamond" | "triangle"> = {
    "numeric-2": "circle", numeric: "square", mathjs: "diamond", stdlib: "triangle",
};

type Run = ResultFile & { id: EnvId };
type Row = { suite: string; case: string; size: number; sizeLabel: string };
type Cell = Partial<Record<LibName, Measurement>>;

const runs = new Map<EnvId, Run>();
const state = {
    env: "bun" as EnvId,
    metric: "ratio" as "ratio" | "time",
    baseline: "numeric" as LibName,
    suite: "All",
    shown: new Set<LibName>(LIBS),
    running: false,
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const SVG_NS = "http://www.w3.org/2000/svg";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
}

function svg(tag: string, attrs: Record<string, string | number> = {}, text?: string) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (text !== undefined) e.textContent = text;
    return e;
}

/** A library marker centred at (cx, cy). */
function marker(lib: LibName, cx: number, cy: number, r: number, fill: string, stroke: string, strokeW = 2) {
    const common = { fill, stroke, "stroke-width": strokeW, "stroke-linejoin": "round" };
    switch (LIB_SHAPE[lib]) {
        case "circle": return svg("circle", { cx, cy, r, ...common });
        case "square": return svg("rect", { x: cx - r * 0.9, y: cy - r * 0.9, width: r * 1.8, height: r * 1.8, ...common });
        case "diamond": return svg("path", { d: `M${cx},${cy - r * 1.25} L${cx + r * 1.25},${cy} L${cx},${cy + r * 1.25} L${cx - r * 1.25},${cy} Z`, ...common });
        case "triangle": return svg("path", { d: `M${cx},${cy - r * 1.2} L${cx + r * 1.15},${cy + r * 0.85} L${cx - r * 1.15},${cy + r * 0.85} Z`, ...common });
    }
}

/** A small legend/key icon for a library. */
function keyIcon(lib: LibName) {
    const s = svg("svg", { width: 14, height: 14, viewBox: "0 0 14 14", class: "shape", "aria-hidden": "true" });
    s.append(marker(lib, 7, 7, 4.2, `var(${LIB_VAR[lib]})`, "none", 0));
    return s;
}

const rowKey = (r: { suite: string; case: string; size: number }) => `${r.suite}|${r.case}|${r.size}`;

/** Ordered list of benchmark rows (cases × sizes) across all runs. */
function allRows(): Row[] {
    const seen = new Map<string, Row>();
    for (const id of ENV_ORDER) {
        for (const m of runs.get(id)?.results ?? []) {
            const k = rowKey(m);
            if (!seen.has(k)) seen.set(k, { suite: m.suite, case: m.case, size: m.size, sizeLabel: m.sizeLabel });
        }
    }
    return [...seen.values()];
}

const cellCache = new Map<string, Cell>();
function cell(env: EnvId, row: Row): Cell {
    const key = `${env}|${rowKey(row)}`;
    let c = cellCache.get(key);
    if (c === undefined) {
        c = {};
        for (const m of runs.get(env)?.results ?? []) if (rowKey(m) === rowKey(row)) c[m.lib] = m;
        cellCache.set(key, c);
    }
    return c;
}

const ok = (m?: Measurement) => m !== undefined && Number.isFinite(m.median);

/** Relative speed of `lib` against `base` (base time / lib time), with an IQR-based range. */
function relative(c: Cell, lib: LibName, base: LibName) {
    const a = c[base], b = c[lib];
    if (!ok(a) || !ok(b)) return null;
    return { mid: a!.median / b!.median, lo: a!.p25 / b!.p75, hi: a!.p75 / b!.p25 };
}

// ── Formatting ──

function fmtTime(us: number): string {
    if (!Number.isFinite(us)) return "—";
    if (us < 1) return `${(us * 1000).toPrecision(3)} ns`;
    if (us < 1000) return `${us.toPrecision(3)} µs`;
    if (us < 1e6) return `${(us / 1000).toPrecision(3)} ms`;
    return `${(us / 1e6).toPrecision(3)} s`;
}

const fmtRatio = (r: number) => `${r >= 10 ? r.toFixed(0) : r >= 0.1 ? r.toFixed(2) : r.toPrecision(2)}×`;

function fmtPow2(e: number): string {
    if (e === 0) return "1×";
    return e > 0 ? `${2 ** e}×` : `1/${2 ** -e}×`;
}

function geomean(xs: number[]) {
    return Math.exp(xs.reduce((s, x) => s + Math.log(x), 0) / xs.length);
}

function statusLine(good: boolean, text: string) {
    const s = el("span", { class: `status ${good ? "good" : "bad"}` });
    const icon = svg("svg", { width: 14, height: 14, viewBox: "0 0 14 14", "aria-hidden": "true" });
    icon.append(good
        ? svg("path", { d: "M3 7.5l2.5 2.5L11 4.5", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round" })
        : svg("path", { d: "M4 4l6 6M10 4l-6 6", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round" }));
    s.append(icon, document.createTextNode(text));
    return s;
}

// ── numeric.js availability in the browser ──

function numericInBrowser(): { lib: any; error: string | null } {
    const w = window as any;
    const errors: string[] = w.__numericLoad?.errors ?? [];
    try {
        if (typeof w.numeric === "undefined") throw new Error(errors[0] ?? "numeric.js did not load");
        const r = w.numeric.add([1, 2], [3, 4]);
        if (r[1] !== 6) throw new Error("numeric.add returned a wrong result");
        return { lib: w.numeric, error: null };
    } catch (e) {
        return { lib: undefined, error: errors[0] ?? String((e as Error).message ?? e) };
    }
}

const browserNumeric = numericInBrowser();

function numericStatus() {
    return browserNumeric.error === null
        ? statusLine(true, "numeric.js loads on this page")
        : statusLine(false, `numeric.js cannot run here: ${browserNumeric.error}`);
}

// ── Environment tiles ──

function renderEnvs() {
    const host = $("envs");
    host.replaceChildren();
    for (const id of ENV_ORDER) {
        const run = runs.get(id);
        const tile = el("article", { class: `env${id === state.env && run ? " selected" : ""}` });
        const body = run ? el("button", { type: "button", class: "env-pick", "aria-pressed": String(id === state.env) }) : el("div");
        if (run) body.addEventListener("click", () => { state.env = id; renderAll(); });
        body.style.display = "flex";
        body.style.flexDirection = "column";
        body.style.gap = "8px";

        body.append(el("div", { class: "env-name" }, ENV_TITLE[id]));
        if (!run) {
            body.append(el("p", { class: "env-meta" }, id === "browser"
                ? "Not run yet. Use the buttons below to time every library in this browser."
                : "No results file. Run the benchmark on this runtime and rebuild the page."));
            tile.append(body);
            if (id === "browser") tile.append(numericStatus());
            host.append(tile);
            continue;
        }

        body.append(el("p", { class: "env-meta" }, "numeric-2's relative speed (geometric mean over shared cases):"));
        const grid = el("div", { class: "vs" });
        for (const other of LIBS) {
            if (other === "numeric-2") continue;
            const rs = allRows().map((r) => relative(cell(id, r), "numeric-2", other)).filter((q) => q !== null).map((q) => q!.mid);
            const label = el("span", { class: "env-name" });
            label.style.fontWeight = "400";
            label.append(keyIcon(other), document.createTextNode(`vs ${LIB_TITLE[other]}`));
            grid.append(label,
                el("span", { class: "cnt" }, rs.length ? `${rs.length} cases` : "no shared cases"),
                el("span", { class: "fig" }, rs.length ? fmtRatio(geomean(rs)) : "—"));
        }
        body.append(grid);
        const meta = el("p", { class: "env-meta" });
        meta.append(el("span", { class: "num" }, run.env.runtime), document.createTextNode(` · ${run.env.platform} · ${new Date(run.env.date).toLocaleString()}`));
        body.append(meta);
        tile.append(body);
        if (id === "browser") tile.append(numericStatus());
        host.append(tile);
    }
}

// ── Controls ──

function renderControls() {
    const envHost = $("env");
    envHost.replaceChildren();
    for (const id of ENV_ORDER) {
        if (!runs.has(id)) continue;
        const b = el("button", { type: "button", "aria-pressed": String(id === state.env) }, ENV_TITLE[id]);
        b.addEventListener("click", () => { state.env = id; renderAll(); });
        envHost.append(b);
    }

    const host = $("suites");
    host.replaceChildren();
    for (const s of ["All", ...new Set(allRows().map((r) => r.suite))]) {
        const b = el("button", { type: "button", "aria-pressed": String(s === state.suite) }, s);
        b.addEventListener("click", () => { state.suite = s; renderAll(); });
        host.append(b);
    }

    const toggles = $("lib-toggles");
    toggles.replaceChildren();
    for (const lib of LIBS) {
        const label = el("label");
        const box = el("input", { type: "checkbox", id: `show-${lib}` }) as HTMLInputElement;
        box.checked = state.shown.has(lib);
        box.addEventListener("change", () => {
            if (box.checked) state.shown.add(lib); else state.shown.delete(lib);
            renderChart();
            renderTable();
        });
        label.append(box, keyIcon(lib), document.createTextNode(LIB_TITLE[lib]));
        toggles.append(label);
    }

    $("metric").querySelectorAll("button").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.metric === state.metric));
    });
    ($("baseline") as HTMLSelectElement).value = state.baseline;
}

$("metric").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    state.metric = b.dataset.metric as "ratio" | "time";
    renderControls();
    renderChart();
});

$("baseline").addEventListener("change", (e) => {
    state.baseline = (e.target as HTMLSelectElement).value as LibName;
    renderChart();
    renderTable();
});

function visibleLibs(): LibName[] {
    return LIBS.filter((l) => state.shown.has(l));
}

function visibleRows(): Row[] {
    return allRows().filter((r) => state.suite === "All" || r.suite === state.suite);
}

// ── Chart ──

const ROW_H = 26, GROUP_H = 30, TOP = 46, BOTTOM = 10;

function renderLegend() {
    const host = $("legend");
    host.replaceChildren();
    for (const lib of visibleLibs()) {
        if (state.metric === "ratio" && lib === state.baseline) continue;
        const s = el("span");
        s.append(keyIcon(lib), document.createTextNode(LIB_TITLE[lib]));
        host.append(s);
    }
}

function renderChart() {
    renderLegend();
    const base = state.baseline;
    $("chart-title").textContent = state.metric === "ratio"
        ? `Speed relative to ${LIB_TITLE[base]} · ${ENV_TITLE[state.env]}`
        : `Time per call (log scale) · ${ENV_TITLE[state.env]}`;

    const host = $("chart");
    host.replaceChildren();
    const env = state.env;
    const libs = visibleLibs().filter((l) => state.metric === "time" || l !== base);
    const rows = visibleRows();
    if (!runs.has(env) || !libs.length || !rows.length) {
        host.append(el("p", { class: "empty" }, "No measurements to show. Pick an environment with results, or turn on a library above."));
        return;
    }

    // Layout
    const width = Math.max(320, host.clientWidth);
    const narrow = width < 560;
    const labelW = narrow ? 84 : Math.min(230, Math.max(150, width * 0.26));
    const plotL = labelW + 12, plotR = width - (narrow ? 14 : 20);
    const groups: { name: string; rows: Row[] }[] = [];
    for (const r of rows) {
        const g = groups[groups.length - 1];
        if (g && g.name === `${r.suite} / ${r.case}`) g.rows.push(r);
        else groups.push({ name: `${r.suite} / ${r.case}`, rows: [r] });
    }
    const height = TOP + groups.length * GROUP_H + rows.length * ROW_H + BOTTOM;

    // Scale
    let x: (v: number) => number;
    const ticks: { v: number; label: string; strong?: boolean }[] = [];
    if (state.metric === "ratio") {
        let maxE = 1;
        for (const r of rows) for (const lib of libs) {
            const q = relative(cell(env, r), lib, base);
            if (q) maxE = Math.max(maxE, Math.ceil(Math.abs(Math.log2(q.mid)) + 0.25));
        }
        maxE = Math.min(maxE, 7);
        const lo = -maxE, hi = maxE;
        x = (v) => plotL + ((Math.log2(v) - lo) / (hi - lo)) * (plotR - plotL);
        for (let e = lo; e <= hi; e++) ticks.push({ v: 2 ** e, label: fmtPow2(e), strong: e === 0 });
    } else {
        let mn = Infinity, mx = -Infinity;
        for (const r of rows) for (const lib of libs) {
            const m = cell(env, r)[lib];
            if (ok(m)) { mn = Math.min(mn, m!.median); mx = Math.max(mx, m!.median); }
        }
        if (!Number.isFinite(mn)) { mn = 1; mx = 10; }
        const lo = Math.floor(Math.log10(mn)), hi = Math.max(lo + 1, Math.ceil(Math.log10(mx)));
        x = (v) => plotL + ((Math.log10(v) - lo) / (hi - lo)) * (plotR - plotL);
        for (let e = lo; e <= hi; e++) ticks.push({ v: 10 ** e, label: fmtTime(10 ** e) });
    }
    const clampX = (px: number) => Math.min(plotR, Math.max(plotL, px));

    const root = svg("svg", { width, height, viewBox: `0 0 ${width} ${height}`, role: "img",
        "aria-label": state.metric === "ratio"
            ? `Dot chart of each library's speed relative to ${LIB_TITLE[base]}, per benchmark`
            : "Dot chart of time per call for each library, per benchmark" });

    // Grid and ticks; label every tick only when they have room (~44px each)
    const grid = svg("g", { class: "tick" });
    const every = Math.max(1, Math.ceil((44 * ticks.length) / (plotR - plotL)));
    ticks.forEach((t, i) => {
        const px = x(t.v);
        grid.append(svg("line", { x1: px, x2: px, y1: TOP - 6, y2: height - BOTTOM,
            stroke: t.strong ? css("--axis") : css("--grid"), "stroke-width": t.strong ? 1.5 : 1 }));
        if (t.strong || i % every === 0) {
            const anchor = i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle";
            grid.append(svg("text", { x: px, y: TOP - 12, "text-anchor": anchor }, t.label));
        }
    });
    root.append(grid);
    if (state.metric === "ratio") {
        root.append(svg("text", { class: "axis-note", x: plotL, y: 14 }, narrow ? "◀ slower" : `◀ slower than ${LIB_TITLE[base]}`));
        root.append(svg("text", { class: "axis-note", x: plotR, y: 14, "text-anchor": "end" }, narrow ? "faster ▶" : `faster than ${LIB_TITLE[base]} ▶`));
    }

    // Rows
    const offsets = libs.length === 1 ? [0] : libs.map((_, i) => (i - (libs.length - 1) / 2) * 5);
    const surface = css("--surface");
    let y = TOP;
    for (const g of groups) {
        root.append(svg("text", { class: "group-label", x: 0, y: y + GROUP_H - 10 }, g.rows[0].case));
        if (!narrow && state.suite === "All") {
            root.append(svg("text", { class: "axis-note", x: plotR, y: y + GROUP_H - 10, "text-anchor": "end" }, g.rows[0].suite));
        }
        y += GROUP_H;
        for (const r of g.rows) {
            const cy = y + ROW_H / 2;
            const hit = svg("rect", { class: "row-hit", x: 0, y, width, height: ROW_H, tabindex: 0, rx: 4,
                "aria-label": `${r.case} ${r.sizeLabel}` });
            root.append(hit);
            root.append(svg("text", { class: "row-label", x: narrow ? 4 : 12, y: cy + 4 }, r.sizeLabel));
            root.append(svg("line", { x1: plotL, x2: plotR, y1: cy, y2: cy, stroke: css("--grid"), "stroke-dasharray": "1 3" }));

            const c = cell(env, r);
            libs.forEach((lib, i) => {
                const color = css(LIB_VAR[lib]);
                const yy = cy + offsets[i];
                if (state.metric === "ratio") {
                    const q = relative(c, lib, base);
                    if (!q) return;
                    root.append(svg("line", { x1: clampX(x(q.lo)), x2: clampX(x(q.hi)), y1: yy, y2: yy,
                        stroke: color, "stroke-width": 2, "stroke-linecap": "round", opacity: 0.4 }));
                    const px = x(q.mid);
                    if (px > plotR || px < plotL) {
                        // Off-scale: an arrowhead at the edge
                        const ex = clampX(px), dir = px > plotR ? 1 : -1;
                        root.append(svg("path", { d: `M${ex - 7 * dir},${yy - 5} L${ex},${yy} L${ex - 7 * dir},${yy + 5} Z`,
                            fill: color, stroke: surface, "stroke-width": 1.5 }));
                    } else {
                        root.append(marker(lib, px, yy, 4.5, color, surface));
                    }
                } else {
                    const m = c[lib];
                    if (ok(m)) root.append(marker(lib, x(m!.median), yy, 4.5, color, surface));
                }
            });

            const show = (ev?: PointerEvent) => showTooltip(r, hit, ev);
            hit.addEventListener("pointermove", show as EventListener);
            hit.addEventListener("focus", () => show());
            hit.addEventListener("pointerleave", hideTooltip);
            hit.addEventListener("blur", hideTooltip);
            y += ROW_H;
        }
    }
    host.append(root);
}

// ── Output agreement ──

type Accepted = { lib: LibName; kind: "differs" | "fails"; reason: string };

/**
 * Discrepancies with numeric-2 for a row: unexplained mismatches and failures
 * (flagged), and accepted ones that carry a documented reason.
 */
function outputIssues(r: Row): { differ: LibName[]; failed: [LibName, string][]; accepted: Accepted[]; compared: boolean } {
    const c = cell(state.env, r);
    const differ: LibName[] = [], failed: [LibName, string][] = [], accepted: Accepted[] = [];
    let compared = false;
    for (const lib of LIBS) {
        const m = c[lib];
        if (!m) continue;
        const fails = !!m.error && !m.error.endsWith("is not available");
        if (m.accepted && (fails || m.agrees === false)) {
            accepted.push({ lib, kind: fails ? "fails" : "differs", reason: m.accepted });
            continue;
        }
        if (fails) failed.push([lib, m.error!]);
        if (m.agrees === false) differ.push(lib);
        if (m.agrees === true) compared = true;
    }
    return { differ, failed, accepted, compared };
}

/** A neutral status line (info icon) for accepted differences. */
function noteLine(text: string) {
    const s = el("span", { class: "status note" });
    const icon = svg("svg", { width: 14, height: 14, viewBox: "0 0 14 14", "aria-hidden": "true" });
    icon.append(
        svg("circle", { cx: 7, cy: 7, r: 5.5, fill: "none", stroke: "currentColor", "stroke-width": 1.5 }),
        svg("path", { d: "M7 6.2v3.6M7 4.2v.1", fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round" }),
    );
    s.append(icon, document.createTextNode(text));
    return s;
}

const acceptedLabel = (a: Accepted) => `${LIB_TITLE[a.lib]} ${a.kind === "fails" ? "fails" : "differs"} (accepted)`;

// ── Tooltip ──

function showTooltip(r: Row, target: SVGElement, ev?: PointerEvent) {
    const tip = $("tooltip");
    tip.replaceChildren();
    tip.append(el("h3", {}, `${r.case} · ${r.sizeLabel}`));
    const c = cell(state.env, r);
    const table = el("table");
    for (const lib of visibleLibs()) {
        const m = c[lib];
        if (!m) continue;
        const tr = el("tr");
        const name = el("td");
        const key = el("span", { class: "line-key" });
        key.style.background = `var(${LIB_VAR[lib]})`;
        name.append(key, document.createTextNode(LIB_TITLE[lib]));
        const val = el("td");
        if (ok(m)) {
            val.append(el("span", { class: "v" }, fmtTime(m.median)));
            const q = lib === state.baseline ? null : relative(c, lib, state.baseline);
            if (q) val.append(el("span", { class: "sub" }, ` ${fmtRatio(q.mid)}`));
        } else {
            val.append(el("span", { class: "sub" }, "failed"));
        }
        tr.append(name, val);
        table.append(tr);
    }
    tip.append(table);
    const issues = outputIssues(r);
    for (const [lib, e] of issues.failed) {
        tip.append(statusLine(false, `${LIB_TITLE[lib]}: ${e.slice(0, 90)}${e.length > 90 ? "…" : ""}`));
    }
    if (issues.differ.length) tip.append(statusLine(false, `Output differs from numeric-2: ${issues.differ.map((l) => LIB_TITLE[l]).join(", ")}`));
    else if (issues.compared) tip.append(statusLine(true, "Other outputs match numeric-2"));
    else if (!issues.accepted.length) tip.append(el("div", { class: "sub" }, "Outputs not compared"));
    for (const a of issues.accepted) {
        tip.append(noteLine(acceptedLabel(a)));
        tip.append(el("div", { class: "reason" }, a.reason));
    }
    tip.append(el("div", { class: "sub" }, `Small figures: relative speed against ${LIB_TITLE[state.baseline]}.`));

    tip.hidden = false;
    const card = tip.parentElement!.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    const px = ev ? ev.clientX : box.left + box.width * 0.6;
    let left = px - card.left + 16;
    if (left + tip.offsetWidth > card.width - 8) left = px - card.left - tip.offsetWidth - 16;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${box.bottom - card.top + 4}px`;
    document.querySelectorAll(".row-hit.active").forEach((a) => a.classList.remove("active"));
    target.classList.add("active");
}

function hideTooltip() {
    $("tooltip").hidden = true;
    document.querySelectorAll(".row-hit.active").forEach((a) => a.classList.remove("active"));
}

// ── Table ──

function renderTable() {
    const table = $("table");
    table.replaceChildren();
    const libs = visibleLibs();
    const base = state.baseline;
    $("table-note").textContent = `Median time per call on ${ENV_TITLE[state.env]}. The small figure is relative speed against ${LIB_TITLE[base]}: 0.5× takes twice as long, 2× takes half as long.`;

    const thead = el("thead");
    const h = el("tr");
    h.append(el("th", {}, "Benchmark"), el("th", {}, "Size"));
    for (const lib of libs) {
        const th = el("th", { class: "env-col" });
        th.style.setProperty("--env-color", `var(${LIB_VAR[lib]})`);
        th.append(keyIcon(lib), document.createTextNode(` ${LIB_TITLE[lib]}`));
        h.append(th);
    }
    h.append(el("th", {}, "Outputs"));
    thead.append(h);
    table.append(thead);

    const tbody = el("tbody");
    let prev = "";
    for (const r of visibleRows()) {
        const tr = el("tr");
        const first = prev !== `${r.suite}|${r.case}`;
        if (first) tr.classList.add("group-start");
        prev = `${r.suite}|${r.case}`;
        tr.append(el("td", {}, first ? r.case : ""), el("td", {}, r.sizeLabel));
        const c = cell(state.env, r);
        for (const lib of libs) {
            const m = c[lib];
            const td = el("td");
            if (!m) {
                td.append(el("span", { class: "muted" }, "n/a"));
            } else if (!ok(m)) {
                td.className = m.accepted ? "accepted" : "err";
                td.textContent = m.error?.endsWith("is not available") ? "not loaded" : m.accepted ? "failed (accepted)" : "failed";
                if (m.error) td.title = m.accepted ? `${m.error}\n\nAccepted: ${m.accepted}` : m.error;
            } else {
                td.append(document.createTextNode(fmtTime(m.median)));
                const q = lib === base ? null : relative(c, lib, base);
                if (q) {
                    const rel = el("span", { class: "rel" }, fmtRatio(q.mid));
                    if (q.mid >= 1.15) rel.classList.add("faster");
                    if (q.mid <= 1 / 1.15) rel.classList.add("slower");
                    td.append(rel);
                }
            }
            tr.append(td);
        }
        const issues = outputIssues(r);
        const td = el("td");
        if (issues.differ.length || issues.failed.length) {
            const who = [...issues.differ, ...issues.failed.map(([l]) => l)].map((l) => LIB_TITLE[l]);
            td.append(statusLine(false, `${[...new Set(who)].join(", ")} ${issues.differ.length ? "differ" : "fail"}`));
        } else if (issues.accepted.length) {
            // Accepted differences: the reason on hover, and expandable on click (works on touch screens)
            const btn = el("button", { type: "button", class: "note-btn", "aria-expanded": "false",
                title: issues.accepted.map((a) => `${acceptedLabel(a)}: ${a.reason}`).join("\n\n") });
            btn.append(noteLine(issues.accepted.length === 1 ? acceptedLabel(issues.accepted[0]) : `${issues.accepted.length} accepted differences`));
            let detail: HTMLTableRowElement | null = null;
            btn.addEventListener("click", () => {
                if (detail) {
                    detail.remove();
                    detail = null;
                    btn.setAttribute("aria-expanded", "false");
                    return;
                }
                detail = el("tr", { class: "note-row" }) as HTMLTableRowElement;
                const cellTd = el("td", { colspan: String(2 + libs.length + 1) });
                for (const a of issues.accepted) {
                    const p = el("p");
                    p.append(el("strong", {}, `${acceptedLabel(a)}. `), document.createTextNode(a.reason));
                    cellTd.append(p);
                }
                detail.append(cellTd);
                tr.after(detail);
                btn.setAttribute("aria-expanded", "true");
            });
            td.append(btn);
        } else if (issues.compared) td.append(statusLine(true, "Match"));
        else td.append(el("span", { class: "muted" }, "—"));
        tr.append(td);
        tbody.append(tr);
    }
    table.append(tbody);
}

// ── Browser run ──

function browserName(): string {
    const ua = navigator.userAgent;
    const m = ua.match(/(Edg|Firefox|Chrome)\/(\d+)/) ?? ua.match(/Version\/(\d+).*(Safari)/);
    if (!m) return "Browser";
    if (m[2] === "Safari") return `Safari ${m[1]}`;
    return `${m[1] === "Edg" ? "Edge" : m[1]} ${m[2]}`;
}

function browserPlatform(): string {
    const p = (navigator as any).userAgentData?.platform ?? navigator.platform ?? "";
    return p || "unknown platform";
}

const STORE_KEY = "numeric2-bench-browser-run-v2";

function saveBrowserRun(run: ResultFile) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(run)); } catch { /* storage unavailable */ }
}

function loadBrowserRun(): ResultFile | null {
    try {
        const s = localStorage.getItem(STORE_KEY);
        return s ? JSON.parse(s) : null;
    } catch {
        return null;
    }
}

async function runInBrowser(quick: boolean) {
    if (state.running) return;
    state.running = true;
    const buttons = [$<HTMLButtonElement>("run-quick"), $<HTMLButtonElement>("run-full")];
    for (const b of buttons) b.disabled = true;
    $("progress").hidden = false;
    const text = $("progress-text"), bar = $("progress-bar");

    const results: Measurement[] = [];
    const env = { runtime: browserName(), platform: browserPlatform(), date: new Date().toISOString(), userAgent: navigator.userAgent, versions: VERSIONS };
    try {
        await runAll({ numeric: browserNumeric.lib, numeric2, mathjs, stdlib }, {
            ...(quick ? QUICK_TIMING : DEFAULT_TIMING),
            onResult: async (m, done, total) => {
                results.push(m);
                bar.style.width = `${(100 * done) / total}%`;
                text.textContent = `${done} of ${total}: ${m.case}, ${m.sizeLabel} (${LIB_TITLE[m.lib]})`;
                // Show partial results as they arrive, then yield to the page
                if (done % 12 === 0) {
                    runs.set("browser", { id: "browser", env, results: results.slice() });
                    cellCache.clear();
                    if (state.env === "browser") renderAll(); else renderEnvs();
                }
                await new Promise((r) => setTimeout(r, 0));
            },
        });
        const run = { env, results };
        runs.set("browser", { id: "browser", ...run });
        cellCache.clear();
        state.env = "browser";
        saveBrowserRun(run);
        text.textContent = `Finished ${results.length} measurements (${quick ? "quick" : "full"} run).`;
        $("copy-json").hidden = false;
    } catch (e) {
        text.textContent = `The run stopped: ${(e as Error).message ?? e}`;
    } finally {
        state.running = false;
        for (const b of buttons) b.disabled = false;
        renderAll();
    }
}

$("run-quick").addEventListener("click", () => runInBrowser(true));
$("run-full").addEventListener("click", () => runInBrowser(false));
$("copy-json").addEventListener("click", async () => {
    const run = runs.get("browser");
    if (!run) return;
    const json = JSON.stringify({ env: run.env, results: run.results }, null, 1);
    const btn = $("copy-json");
    try {
        await navigator.clipboard.writeText(json);
        btn.textContent = "Copied";
    } catch {
        btn.textContent = "Copy failed: clipboard unavailable";
    }
    setTimeout(() => { btn.textContent = "Copy results as JSON"; }, 2000);
});

// ── Boot ──

function renderAll() {
    renderEnvs();
    renderControls();
    renderChart();
    renderTable();
}

async function boot() {
    $("browser-libs").textContent = browserNumeric.error === null
        ? `${browserName()} · all four libraries available`
        : `${browserName()} · numeric.js unavailable; numeric-2, math.js and stdlib can run`;

    try {
        const res = await fetch("results.json");
        const data = await res.json() as { runs: (ResultFile & { id: EnvId })[] };
        for (const r of data.runs) runs.set(r.id, r);
    } catch {
        $("chart").append(el("p", { class: "empty" }, "Server results could not be loaded (results.json is missing). You can still run the suite in this browser."));
    }
    const saved = loadBrowserRun();
    if (saved) {
        runs.set("browser", { id: "browser", ...saved });
        $("copy-json").hidden = false;
    }
    state.env = ENV_ORDER.find((id) => runs.has(id)) ?? "bun";
    const server = ENV_ORDER.filter((id) => id !== "browser" && runs.has(id)).map((id) => runs.get(id)!.env.runtime);
    const v = Object.entries(VERSIONS).map(([k, ver]) => `${LIB_TITLE[k as LibName]} ${ver}`).join(", ");
    $("footer").textContent = (server.length ? `Server results: ${server.join(", ")}. ` : "")
        + `Versions: ${v}. Regenerate with bun run bench:bun, bun run bench:node, then bun run bench:web.`;
    renderAll();
}

let resizeTimer = 0;
addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderChart, 120);
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderChart);
new MutationObserver(renderChart).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

boot();
