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

