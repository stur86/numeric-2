export function _cx_v_neg(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = -x_re[i];
        ans_im[i] = -x_im[i];
    }
    return [ans_re, ans_im];
}

export function _cx_v_conj(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re[i];
        ans_im[i] = -x_im[i];
    }
    return [ans_re, ans_im];
}

export function _cx_v_abs(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = Math.sqrt(x_re[i]*x_re[i]+x_im[i]*x_im[i]);
        ans_im[i] = 0;
    }
    return [ans_re, ans_im];
}

export function _cx_v_clone(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re[i];
        ans_im[i] = x_im[i];
    }
    return [ans_re, ans_im];
}

export function _cx_v_reciprocal(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        const d = x_re[i]*x_re[i] + x_im[i]*x_im[i];
        ans_re[i] = x_re[i] / d;
        ans_im[i] = -x_im[i] / d;
    }
    return [ans_re, ans_im];
}

export function _cx_v_exp(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        const e = Math.exp(x_re[i]);
        ans_re[i] = e*Math.cos(x_im[i]);
        ans_im[i] = e*Math.sin(x_im[i]);
    }
    return [ans_re, ans_im];
}

export function _cx_v_log(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = Math.log(Math.sqrt(x_re[i]*x_re[i]+x_im[i]*x_im[i]));
        ans_im[i] = Math.atan2(x_im[i], x_re[i]);
    }
    return [ans_re, ans_im];
}

export function _cx_v_sqrt(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        const r = Math.sqrt(x_re[i]*x_re[i]+x_im[i]*x_im[i]);
        ans_re[i] = Math.sqrt((r+x_re[i])/2);
        ans_im[i] = (x_im[i] < 0 ? -1 : 1)*Math.sqrt((r-x_re[i])/2);
    }
    return [ans_re, ans_im];
}

export function _cx_v_sin(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = Math.sin(x_re[i])*Math.cosh(x_im[i]);
        ans_im[i] = Math.cos(x_re[i])*Math.sinh(x_im[i]);
    }
    return [ans_re, ans_im];
}

export function _cx_v_cos(x_re: number[], x_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = Math.cos(x_re[i])*Math.cosh(x_im[i]);
        ans_im[i] = -Math.sin(x_re[i])*Math.sinh(x_im[i]);
    }
    return [ans_re, ans_im];
}

