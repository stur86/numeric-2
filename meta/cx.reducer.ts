const CX_VECTOR_REDUCER_TEMPLATE = (await Bun.file(import.meta.dir + "/cx.v.reducer.template.tjs").text());

export type CxVectorReducerMetaFunctionArgs = {
    name: string;
    reduceElement: string;
    reduceOperator?: string;
    initElement?: string | null;
    resultTransform?: string;
};

const DEFAULT_ARGS = {
    reduceOperator: '+=',
    initElement: null as string | null,
    resultTransform: 'ans',
};

export class CxVectorReducerMetaFunction {
    name: string;
    reduceElement: string;
    reduceOperator: string;
    initElement: string;
    resultTransform: string;

    constructor(args: CxVectorReducerMetaFunctionArgs) {
        const merged = { ...DEFAULT_ARGS, ...args };
        this.name = merged.name;
        this.reduceElement = merged.reduceElement;
        this.reduceOperator = merged.reduceOperator;
        this.initElement = merged.initElement ?? this.reduceElement;
        this.resultTransform = merged.resultTransform;
    }

    private replaceVars(expr: string): string {
        return expr
            .replaceAll('x_re_i', 'x_re[i]')
            .replaceAll('x_im_i', 'x_im[i]');
    }

    compileSource(): string {
        let source = CX_VECTOR_REDUCER_TEMPLATE.slice();
        source = source.replaceAll("$NAME", this.name);
        source = source.replaceAll("$REDUCE_ELEMENT_INIT", this.replaceVars(this.initElement));
        source = source.replaceAll("$REDUCE_OPERATOR", this.reduceOperator);
        source = source.replaceAll("$REDUCE_ELEMENT", this.replaceVars(this.reduceElement));
        source = source.replaceAll("$TRANSFORMED_RESULT", this.resultTransform);
        return source;
    }
}