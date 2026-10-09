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
    _re_v_atan,
    _re_v_neg,
    _re_v_ceil,
    _re_v_floor,
    _re_v_round,
    _re_v_isNaN,
    _re_v_isFinite,
    _re_v_clone,
    _re_v_conj,
} from "./maps";
import {
    _re_v_addVV, _re_v_addVS, _re_v_addSV,
    _re_v_subVV, _re_v_subVS, _re_v_subSV,
    _re_v_mulVV, _re_v_mulVS, _re_v_mulSV,
    _re_v_divVV, _re_v_divVS, _re_v_divSV,
    _re_v_modVV, _re_v_modVS, _re_v_modSV,
    _re_v_powVV, _re_v_powVS, _re_v_powSV,
    _re_v_atan2VV, _re_v_atan2VS, _re_v_atan2SV,
    _re_v_maxVV, _re_v_maxVS, _re_v_maxSV,
    _re_v_minVV, _re_v_minVS, _re_v_minSV,
    _re_v_eqVV, _re_v_eqVS, _re_v_eqSV,
    _re_v_neqVV, _re_v_neqVS, _re_v_neqSV,
    _re_v_ltVV, _re_v_ltVS, _re_v_ltSV,
    _re_v_gtVV, _re_v_gtVS, _re_v_gtSV,
    _re_v_leqVV, _re_v_leqVS, _re_v_leqSV,
    _re_v_geqVV, _re_v_geqVS, _re_v_geqSV,
} from "./binops";
import {
    _cx_v_neg,
    _cx_v_conj,
    _cx_v_abs,
    _cx_v_clone,
    _cx_v_exp,
    _cx_v_log,
    _cx_v_sqrt,
    _cx_v_sin,
    _cx_v_cos,
} from "./cx.maps";
import {
    _cx_v_addVV, _cx_v_addVS, _cx_v_addSV,
    _cx_v_subVV, _cx_v_subVS, _cx_v_subSV,
    _cx_v_mulVV, _cx_v_mulVS, _cx_v_mulSV,
    _cx_v_divVV, _cx_v_divVS, _cx_v_divSV,
    _cx_v_eqVV, _cx_v_eqVS, _cx_v_eqSV,
    _cx_v_neqVV, _cx_v_neqVS, _cx_v_neqSV,
} from "./cx.binops";
import {
    _cx_v_norm2,
    _cx_v_norm2squared,
    _cx_v_norm1,
    _cx_v_normInf,
} from "./cx.reducers";
import {
    _cx_v_sum,
    _cx_v_prod,
} from "./cx.cxreducers";

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
    // any/all on real data use truthiness, so the boolean kernels apply directly
    static _re_v_all = _bool_v_all as unknown as (x: number[], n: number) => boolean;
    static _re_v_any = _bool_v_any as unknown as (x: number[], n: number) => boolean;
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
    static _re_v_neg = _re_v_neg;
    static _re_v_ceil = _re_v_ceil;
    static _re_v_floor = _re_v_floor;
    static _re_v_round = _re_v_round;
    static _re_v_isNaN = _re_v_isNaN;
    static _re_v_isFinite = _re_v_isFinite;
    static _re_v_clone = _re_v_clone;
    static _re_v_conj = _re_v_conj;
    // Binary ops
    static _re_v_addVV = _re_v_addVV;
    static _re_v_addVS = _re_v_addVS;
    static _re_v_addSV = _re_v_addSV;
    static _re_v_subVV = _re_v_subVV;
    static _re_v_subVS = _re_v_subVS;
    static _re_v_subSV = _re_v_subSV;
    static _re_v_mulVV = _re_v_mulVV;
    static _re_v_mulVS = _re_v_mulVS;
    static _re_v_mulSV = _re_v_mulSV;
    static _re_v_divVV = _re_v_divVV;
    static _re_v_divVS = _re_v_divVS;
    static _re_v_divSV = _re_v_divSV;
    static _re_v_modVV = _re_v_modVV;
    static _re_v_modVS = _re_v_modVS;
    static _re_v_modSV = _re_v_modSV;
    static _re_v_powVV = _re_v_powVV;
    static _re_v_powVS = _re_v_powVS;
    static _re_v_powSV = _re_v_powSV;
    static _re_v_atan2VV = _re_v_atan2VV;
    static _re_v_atan2VS = _re_v_atan2VS;
    static _re_v_atan2SV = _re_v_atan2SV;
    static _re_v_maxVV = _re_v_maxVV;
    static _re_v_maxVS = _re_v_maxVS;
    static _re_v_maxSV = _re_v_maxSV;
    static _re_v_minVV = _re_v_minVV;
    static _re_v_minVS = _re_v_minVS;
    static _re_v_minSV = _re_v_minSV;
    static _re_v_eqVV = _re_v_eqVV;
    static _re_v_eqVS = _re_v_eqVS;
    static _re_v_eqSV = _re_v_eqSV;
    static _re_v_neqVV = _re_v_neqVV;
    static _re_v_neqVS = _re_v_neqVS;
    static _re_v_neqSV = _re_v_neqSV;
    static _re_v_ltVV = _re_v_ltVV;
    static _re_v_ltVS = _re_v_ltVS;
    static _re_v_ltSV = _re_v_ltSV;
    static _re_v_gtVV = _re_v_gtVV;
    static _re_v_gtVS = _re_v_gtVS;
    static _re_v_gtSV = _re_v_gtSV;
    static _re_v_leqVV = _re_v_leqVV;
    static _re_v_leqVS = _re_v_leqVS;
    static _re_v_leqSV = _re_v_leqSV;
    static _re_v_geqVV = _re_v_geqVV;
    static _re_v_geqVS = _re_v_geqVS;
    static _re_v_geqSV = _re_v_geqSV;
    // Complex maps
    static _cx_v_neg = _cx_v_neg;
    static _cx_v_conj = _cx_v_conj;
    static _cx_v_abs = _cx_v_abs;
    static _cx_v_clone = _cx_v_clone;
    static _cx_v_exp = _cx_v_exp;
    static _cx_v_log = _cx_v_log;
    static _cx_v_sqrt = _cx_v_sqrt;
    static _cx_v_sin = _cx_v_sin;
    static _cx_v_cos = _cx_v_cos;
    // Complex binary ops
    static _cx_v_addVV = _cx_v_addVV;
    static _cx_v_addVS = _cx_v_addVS;
    static _cx_v_addSV = _cx_v_addSV;
    static _cx_v_subVV = _cx_v_subVV;
    static _cx_v_subVS = _cx_v_subVS;
    static _cx_v_subSV = _cx_v_subSV;
    static _cx_v_mulVV = _cx_v_mulVV;
    static _cx_v_mulVS = _cx_v_mulVS;
    static _cx_v_mulSV = _cx_v_mulSV;
    static _cx_v_divVV = _cx_v_divVV;
    static _cx_v_divVS = _cx_v_divVS;
    static _cx_v_divSV = _cx_v_divSV;
    static _cx_v_eqVV = _cx_v_eqVV;
    static _cx_v_eqVS = _cx_v_eqVS;
    static _cx_v_eqSV = _cx_v_eqSV;
    static _cx_v_neqVV = _cx_v_neqVV;
    static _cx_v_neqVS = _cx_v_neqVS;
    static _cx_v_neqSV = _cx_v_neqSV;
    // Complex reducers
    static _cx_v_norm2 = _cx_v_norm2;
    static _cx_v_norm2squared = _cx_v_norm2squared;
    static _cx_v_norm1 = _cx_v_norm1;
    static _cx_v_normInf = _cx_v_normInf;

    static _cx_v_sum = _cx_v_sum;
    static _cx_v_prod = _cx_v_prod;
};