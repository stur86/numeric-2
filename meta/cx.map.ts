const CX_VECTOR_MAP_TEMPLATE = (await Bun.file(import.meta.dir + "/cx.v.map.template.tjs").text());

export type CxVectorMapMetaFunctionArgs = {
    name: string;
    mapRe: string;
    mapIm: string;
};

export class CxVectorMapMetaFunction {
    name: string;
    mapRe: string;
    mapIm: string;

    constructor(args: CxVectorMapMetaFunctionArgs) {
        this.name = args.name;
        this.mapRe = args.mapRe;
        this.mapIm = args.mapIm;
    }

    compileSource(): string {
        let source = CX_VECTOR_MAP_TEMPLATE.slice();
        source = source.replaceAll("$NAME", this.name);
        const mapRe = this.mapRe
            .replaceAll('x_re_i', 'x_re[i]')
            .replaceAll('x_im_i', 'x_im[i]');
        const mapIm = this.mapIm
            .replaceAll('x_re_i', 'x_re[i]')
            .replaceAll('x_im_i', 'x_im[i]');
        source = source.replaceAll("$MAP_RE", mapRe);
        source = source.replaceAll("$MAP_IM", mapIm);
        return source;
    }
}