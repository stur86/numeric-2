import {
    _re_v_max,
    _re_v_min,
    _re_v_norm1,
    _re_v_norm2,
    _re_v_norm2squared,
    _re_v_normInf,
    _re_v_prod,
    _re_v_sum,
} from "./reducers";
import {
    _bool_v_all,
    _bool_v_any,
} from "./extra.reducers";
import {
    _re_v_sqrt,
    _re_v_abs,
    _re_v_exp,
    _re_v_log,
    _re_v_sin,
    _re_v_cos,
    _re_v_tan,
    _re_v_asin,
    _re_v_acos,
    _re_v_atan
} from "./maps";

export default class NumericCore {
    // Reducers
    static _re_v_max = _re_v_max;
    static _re_v_min = _re_v_min;
    static _re_v_norm1 = _re_v_norm1;
    static _re_v_norm2 = _re_v_norm2;
    static _re_v_norm2squared = _re_v_norm2squared;
    static _re_v_normInf = _re_v_normInf;
    static _re_v_prod = _re_v_prod;
    static _re_v_sum = _re_v_sum;
    static _bool_v_all = _bool_v_all;
    static _bool_v_any = _bool_v_any;
    // Maps
    static _re_v_sqrt = _re_v_sqrt;
    static _re_v_abs = _re_v_abs;
    static _re_v_exp = _re_v_exp;
    static _re_v_log = _re_v_log;
    static _re_v_sin = _re_v_sin;
    static _re_v_cos = _re_v_cos;
    static _re_v_tan = _re_v_tan;
    static _re_v_asin = _re_v_asin;
    static _re_v_acos = _re_v_acos;
    static _re_v_atan = _re_v_atan;
};