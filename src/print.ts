/**
 * Human-readable formatting of numbers, arrays, tensors and result objects
 * (numeric.js's prettyPrint, extended).
 *
 * This module avoids importing the tensor classes (they use it for
 * toString()), so it recognizes them structurally.
 */

export type PrettyPrintOptions = {
    /** Significant digits (default 4, as numeric.js). */
    precision?: number;
    /** Arrays longer than this are summarized (default 50, as numeric.js's largeArray). */
    threshold?: number;
    /** Entries shown at each end of a summarized array (default 3). */
    edgeItems?: number;
};

type Opts = Required<PrettyPrintOptions>;
const DEFAULTS: Opts = { precision: 4, threshold: 50, edgeItems: 3 };

/** numeric.js's number formatting: the shortest of a few renderings at the given precision. */
function fmtNumber(x: number, p: number): string {
    if (x === 0) return Object.is(x, -0) ? "-0" : "0";
    if (Number.isNaN(x)) return "NaN";
    if (!Number.isFinite(x)) return x > 0 ? "Infinity" : "-Infinity";
    const sci = (v: number): string => {
        if (v < 0) return "-" + sci(-v);
        let scale = Math.floor(Math.log10(v));
        let basic = (v / 10 ** scale).toPrecision(p);
        if (parseFloat(basic) === 10) {
            scale++;
            basic = (1).toPrecision(p);
        }
        return `${parseFloat(basic)}e${scale}`;
    };
    const b = x.toPrecision(p);
    const candidates = [sci(x), b, String(x), String(parseFloat(b))];
    return candidates.reduce((best, c) => (c.length < best.length ? c : best));
}

function fmtComplex(re: number, im: number, p: number): string {
    const r = fmtNumber(re, p), i = fmtNumber(Math.abs(im), p);
    return `${r}${im < 0 || Object.is(im, -0) ? "-" : "+"}${i}i`;
}

const isTensorLike = (x: any): boolean => x !== null && typeof x === "object" && "_re" in x && "_shape" in x;
const isSparse = (x: any): boolean => x !== null && typeof x === "object" && "colPtr" in x && "rowIdx" in x && "nrows" in x;
const isComplexScalar = (x: any): boolean =>
    x !== null && typeof x === "object" && !Array.isArray(x) && typeof x.re === "number" && typeof x.im === "number" && Object.keys(x).length === 2;

/** Indices shown for an array of length n (null marks the "..." gap). */
function shownIndices(n: number, o: Opts): (number | null)[] {
    if (n <= o.threshold) return Array.from({ length: n }, (_, i) => i);
    const e = Math.min(o.edgeItems, Math.floor(n / 2));
    return [...Array.from({ length: e }, (_, i) => i), null, ...Array.from({ length: e }, (_, i) => n - e + i)];
}

/** Format the leaves of a nested array, right-aligned to a common width. */
function formatNested(re: any, im: any, o: Opts, indent: string): string {
    // First pass: format every shown leaf, to find the column width
    const leaves: string[] = [];
    const collect = (r: any, i: any) => {
        if (Array.isArray(r)) {
            for (const k of shownIndices(r.length, o)) if (k !== null) collect(r[k], i === null ? null : i[k]);
            return;
        }
        leaves.push(leaf(r, i, o));
    };
    collect(re, im);
    const width = leaves.reduce((w, s) => Math.max(w, s.length), 0);

    const render = (r: any, i: any, depth: number): string => {
        if (!Array.isArray(r)) return leaf(r, i, o).padStart(width);
        const parts = shownIndices(r.length, o).map((k) => (k === null ? "...".padStart(Array.isArray(r[0]) ? 3 : width) : render(r[k], i === null ? null : i[k], depth + 1)));
        if (!Array.isArray(r[0])) return `[${parts.join(", ")}]`;
        // Nested: one sub-array per line, with a blank line between blocks of 3-D and higher
        const sep = Array.isArray(r[0][0]) ? ",\n\n" : ",\n";
        const pad = indent + " ".repeat(depth + 1);
        return `[${parts.join(sep + pad)}]`;
    };
    return render(re, im, 0);
}

function leaf(r: any, i: any, o: Opts): string {
    if (typeof r === "boolean") return String(r);
    if (typeof r !== "number") return String(r);
    return i === null || i === undefined ? fmtNumber(r, o.precision) : fmtComplex(r, i, o.precision);
}

function format(x: any, o: Opts, indent: string): string {
    if (typeof x === "number") return fmtNumber(x, o.precision);
    if (typeof x === "boolean") return String(x);
    if (typeof x === "string") return JSON.stringify(x);
    if (x === null || x === undefined) return String(x);
    if (isComplexScalar(x)) return fmtComplex(x.re, x.im, o.precision);
    if (Array.isArray(x)) return x.length === 0 ? "[]" : formatNested(x, null, o, indent);
    if (isTensorLike(x)) return formatNested(x._re, x._im, o, indent);
    if (isSparse(x)) return formatSparse(x, o, indent);
    if (typeof x === "object") {
        const keys = Object.keys(x);
        if (keys.length === 0) return "{}";
        const inner = indent + "  ";
        const body = keys.map((k) => `${inner}${k}: ${format(x[k], o, inner + " ".repeat(k.length + 2))}`);
        return `{\n${body.join(",\n")}\n${indent}}`;
    }
    return String(x);
}

function formatSparse(S: any, o: Opts, indent: string): string {
    const nz: [number, number, number][] = [];
    for (let j = 0; j < S.ncols; j++) {
        for (let p = S.colPtr[j]; p < S.colPtr[j + 1]; p++) nz.push([S.rowIdx[p], j, S.values[p]]);
    }
    nz.sort((a, b) => a[0] - b[0] || a[1] - b[1]); // row-major reading order
    const head = `SparseMatrix ${S.nrows}x${S.ncols}, ${nz.length} nonzero${nz.length === 1 ? "" : "s"}`;
    if (nz.length === 0) return head;
    const shown = shownIndices(nz.length, o);
    const coords = shown.map((k) => (k === null ? "" : `(${nz[k][0]}, ${nz[k][1]})`));
    const cw = coords.reduce((w, s) => Math.max(w, s.length), 0);
    const vals = shown.map((k) => (k === null ? "" : fmtNumber(nz[k][2], o.precision)));
    const vw = vals.reduce((w, s) => Math.max(w, s.length), 0);
    const lines = shown.map((k, t) => (k === null ? `${indent}  ...` : `${indent}  ${coords[t].padEnd(cw)}  ${vals[t].padStart(vw)}`));
    return `${head}\n${lines.join("\n")}`;
}

/**
 * A readable string for a number, complex scalar, (nested) array, Vector,
 * Matrix, Tensor, SparseMatrix, or a plain object of these (e.g. eig's result).
 *
 * Numbers use `precision` significant digits in their shortest form and are
 * right-aligned in columns; arrays longer than `threshold` are summarized.
 */
export function prettyPrint(x: unknown, options: PrettyPrintOptions = {}): string {
    return format(x, { ...DEFAULTS, ...options }, "");
}
