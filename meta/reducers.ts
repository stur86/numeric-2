const REDUCER_TEMPLATE_LINES = (await Bun.file(import.meta.dir + "/reducer.template.tjs").text()).split('\n');


export class VectorReducerMetaFunction {
    name: string;
    dataArgs: string[];
    reduceElement: string;
    reduceOperator: string;
    initElement: string;


    constructor(name: string, 
                dataArgs: string[] = ['x'],
                reduceElement: string = 'x_i*x_i',
                reduceOperator: string = '+=', 
                initElement: string | null = null) {
        this.name = name;
        this.dataArgs = dataArgs;
        this.reduceElement = reduceElement;
        this.reduceOperator = reduceOperator;
        this.initElement = initElement ?? this.reduceElement;
    }

    compileSource(): string {
        let source = REDUCER_TEMPLATE_LINES.join('\n');
        source = source.replaceAll("$NAME", this.name);
        const typedArgs = this.dataArgs.map((arg) => `${arg}: number[]`).join(', ');
        source = source.replaceAll("$DATA_ARGS", typedArgs);
        const initRes = this.dataArgs.reduce((acc, arg) => acc.replaceAll(`${arg}_i`, `${arg}[i]`), this.initElement);
        source = source.replaceAll("$REDUCE_ELEMENT_INIT", initRes);
        const updateRes = this.dataArgs.reduce((acc, arg) => acc.replaceAll(`${arg}_i`, `${arg}[i]`), this.reduceElement);
        source = source.replaceAll("$REDUCE_OPERATOR", this.reduceOperator);
        source = source.replaceAll("$REDUCE_ELEMENT", updateRes);
        return source;
    }

    compile(): Function {
        const csource = this.compileSource();
        // Only inner part
        const csLines = csource.split('\n').slice(1, -1);        
        return Function(...this.dataArgs, 'n', csLines.join('\n')) as unknown as Function;
    }
}