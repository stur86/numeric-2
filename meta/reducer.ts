const VECTOR_REDUCER_TEMPLATE = (await Bun.file(import.meta.dir + "/v.reducer.template.tjs").text());

export type VectorReducerMetaFunctionArgs = {
    name: string;
    dataArgs?: string[];
    reduceElement?: string;
    reduceOperator?: string;
    initElement?: string | null;
    resultTransform?: string;
};

const DEFAULT_ARGS: Required<VectorReducerMetaFunctionArgs> = {
    name: '',
    dataArgs: ['x'],
    reduceElement: 'x_i*x_i',
    reduceOperator: '+=',
    initElement: null,
    resultTransform: 'ans',
};


export class VectorReducerMetaFunction {
    name: string;
    dataArgs: string[];
    reduceElement: string;
    reduceOperator: string;
    initElement: string;
    resultTransform: string;

    constructor(args: VectorReducerMetaFunctionArgs) {
        const { name, dataArgs, reduceElement, reduceOperator, initElement, resultTransform } = { ...DEFAULT_ARGS, ...args };
        this.name = name;
        this.dataArgs = dataArgs;
        this.reduceElement = reduceElement;
        this.reduceOperator = reduceOperator;
        this.initElement = initElement ?? this.reduceElement;
        this.resultTransform = resultTransform;
    }

    compileSource(): string {
        let source = VECTOR_REDUCER_TEMPLATE.slice();
        source = source.replaceAll("$NAME", this.name);
        const typedArgs = this.dataArgs.map((arg) => `${arg}: number[]`).join(', ');
        source = source.replaceAll("$DATA_ARGS", typedArgs);
        const initRes = this.dataArgs.reduce((acc, arg) => acc.replaceAll(`${arg}_i`, `${arg}[i]`), this.initElement);
        source = source.replaceAll("$REDUCE_ELEMENT_INIT", initRes);
        const updateRes = this.dataArgs.reduce((acc, arg) => acc.replaceAll(`${arg}_i`, `${arg}[i]`), this.reduceElement);
        source = source.replaceAll("$REDUCE_OPERATOR", this.reduceOperator);
        source = source.replaceAll("$REDUCE_ELEMENT", updateRes);
        source = source.replaceAll("$TRANSFORMED_RESULT", this.resultTransform);
        return source;
    }

    compile(): Function {
        const csource = this.compileSource();
        // Only inner part
        const csLines = csource.split('\n').slice(1, -1);        
        return Function(...this.dataArgs, 'n', csLines.join('\n')) as unknown as Function;
    }
}