const SPARSE_BINOP_TEMPLATE = (await Bun.file(import.meta.dir + "/s.binop.template.tjs").text());

/**
 * Element-wise binary op on two sparse (CCS) matrices with sorted row indices,
 * over the union of their patterns. Exact zeros are dropped from the result,
 * so only ops with op(0, 0) = 0 make sense here.
 *
 * Expression variables: x_i, y_i (the two entries; 0 where a matrix has none).
 */
export type SparseBinopMetaFunctionArgs = {
    name: string;
    expression: string;
};

export class SparseBinopMetaFunction {
    name: string;
    expression: string;

    constructor(args: SparseBinopMetaFunctionArgs) {
        this.name = args.name;
        this.expression = args.expression;
    }

    compileSource(): string {
        const expr = this.expression.replaceAll("x_i", "xk").replaceAll("y_i", "yk");
        return SPARSE_BINOP_TEMPLATE.slice()
            .replaceAll("$NAME", `_re_s_${this.name}SS`)
            .replaceAll("$EXPRESSION", expr);
    }
}
