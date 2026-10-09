const CX_VECTOR_MAP_TEMPLATE = (await Bun.file(import.meta.dir + "/cx.v.map.template.tjs").text());

export type CxVectorMapMetaFunctionArgs = {
    name: string;
    mapRe: string;
    mapIm: string;
    /** Optional statement run per element before mapRe/mapIm (e.g. `const e = Math.exp(x_re_i);`). */
    mapPre?: string;
};

export class CxVectorMapMetaFunction {
    name: string;
    mapRe: string;
    mapIm: string;
    mapPre: string;

    constructor(args: CxVectorMapMetaFunctionArgs) {
        this.name = args.name;
        this.mapRe = args.mapRe;
        this.mapIm = args.mapIm;
        this.mapPre = args.mapPre ?? '';
    }

    private replaceVars(expr: string): string {
        return expr
            .replaceAll('x_re_i', 'x_re[i]')
            .replaceAll('x_im_i', 'x_im[i]');
    }

    compileSource(): string {
        let source = CX_VECTOR_MAP_TEMPLATE.slice();
        source = source.replaceAll("$NAME", this.name);
        if (this.mapPre === '') {
            // Drop the placeholder line entirely
            source = source.replace(/^[ \t]*\$MAP_PRE\n/m, '');
        } else {
            source = source.replaceAll("$MAP_PRE", this.replaceVars(this.mapPre));
        }
        source = source.replaceAll("$MAP_RE", this.replaceVars(this.mapRe));
        source = source.replaceAll("$MAP_IM", this.replaceVars(this.mapIm));
        return source;
    }
}