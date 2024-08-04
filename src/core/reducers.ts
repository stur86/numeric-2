// Pipe all contents of the generated reducers.gen.ts file
import {
    _re_v_norm2squared,
    _re_v_norm1,
    _re_v_sum,
    _re_v_prod,
    _re_v_max,
    _re_v_min

} from "./reducers.gen.ts";

export function _re_v_norm2(x: number[], n: number): number {
    return Math.sqrt(_re_v_norm2squared(x, n));
}

export {
    _re_v_norm2squared,
    _re_v_norm1,
    _re_v_sum,
    _re_v_prod,
    _re_v_max,
    _re_v_min
}