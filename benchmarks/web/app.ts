/**
 * Benchmark page: shows server results (results.json) and runs the shared
 * suite in the browser. Bundled with numeric-2 into bench.js by build.ts.
 */
import * as numeric2 from "../../index";
import { runAll, type Measurement, type ResultFile, type LibName } from "../suites";

// ── Data model ──

type EnvId = "bun" | "node" | "browser";
const ENV_ORDER: EnvId[] = ["bun", "node", "browser"];
const ENV_TITLE: Record<EnvId, string> = { bun: "Bun (server)", node: "Node (server)", browser: "This browser" };
const ENV_VAR: Record<EnvId, string> = { bun: "--env-bun", node: "--env-node", browser: "--env-browser" };

type Run = ResultFile & { id: EnvId };
type Row = { suite: string; case: string; size: number; sizeLabel: string };
type Cell = Partial<Record<LibName, Measurement>>;

const runs = new Map<EnvId, Run>();
const state = {
    metric: "ratio" as "ratio" | "time",
    suite: "All",
    shown: new Set<EnvId>(ENV_ORDER),
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

function cell(env: EnvId, row: Row): Cell {
    const out: Cell = {};
    for (const m of runs.get(env)?.results ?? []) {
        if (rowKey(m) === rowKey(row)) out[m.lib] = m;
    }
    return out;
}

const ok = (m?: Measurement) => m !== undefined && Number.isFinite(m.median);

/** numeric.js time / numeric-2 time, with an IQR-based range. */
function ratio(c: Cell) {
    const a = c.numeric, b = c["numeric-2"];
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

const fmtRatio = (r: number) => `${r >= 10 ? r.toFixed(0) : r.toFixed(2)}×`;

function fmtPow2(e: number): string {
    if (e === 0) return "1×";
    return e > 0 ? `${2 ** e}×` : `1/${2 ** -e}×`;
}

// ── Environment tiles ──

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

function renderEnvs() {
    const host = $("envs");
    host.replaceChildren();
    for (const id of ENV_ORDER) {
        const run = runs.get(id);
        const tile = el("article", { class: "env" });
        const name = el("div", { class: "env-name" });
        const key = el("span", { class: "key dot" });
        key.style.background = `var(${ENV_VAR[id]})`;
        name.append(key, document.createTextNode(ENV_TITLE[id]));
        tile.append(name);

        if (!run) {
            tile.append(el("div", { class: "env-figure" }, "—"));
            tile.append(el("p", { class: "env-meta" }, id === "browser"
                ? "Not run yet. Use the buttons below to time both libraries in this browser."
                : "No results file. Run the benchmark on this runtime and rebuild the page."));
            if (id === "browser") tile.append(numericStatus());
            host.append(tile);
            continue;
        }

        const ratios = allRows().map((r) => ratio(cell(id, r))).filter((x) => x !== null).map((x) => x!.mid);
        const fig = el("div", { class: "env-figure" });
        if (ratios.length) {
            fig.append(document.createTextNode(fmtRatio(geomean(ratios))));
            fig.append(el("small", {}, " of numeric.js speed (geometric mean)"));
        } else {
            fig.append(document.createTextNode("—"));
        }
        tile.append(fig);
        if (ratios.length) {
            const faster = ratios.filter((r) => r > 1).length;
            tile.append(el("p", { class: "env-meta" }, `numeric-2 is faster in ${faster} of ${ratios.length} measurements.`));
        } else {
            tile.append(el("p", { class: "env-meta" }, "numeric.js did not run here, so there is no relative speed. Switch to Time per call to see numeric-2 alone."));
        }
        const meta = el("p", { class: "env-meta" });
        meta.append(el("span", { class: "num" }, run.env.runtime), document.createTextNode(` · ${run.env.platform} · ${new Date(run.env.date).toLocaleString()}`));
        tile.append(meta);
        if (id === "browser") tile.append(numericStatus());
        host.append(tile);
    }
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

// ── Controls ──

function suites(): string[] {
    return ["All", ...new Set(allRows().map((r) => r.suite))];
}

function renderControls() {
    const host = $("suites");
    host.replaceChildren();
    for (const s of suites()) {
        const b = el("button", { type: "button", "aria-pressed": String(s === state.suite) }, s);
        b.addEventListener("click", () => { state.suite = s; renderAll(); });
        host.append(b);
    }

    const toggles = $("env-toggles");
    toggles.replaceChildren();
    for (const id of ENV_ORDER) {
        if (!runs.has(id)) continue;
        const label = el("label");
        const box = el("input", { type: "checkbox", id: `show-${id}` }) as HTMLInputElement;
        box.checked = state.shown.has(id);
        box.addEventListener("change", () => {
            if (box.checked) state.shown.add(id); else state.shown.delete(id);
            renderChart();
            renderTable();
        });
        const key = el("span", { class: "key" });
        key.style.background = `var(${ENV_VAR[id]})`;
        label.append(box, key, document.createTextNode(ENV_TITLE[id]));
        toggles.append(label);
    }

    $("metric").querySelectorAll("button").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.metric === state.metric));
    });
}

$("metric").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    state.metric = b.dataset.metric as "ratio" | "time";
    renderControls();
    renderChart();
});

function visibleEnvs(): EnvId[] {
    return ENV_ORDER.filter((id) => runs.has(id) && state.shown.has(id));
}

function visibleRows(): Row[] {
    return allRows().filter((r) => state.suite === "All" || r.suite === state.suite);
}

// ── Chart ──

const ROW_H = 26, GROUP_H = 30, TOP = 46, BOTTOM = 10;

function renderLegend() {
    const host = $("legend");
    host.replaceChildren();
    for (const id of visibleEnvs()) {
        const s = el("span");
        const key = el("span", { class: "key dot" });
        key.style.background = `var(${ENV_VAR[id]})`;
        s.append(key, document.createTextNode(ENV_TITLE[id]));
        host.append(s);
    }
    if (state.metric === "time") {
        const filled = el("span");
        const k1 = el("span", { class: "key dot" });
        k1.style.background = "var(--ink-2)";
        filled.append(k1, document.createTextNode("numeric-2"));
        const ring = el("span");
        const k2 = el("span", { class: "key dot" });
        k2.style.border = "2px solid var(--ink-2)";
        ring.append(k2, document.createTextNode("numeric.js"));
        host.append(filled, ring);
    }
}

function renderChart() {
    renderLegend();
    $("chart-title").textContent = state.metric === "ratio"
        ? "Speed of numeric-2 relative to numeric.js"
        : "Time per call (log scale)";

    const host = $("chart");
    host.replaceChildren();
    const envs = visibleEnvs();
    const rows = visibleRows();
    if (!envs.length || !rows.length) {
        host.append(el("p", { class: "empty" }, "No measurements to show. Turn on an environment above, or run the suite in this browser."));
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
    let ticks: { v: number; label: string; strong?: boolean }[] = [];
    if (state.metric === "ratio") {
        let maxE = 1;
        for (const r of rows) for (const id of envs) {
            const q = ratio(cell(id, r));
            if (q) maxE = Math.max(maxE, Math.ceil(Math.abs(Math.log2(q.mid)) + 0.25));
        }
        maxE = Math.min(maxE, 4);
        const lo = -maxE, hi = maxE;
        x = (v) => plotL + ((Math.log2(v) - lo) / (hi - lo)) * (plotR - plotL);
        for (let e = lo; e <= hi; e++) ticks.push({ v: 2 ** e, label: fmtPow2(e), strong: e === 0 });
    } else {
        let mn = Infinity, mx = -Infinity;
        for (const r of rows) for (const id of envs) {
            const c = cell(id, r);
            for (const m of [c.numeric, c["numeric-2"]]) if (ok(m)) { mn = Math.min(mn, m!.median); mx = Math.max(mx, m!.median); }
        }
        const lo = Math.floor(Math.log10(mn)), hi = Math.max(lo + 1, Math.ceil(Math.log10(mx)));
        x = (v) => plotL + ((Math.log10(v) - lo) / (hi - lo)) * (plotR - plotL);
        for (let e = lo; e <= hi; e++) ticks.push({ v: 10 ** e, label: fmtTime(10 ** e) });
    }
    const clampX = (px: number) => Math.min(plotR, Math.max(plotL, px));

    const root = svg("svg", { width, height, viewBox: `0 0 ${width} ${height}`, role: "img",
        "aria-label": state.metric === "ratio" ? "Dot chart of numeric-2 speed relative to numeric.js per benchmark and environment" : "Dot chart of time per call per benchmark and environment" });

    // Grid and ticks
    const grid = svg("g", { class: "tick" });
    // Label every tick only when they have room (~44px each); 1× is always labelled
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
        root.append(svg("text", { class: "axis-note", x: plotL, y: 14 }, narrow ? "◀ slower" : "◀ numeric.js faster"));
        root.append(svg("text", { class: "axis-note", x: plotR, y: 14, "text-anchor": "end" }, narrow ? "faster ▶" : "numeric-2 faster ▶"));
    }

    // Rows
    const offsets = envs.length === 1 ? [0] : envs.map((_, i) => (i - (envs.length - 1) / 2) * 6);
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

            envs.forEach((id, i) => {
                const color = css(ENV_VAR[id]);
                const yy = cy + offsets[i];
                const c = cell(id, r);
                if (state.metric === "ratio") {
                    const q = ratio(c);
                    if (!q) return;
                    root.append(svg("line", { x1: clampX(x(q.lo)), x2: clampX(x(q.hi)), y1: yy, y2: yy,
                        stroke: color, "stroke-width": 2, "stroke-linecap": "round", opacity: 0.45 }));
                    const px = x(q.mid);
                    if (px > plotR || px < plotL) {
                        // Off-scale: an arrowhead at the edge
                        const ex = clampX(px), dir = px > plotR ? 1 : -1;
                        root.append(svg("path", { d: `M${ex - 6 * dir},${yy - 5} L${ex},${yy} L${ex - 6 * dir},${yy + 5} Z`,
                            fill: color, stroke: css("--surface"), "stroke-width": 1.5 }));
                    } else {
                        root.append(svg("circle", { cx: px, cy: yy, r: 4.5, fill: color, stroke: css("--surface"), "stroke-width": 2 }));
                    }
                } else {
                    const a = c.numeric, b = c["numeric-2"];
                    if (ok(a) && ok(b)) {
                        root.append(svg("line", { x1: x(a!.median), x2: x(b!.median), y1: yy, y2: yy, stroke: color, "stroke-width": 1.5, opacity: 0.4 }));
                    }
                    if (ok(a)) root.append(svg("circle", { cx: x(a!.median), cy: yy, r: 4, fill: css("--surface"), stroke: color, "stroke-width": 2 }));
                    if (ok(b)) root.append(svg("circle", { cx: x(b!.median), cy: yy, r: 4.5, fill: color, stroke: css("--surface"), "stroke-width": 2 }));
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

// ── Tooltip ──

function agreementText(r: Row): { good: boolean | null; text: string } {
    const flags = visibleEnvs().map((id) => cell(id, r).numeric?.agrees ?? cell(id, r)["numeric-2"]?.agrees).filter((a) => a !== undefined);
    if (flags.some((a) => a === false)) return { good: false, text: "Results differ between libraries" };
    if (flags.some((a) => a === true)) return { good: true, text: "Results match" };
    return { good: null, text: "Results not compared" };
}

function showTooltip(r: Row, target: SVGElement, ev?: PointerEvent) {
    const tip = $("tooltip");
    tip.replaceChildren();
    tip.append(el("h3", {}, `${r.case} · ${r.sizeLabel}`));
    const table = el("table");
    for (const id of visibleEnvs()) {
        const c = cell(id, r);
        const q = ratio(c);
        const tr = el("tr");
        const name = el("td");
        const key = el("span", { class: "line-key" });
        key.style.background = `var(${ENV_VAR[id]})`;
        name.append(key, document.createTextNode(ENV_TITLE[id]));
        const val = el("td");
        val.append(el("span", { class: "v" }, q ? fmtRatio(q.mid) : "—"));
        tr.append(name, val);
        table.append(tr);
        const sub = el("tr");
        const fmtM = (m?: Measurement) => (ok(m) ? `${fmtTime(m!.median)} (${fmtTime(m!.p25)}–${fmtTime(m!.p75)})` : "not run");
        sub.append(el("td", { class: "sub", colspan: "2" }, `numeric.js ${fmtM(c.numeric)} · numeric-2 ${fmtM(c["numeric-2"])}`));
        table.append(sub);
    }
    tip.append(table);
    const agree = agreementText(r);
    if (agree.good !== null) tip.append(statusLine(agree.good, agree.text));
    else tip.append(el("div", { class: "sub" }, agree.text));

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
    const envs = visibleEnvs();
    const thead = el("thead");
    const h1 = el("tr");
    h1.append(el("th", { rowspan: "2" }, "Benchmark"), el("th", { rowspan: "2" }, "Size"));
    for (const id of envs) {
        const th = el("th", { colspan: "3", class: "env-col" }, ENV_TITLE[id]);
        th.style.setProperty("--env-color", `var(${ENV_VAR[id]})`);
        h1.append(th);
    }
    h1.append(el("th", { rowspan: "2" }, "Outputs"));
    const h2 = el("tr");
    for (const _ of envs) h2.append(el("th", {}, "numeric.js"), el("th", {}, "numeric-2"), el("th", {}, "relative"));
    thead.append(h1, h2);
    table.append(thead);

    const tbody = el("tbody");
    let prev = "";
    for (const r of visibleRows()) {
        const tr = el("tr");
        const first = prev !== `${r.suite}|${r.case}`;
        if (first) tr.classList.add("group-start");
        prev = `${r.suite}|${r.case}`;
        tr.append(el("td", {}, first ? r.case : ""), el("td", {}, r.sizeLabel));
        for (const id of envs) {
            const c = cell(id, r);
            const q = ratio(c);
            tr.append(el("td", {}, ok(c.numeric) ? fmtTime(c.numeric!.median) : "—"));
            tr.append(el("td", {}, ok(c["numeric-2"]) ? fmtTime(c["numeric-2"]!.median) : "—"));
            const td = el("td", {}, q ? fmtRatio(q.mid) : "—");
            if (q && q.mid >= 1.15) td.className = "faster";
            if (q && q.mid <= 1 / 1.15) td.className = "slower";
            tr.append(td);
        }
        const agree = agreementText(r);
        const td = el("td");
        if (agree.good !== null) td.append(statusLine(agree.good, agree.good ? "Match" : "Differ"));
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

const STORE_KEY = "numeric2-bench-browser-run";

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
    const env = { runtime: browserName(), platform: browserPlatform(), date: new Date().toISOString(), userAgent: navigator.userAgent };
    try {
        await runAll({ numeric: browserNumeric.lib, numeric2 }, {
            ...(quick ? { sampleMs: 10, samples: 7 } : { sampleMs: 25, samples: 15 }),
            onResult: async (m, done, total) => {
                results.push(m);
                bar.style.width = `${(100 * done) / total}%`;
                text.textContent = `${done} of ${total}: ${m.case}, ${m.sizeLabel} (${m.lib})`;
                // Show partial results as they arrive, then yield to the page
                if (m.lib === "numeric-2") {
                    runs.set("browser", { id: "browser", env, results: results.slice() });
                    if (done % 6 === 0) renderAll();
                }
                await new Promise((r) => setTimeout(r, 0));
            },
        });
        const run = { env, results };
        runs.set("browser", { id: "browser", ...run });
        state.shown.add("browser");
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
        ? `${browserName()} · numeric.js and numeric-2 available`
        : `${browserName()} · only numeric-2 can run here`;

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
    const server = ENV_ORDER.filter((id) => id !== "browser" && runs.has(id)).map((id) => runs.get(id)!.env.runtime);
    $("footer").textContent = server.length
        ? `Server results: ${server.join(", ")}. Regenerate with bun run bench:bun, bun run bench:node, then bun run bench:web.`
        : "";
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
