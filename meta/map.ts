const VECTOR_MAP_TEMPLATE = (await Bun.file(import.meta.dir + "/v.map.template.tjs").text());

export type VectorMapMetaFunctionArgs = {
    name: string;
    dataArgs?: string[];
    mapElement?: string;
    /** Element type of the result array (default 'number'). */
    returnType?: string;
};

const DEFAULT_ARGS: Required<VectorMapMetaFunctionArgs> = {
    name: '',
    dataArgs: ['x'],
    mapElement: 'x_i',
    returnType: 'number',
};


export class VectorMapMetaFunction {
    name: string;
    dataArgs: string[];
    mapElement: string;
    returnType: string;

    constructor(args: VectorMapMetaFunctionArgs) {
        const { name, dataArgs, mapElement, returnType } = { ...DEFAULT_ARGS, ...args };
        this.name = name;
        this.dataArgs = dataArgs;
        this.mapElement = mapElement;
        this.returnType = returnType;
    }

    compileSource(): string {
        let source = VECTOR_MAP_TEMPLATE.slice();
        source = source.replaceAll("$NAME", this.name);
        source = source.replaceAll("$RETURN_TYPE", this.returnType);
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