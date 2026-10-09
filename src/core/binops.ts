export function _re_v_addVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] + y[i];
    }
    return ans;
}

export function _re_v_addVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] + y;
    }
    return ans;
}

export function _re_v_addSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x + y[i];
    }
    return ans;
}

export function _re_v_subVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] - y[i];
    }
    return ans;
}

export function _re_v_subVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] - y;
    }
    return ans;
}

export function _re_v_subSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x - y[i];
    }
    return ans;
}

export function _re_v_mulVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] * y[i];
    }
    return ans;
}

export function _re_v_mulVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] * y;
    }
    return ans;
}

export function _re_v_mulSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x * y[i];
    }
    return ans;
}

export function _re_v_divVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] / y[i];
    }
    return ans;
}

export function _re_v_divVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] / y;
    }
    return ans;
}

export function _re_v_divSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x / y[i];
    }
    return ans;
}

export function _re_v_modVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] % y[i];
    }
    return ans;
}

export function _re_v_modVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] % y;
    }
    return ans;
}

export function _re_v_modSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x % y[i];
    }
    return ans;
}

export function _re_v_powVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.pow(x[i], y[i]);
    }
    return ans;
}

export function _re_v_powVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.pow(x[i], y);
    }
    return ans;
}

export function _re_v_powSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.pow(x, y[i]);
    }
    return ans;
}

export function _re_v_atan2VV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.atan2(x[i], y[i]);
    }
    return ans;
}

export function _re_v_atan2VS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.atan2(x[i], y);
    }
    return ans;
}

export function _re_v_atan2SV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.atan2(x, y[i]);
    }
    return ans;
}

export function _re_v_maxVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.max(x[i], y[i]);
    }
    return ans;
}

export function _re_v_maxVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.max(x[i], y);
    }
    return ans;
}

export function _re_v_maxSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.max(x, y[i]);
    }
    return ans;
}

export function _re_v_minVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.min(x[i], y[i]);
    }
    return ans;
}

export function _re_v_minVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.min(x[i], y);
    }
    return ans;
}

export function _re_v_minSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.min(x, y[i]);
    }
    return ans;
}

export function _re_v_eqVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] === y[i];
    }
    return ans;
}

export function _re_v_eqVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] === y;
    }
    return ans;
}

export function _re_v_eqSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x === y[i];
    }
    return ans;
}

export function _re_v_neqVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] !== y[i];
    }
    return ans;
}

export function _re_v_neqVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] !== y;
    }
    return ans;
}

export function _re_v_neqSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x !== y[i];
    }
    return ans;
}

export function _re_v_ltVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] < y[i];
    }
    return ans;
}

export function _re_v_ltVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] < y;
    }
    return ans;
}

export function _re_v_ltSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x < y[i];
    }
    return ans;
}

export function _re_v_gtVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] > y[i];
    }
    return ans;
}

export function _re_v_gtVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] > y;
    }
    return ans;
}

export function _re_v_gtSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x > y[i];
    }
    return ans;
}

export function _re_v_leqVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] <= y[i];
    }
    return ans;
}

export function _re_v_leqVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] <= y;
    }
    return ans;
}

export function _re_v_leqSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x <= y[i];
    }
    return ans;
}

export function _re_v_geqVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] >= y[i];
    }
    return ans;
}

export function _re_v_geqVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] >= y;
    }
    return ans;
}

export function _re_v_geqSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x >= y[i];
    }
    return ans;
}

export function _re_v_andVV(x: boolean[], y: boolean[], n: number): boolean[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = !!x[i] && !!y[i];
    }
    return ans;
}

export function _re_v_andVS(x: boolean[], y: boolean, n: number): boolean[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = !!x[i] && !!y;
    }
    return ans;
}

export function _re_v_andSV(x: boolean, y: boolean[], n: number): boolean[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = !!x && !!y[i];
    }
    return ans;
}

export function _re_v_orVV(x: boolean[], y: boolean[], n: number): boolean[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = !!x[i] || !!y[i];
    }
    return ans;
}

export function _re_v_orVS(x: boolean[], y: boolean, n: number): boolean[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = !!x[i] || !!y;
    }
    return ans;
}

export function _re_v_orSV(x: boolean, y: boolean[], n: number): boolean[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = !!x || !!y[i];
    }
    return ans;
}

export function _re_v_bandVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] & y[i];
    }
    return ans;
}

export function _re_v_bandVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] & y;
    }
    return ans;
}

export function _re_v_bandSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x & y[i];
    }
    return ans;
}

export function _re_v_borVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] | y[i];
    }
    return ans;
}

export function _re_v_borVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] | y;
    }
    return ans;
}

export function _re_v_borSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x | y[i];
    }
    return ans;
}

export function _re_v_bxorVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] ^ y[i];
    }
    return ans;
}

export function _re_v_bxorVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] ^ y;
    }
    return ans;
}

export function _re_v_bxorSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x ^ y[i];
    }
    return ans;
}

export function _re_v_lshiftVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] << y[i];
    }
    return ans;
}

export function _re_v_lshiftVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] << y;
    }
    return ans;
}

export function _re_v_lshiftSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x << y[i];
    }
    return ans;
}

export function _re_v_rshiftVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] >> y[i];
    }
    return ans;
}

export function _re_v_rshiftVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] >> y;
    }
    return ans;
}

export function _re_v_rshiftSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x >> y[i];
    }
    return ans;
}

export function _re_v_rrshiftVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] >>> y[i];
    }
    return ans;
}

export function _re_v_rrshiftVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x[i] >>> y;
    }
    return ans;
}

export function _re_v_rrshiftSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = x >>> y[i];
    }
    return ans;
}

export function _re_v_truncVV(x: number[], y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.round(x[i] / y[i]) * y[i];
    }
    return ans;
}

export function _re_v_truncVS(x: number[], y: number, n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.round(x[i] / y) * y;
    }
    return ans;
}

export function _re_v_truncSV(x: number, y: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.round(x / y[i]) * y[i];
    }
    return ans;
}

