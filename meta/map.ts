const VECTOR_MAP_TEMPLATE = (await Bun.file(import.meta.dir + "/v.map.template.tjs").text());

export type VectorMapMetaFunctionArgs = {
    name: string;
    dataArgs?: string[];
    mapElement?: string;
};

const DEFAULT_ARGS: Required<VectorMapMetaFunctionArgs> = {
    name: '',
    dataArgs: ['x'],
    mapElement: 'x_i'
};


export class VectorMapMetaFunction {
    name: string;
    dataArgs: string[];
    mapElement: string;

    constructor(args: VectorMapMetaFunctionArgs) {
        const { name, dataArgs, mapElement } = { ...DEFAULT_ARGS, ...args };
        this.name = name;
        this.dataArgs = dataArgs;
        this.mapElement = mapElement;
    }

    compileSource(): string {
        let source = VECTOR_MAP_TEMPLATE.slice();
        source = source.replaceAll("$NAME", this.name);
        const typedArgs = this.dataArgs.map((arg) => `${arg}: number[]`).join(', ');
        source = source.replaceAll("$DATA_ARGS", typedArgs);
        const updateRes = this.dataArgs.reduce((acc, arg) => acc.replaceAll(`${arg}_i`, `${arg}[i]`), this.mapElement);
        source = source.replaceAll("$MAP_ELEMENT", updateRes);
        return source;
    }

    compile(): Function {
        const csource = this.compileSource();
        // Only inner part
        const csLines = csource.split('\n').slice(1, -1);        
        return Function(...this.dataArgs, 'n', csLines.join('\n')) as unknown as Function;
    }
}