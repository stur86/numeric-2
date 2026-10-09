const CX_VECTOR_BINOP_TEMPLATE = (await Bun.file(import.meta.dir + "/cx.v.binop.template.tjs").text());
const CX_VECTOR_BINOP_BOOL_TEMPLATE = (await Bun.file(import.meta.dir + "/cx.v.binop.bool.template.tjs").text());

/**
 * Either a complex-valued op (expressionRe + expressionIm, returns [re[], im[]])
 * or a boolean-valued one (expression, returns boolean[]).
 */
export type CxVectorBinopMetaFunctionArgs =
    | { name: string; expressionRe: string; expressionIm: string }
    | { name: string; expression: string };

type BinopVariant = 'VV' | 'VS' | 'SV';

export class CxVectorBinopMetaFunction {
    name: string;
    expressionRe: string;
    expressionIm: string;
    /** Boolean-valued expression; when set, the op returns boolean[]. */
    expression: string | null;

    constructor(args: CxVectorBinopMetaFunctionArgs) {
        this.name = args.name;
        if ('expression' in args) {
            this.expression = args.expression;
            this.expressionRe = this.expressionIm = '';
        } else {
            this.expression = null;
            this.expressionRe = args.expressionRe;
            this.expressionIm = args.expressionIm;
        }
    }

    private replaceVars(expr: string, variant: BinopVariant): string {
        switch (variant) {
            case 'VV':
                return expr
                    .replaceAll('x_re_i', 'x_re[i]')
                    .replaceAll('x_im_i', 'x_im[i]')
                    .replaceAll('y_re_i', 'y_re[i]')
                    .replaceAll('y_im_i', 'y_im[i]');
            case 'VS':
                return expr
                    .replaceAll('x_re_i', 'x_re[i]')
                    .replaceAll('x_im_i', 'x_im[i]')
                    .replaceAll('y_re_i', 'y_re')
                    .replaceAll('y_im_i', 'y_im');
            case 'SV':
                return expr
                    .replaceAll('x_re_i', 'x_re')
                    .replaceAll('x_im_i', 'x_im')
                    .replaceAll('y_re_i', 'y_re[i]')
                    .replaceAll('y_im_i', 'y_im[i]');
        }
    }

    private compileVariant(variant: BinopVariant): string {
        let source = (this.expression === null ? CX_VECTOR_BINOP_TEMPLATE : CX_VECTOR_BINOP_BOOL_TEMPLATE).slice();

        const fullName = `_cx_v_${this.name}${variant}`;
        source = source.replaceAll("$NAME", fullName);

        let args: string;
        switch (variant) {
            case 'VV':
                args = 'x_re: number[], x_im: number[], y_re: number[], y_im: number[]';
                break;
            case 'VS':
                args = 'x_re: number[], x_im: number[], y_re: number, y_im: number';
                break;
            case 'SV':
                args = 'x_re: number, x_im: number, y_re: number[], y_im: number[]';
                break;
        }

        source = source.replaceAll("$ARGS", args);
        if (this.expression !== null) {
            return source.replaceAll("$EXPRESSION", this.replaceVars(this.expression, variant));
        }
        source = source.replaceAll("$EXPRESSION_RE", this.replaceVars(this.expressionRe, variant));
        source = source.replaceAll("$EXPRESSION_IM", this.replaceVars(this.expressionIm, variant));

        return source;
    }

    compileSourceVV(): string {
        return this.compileVariant('VV');
    }

    compileSourceVS(): string {
        return this.compileVariant('VS');
    }

    compileSourceSV(): string {
        return this.compileVariant('SV');
    }

    compileAllSource(): string {
        return [
            this.compileVariant('VV'),
            this.compileVariant('VS'),
            this.compileVariant('SV'),
        ].join('\n\n');
    }
}