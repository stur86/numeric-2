const VECTOR_BINOP_TEMPLATE = (await Bun.file(import.meta.dir + "/v.binop.template.tjs").text());

export type VectorBinopMetaFunctionArgs = {
    name: string;
    expression: string;
    returnType?: string;
};

const DEFAULT_ARGS: Required<VectorBinopMetaFunctionArgs> = {
    name: '',
    expression: 'x_i + y_i',
    returnType: 'number',
};

type BinopVariant = 'VV' | 'VS' | 'SV';

export class VectorBinopMetaFunction {
    name: string;
    expression: string;
    returnType: string;

    constructor(args: VectorBinopMetaFunctionArgs) {
        const { name, expression, returnType } = { ...DEFAULT_ARGS, ...args };
        this.name = name;
        this.expression = expression;
        this.returnType = returnType;
    }

    private compileVariant(variant: BinopVariant): string {
        let source = VECTOR_BINOP_TEMPLATE.slice();

        const fullName = `_re_v_${this.name}${variant}`;
        source = source.replaceAll("$NAME", fullName);
        source = source.replaceAll("$RETURN_TYPE", this.returnType);

        let args: string;
        let expr: string;

        switch (variant) {
            case 'VV':
                args = `x: ${this.returnType}[], y: ${this.returnType}[]`;
                expr = this.expression
                    .replaceAll('x_i', 'x[i]')
                    .replaceAll('y_i', 'y[i]');
                break;
            case 'VS':
                args = `x: ${this.returnType}[], y: ${this.returnType}`;
                expr = this.expression
                    .replaceAll('x_i', 'x[i]')
                    .replaceAll('y_i', 'y');
                break;
            case 'SV':
                args = `x: ${this.returnType}, y: ${this.returnType}[]`;
                expr = this.expression
                    .replaceAll('x_i', 'x')
                    .replaceAll('y_i', 'y[i]');
                break;
        }

        source = source.replaceAll("$ARGS", args);
        source = source.replaceAll("$EXPRESSION", expr);

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

    compile(variant: BinopVariant): Function {
        const csource = this.compileVariant(variant);
        const csLines = csource.split('\n').slice(1, -1);
        switch (variant) {
            case 'VV':
                return Function('x', 'y', 'n', csLines.join('\n'));
            case 'VS':
                return Function('x', 'y', 'n', csLines.join('\n'));
            case 'SV':
                return Function('x', 'y', 'n', csLines.join('\n'));
        }
    }
}