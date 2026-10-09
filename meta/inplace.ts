/**
 * In-place variants of the element-wise kernels: they write into their first
 * argument (and return it) instead of allocating a result.
 *
 * They reuse the expressions of the regular kernels; the expression variables
 * are the same (x_i / y_i for real ops, x_re_i / x_im_i / y_re_i / y_im_i for
 * complex ones). Complex templates compute the real part into a temporary
 * first, so the imaginary expression still sees the old value of x.
 * Only VV and VS variants exist: the target is always the first operand.
 */
const load = async (f: string) => Bun.file(import.meta.dir + "/" + f).text();
const V_IMAP = await load("v.imap.template.tjs");
const V_IBINOP = await load("v.ibinop.template.tjs");
const CX_V_IMAP = await load("cx.v.imap.template.tjs");
const CX_V_IBINOP = await load("cx.v.ibinop.template.tjs");

type Variant = "VV" | "VS";

/** Real in-place map: `_re_v_i${name}(x, n)`. */
export class InPlaceMapMetaFunction {
    constructor(readonly name: string, readonly mapElement: string) {}
    get fullName() { return `_re_v_i${this.name}`; }
    compileSource(): string {
        return V_IMAP.replaceAll("$NAME", this.fullName).replaceAll("$MAP_ELEMENT", this.mapElement.replaceAll("x_i", "x[i]"));
    }
}

/** Real in-place binary op: `_re_v_i${name}VV(x, y, n)` and `...VS(x, y, n)`. */
export class InPlaceBinopMetaFunction {
    constructor(readonly name: string, readonly expression: string) {}
    private variant(v: Variant): string {
        const args = v === "VV" ? "x: number[], y: number[]" : "x: number[], y: number";
        const expr = this.expression.replaceAll("x_i", "x[i]").replaceAll("y_i", v === "VV" ? "y[i]" : "y");
        return V_IBINOP.replaceAll("$NAME", `_re_v_i${this.name}${v}`).replaceAll("$ARGS", args).replaceAll("$EXPRESSION", expr);
    }
    compileAllSource(): string {
        return [this.variant("VV"), this.variant("VS")].join("\n\n");
    }
}

const cxVars = (expr: string, yScalar: boolean) => expr
    .replaceAll("x_re_i", "x_re[i]").replaceAll("x_im_i", "x_im[i]")
    .replaceAll("y_re_i", yScalar ? "y_re" : "y_re[i]").replaceAll("y_im_i", yScalar ? "y_im" : "y_im[i]");

/** Complex in-place map: `_cx_v_i${name}(x_re, x_im, n)`. */
export class CxInPlaceMapMetaFunction {
    constructor(readonly name: string, readonly mapRe: string, readonly mapIm: string, readonly mapPre: string = "") {}
    get fullName() { return `_cx_v_i${this.name}`; }
    compileSource(): string {
        let s = CX_V_IMAP.replaceAll("$NAME", this.fullName);
        s = this.mapPre === "" ? s.replace(/^[ \t]*\$MAP_PRE\n/m, "") : s.replaceAll("$MAP_PRE", cxVars(this.mapPre, false));
        return s.replaceAll("$MAP_RE", cxVars(this.mapRe, false)).replaceAll("$MAP_IM", cxVars(this.mapIm, false));
    }
}

/** Complex in-place binary op: `_cx_v_i${name}VV(x_re, x_im, y_re, y_im, n)` and `...VS`. */
export class CxInPlaceBinopMetaFunction {
    constructor(readonly name: string, readonly expressionRe: string, readonly expressionIm: string) {}
    private variant(v: Variant): string {
        const args = v === "VV"
            ? "x_re: number[], x_im: number[], y_re: number[], y_im: number[]"
            : "x_re: number[], x_im: number[], y_re: number, y_im: number";
        return CX_V_IBINOP.replaceAll("$NAME", `_cx_v_i${this.name}${v}`).replaceAll("$ARGS", args)
            .replaceAll("$EXPRESSION_RE", cxVars(this.expressionRe, v === "VS"))
            .replaceAll("$EXPRESSION_IM", cxVars(this.expressionIm, v === "VS"));
    }
    compileAllSource(): string {
        return [this.variant("VV"), this.variant("VS")].join("\n\n");
    }
}
