export function _re_v_isqrt(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.sqrt(x[i]);
    }
    return x;
}

export function _re_v_iabs(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.abs(x[i]);
    }
    return x;
}

export function _re_v_iexp(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.exp(x[i]);
    }
    return x;
}

export function _re_v_ilog(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.log(x[i]);
    }
    return x;
}

export function _re_v_isin(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.sin(x[i]);
    }
    return x;
}

export function _re_v_icos(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.cos(x[i]);
    }
    return x;
}

export function _re_v_itan(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.tan(x[i]);
    }
    return x;
}

export function _re_v_iasin(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.asin(x[i]);
    }
    return x;
}

export function _re_v_iacos(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.acos(x[i]);
    }
    return x;
}

export function _re_v_iatan(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.atan(x[i]);
    }
    return x;
}

export function _re_v_ineg(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = -x[i];
    }
    return x;
}

export function _re_v_iceil(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.ceil(x[i]);
    }
    return x;
}

export function _re_v_ifloor(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.floor(x[i]);
    }
    return x;
}

export function _re_v_iround(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.round(x[i]);
    }
    return x;
}

export function _re_v_iconj(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i];
    }
    return x;
}

export function _re_v_ireciprocal(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = 1 / x[i];
    }
    return x;
}

export function _re_v_ibnot(x: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = ~x[i];
    }
    return x;
}

export function _re_v_iaddVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] + y[i];
    }
    return x;
}

export function _re_v_iaddVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] + y;
    }
    return x;
}

export function _re_v_isubVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] - y[i];
    }
    return x;
}

export function _re_v_isubVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] - y;
    }
    return x;
}

export function _re_v_imulVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] * y[i];
    }
    return x;
}

export function _re_v_imulVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] * y;
    }
    return x;
}

export function _re_v_idivVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] / y[i];
    }
    return x;
}

export function _re_v_idivVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] / y;
    }
    return x;
}

export function _re_v_imodVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] % y[i];
    }
    return x;
}

export function _re_v_imodVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] % y;
    }
    return x;
}

export function _re_v_ipowVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.pow(x[i], y[i]);
    }
    return x;
}

export function _re_v_ipowVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.pow(x[i], y);
    }
    return x;
}

export function _re_v_iatan2VV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.atan2(x[i], y[i]);
    }
    return x;
}

export function _re_v_iatan2VS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.atan2(x[i], y);
    }
    return x;
}

export function _re_v_imaxVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.max(x[i], y[i]);
    }
    return x;
}

export function _re_v_imaxVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.max(x[i], y);
    }
    return x;
}

export function _re_v_iminVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.min(x[i], y[i]);
    }
    return x;
}

export function _re_v_iminVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.min(x[i], y);
    }
    return x;
}

export function _re_v_ibandVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] & y[i];
    }
    return x;
}

export function _re_v_ibandVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] & y;
    }
    return x;
}

export function _re_v_iborVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] | y[i];
    }
    return x;
}

export function _re_v_iborVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] | y;
    }
    return x;
}

export function _re_v_ibxorVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] ^ y[i];
    }
    return x;
}

export function _re_v_ibxorVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] ^ y;
    }
    return x;
}

export function _re_v_ilshiftVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] << y[i];
    }
    return x;
}

export function _re_v_ilshiftVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] << y;
    }
    return x;
}

export function _re_v_irshiftVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] >> y[i];
    }
    return x;
}

export function _re_v_irshiftVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] >> y;
    }
    return x;
}

export function _re_v_irrshiftVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] >>> y[i];
    }
    return x;
}

export function _re_v_irrshiftVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = x[i] >>> y;
    }
    return x;
}

export function _re_v_itruncVV(x: number[], y: number[], n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.round(x[i] / y[i]) * y[i];
    }
    return x;
}

export function _re_v_itruncVS(x: number[], y: number, n: number): number[] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        x[i] = Math.round(x[i] / y) * y;
    }
    return x;
}

export function _cx_v_ineg(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = -x_re[i];
        x_im[i] = -x_im[i];
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_iconj(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = x_re[i];
        x_im[i] = -x_im[i];
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_iexp(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const e = Math.exp(x_re[i]);
        const t_re = e*Math.cos(x_im[i]);
        x_im[i] = e*Math.sin(x_im[i]);
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_ilog(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = Math.log(Math.sqrt(x_re[i]*x_re[i]+x_im[i]*x_im[i]));
        x_im[i] = Math.atan2(x_im[i], x_re[i]);
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_isqrt(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const r = Math.sqrt(x_re[i]*x_re[i]+x_im[i]*x_im[i]);
        const t_re = Math.sqrt((r+x_re[i])/2);
        x_im[i] = (x_im[i] < 0 ? -1 : 1)*Math.sqrt((r-x_re[i])/2);
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_isin(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = Math.sin(x_re[i])*Math.cosh(x_im[i]);
        x_im[i] = Math.cos(x_re[i])*Math.sinh(x_im[i]);
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_icos(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = Math.cos(x_re[i])*Math.cosh(x_im[i]);
        x_im[i] = -Math.sin(x_re[i])*Math.sinh(x_im[i]);
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_ireciprocal(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const d = x_re[i]*x_re[i] + x_im[i]*x_im[i];
        const t_re = x_re[i] / d;
        x_im[i] = -x_im[i] / d;
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_iaddVV(x_re: number[], x_im: number[], y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = x_re[i] + y_re[i];
        x_im[i] = x_im[i] + y_im[i];
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_iaddVS(x_re: number[], x_im: number[], y_re: number, y_im: number, n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = x_re[i] + y_re;
        x_im[i] = x_im[i] + y_im;
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_isubVV(x_re: number[], x_im: number[], y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = x_re[i] - y_re[i];
        x_im[i] = x_im[i] - y_im[i];
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_isubVS(x_re: number[], x_im: number[], y_re: number, y_im: number, n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = x_re[i] - y_re;
        x_im[i] = x_im[i] - y_im;
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_imulVV(x_re: number[], x_im: number[], y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = x_re[i]*y_re[i] - x_im[i]*y_im[i];
        x_im[i] = x_re[i]*y_im[i] + x_im[i]*y_re[i];
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_imulVS(x_re: number[], x_im: number[], y_re: number, y_im: number, n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = x_re[i]*y_re - x_im[i]*y_im;
        x_im[i] = x_re[i]*y_im + x_im[i]*y_re;
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_idivVV(x_re: number[], x_im: number[], y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = (x_re[i]*y_re[i]+x_im[i]*y_im[i])/(y_re[i]*y_re[i]+y_im[i]*y_im[i]);
        x_im[i] = (x_im[i]*y_re[i]-x_re[i]*y_im[i])/(y_re[i]*y_re[i]+y_im[i]*y_im[i]);
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

export function _cx_v_idivVS(x_re: number[], x_im: number[], y_re: number, y_im: number, n: number): [number[], number[]] {
    let i = n-1;
    for (; i >= 0; i -= 1) {
        const t_re = (x_re[i]*y_re+x_im[i]*y_im)/(y_re*y_re+y_im*y_im);
        x_im[i] = (x_im[i]*y_re-x_re[i]*y_im)/(y_re*y_re+y_im*y_im);
        x_re[i] = t_re;
    }
    return [x_re, x_im];
}

