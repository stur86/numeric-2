const CX_VECTOR_CXREDUCER_TEMPLATE = (await Bun.file(import.meta.dir + "/cx.v.cxreducer.template.tjs").text());

/**
 * A reducer over a complex vector with a complex result, returned as [re, im].
 *
 * Expressions may use x_re_i, x_im_i (current element) and ans_re, ans_im
 * (accumulator). Both reduce expressions see the accumulator's previous value.
 * The accumulator starts from initRe/initIm evaluated at i = n-1.
 */
export type CxVectorCxReducerMetaFunctionArgs = {
    name: string;
    reduceRe: string;
    reduceIm: string;
    initRe?: string;
    initIm?: string;
};

export class CxVectorCxReducerMetaFunction {
    name: string;
    reduceRe: string;
    reduceIm: string;
    initRe: string;
    initIm: string;

    constructor(args: CxVectorCxReducerMetaFunctionArgs) {
        this.name = args.name;
        this.reduceRe = args.reduceRe;
        this.reduceIm = args.reduceIm;
        this.initRe = args.initRe ?? 'x_re_i';
        this.initIm = args.initIm ?? 'x_im_i';
    }

    private replaceVars(expr: string): string {
        return expr
            .replaceAll('x_re_i', 'x_re[i]')
            .replaceAll('x_im_i', 'x_im[i]');
    }

    compileSource(): string {
        let source = CX_VECTOR_CXREDUCER_TEMPLATE.slice();
        source = source.replaceAll("$NAME", this.name);
        source = source.replaceAll("$INIT_RE", this.replaceVars(this.initRe));
        source = source.replaceAll("$INIT_IM", this.replaceVars(this.initIm));
        source = source.replaceAll("$REDUCE_RE", this.replaceVars(this.reduceRe));
        source = source.replaceAll("$REDUCE_IM", this.replaceVars(this.reduceIm));
        return source;
    }
}
