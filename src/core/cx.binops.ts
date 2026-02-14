export function _cx_v_addVV(x_re: number[], x_im: number[], y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re[i] + y_re[i];
        ans_im[i] = x_im[i] + y_im[i];
    }
    return [ans_re, ans_im];
}

export function _cx_v_addVS(x_re: number[], x_im: number[], y_re: number, y_im: number, n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re[i] + y_re;
        ans_im[i] = x_im[i] + y_im;
    }
    return [ans_re, ans_im];
}

export function _cx_v_addSV(x_re: number, x_im: number, y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re + y_re[i];
        ans_im[i] = x_im + y_im[i];
    }
    return [ans_re, ans_im];
}

export function _cx_v_subVV(x_re: number[], x_im: number[], y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re[i] - y_re[i];
        ans_im[i] = x_im[i] - y_im[i];
    }
    return [ans_re, ans_im];
}

export function _cx_v_subVS(x_re: number[], x_im: number[], y_re: number, y_im: number, n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re[i] - y_re;
        ans_im[i] = x_im[i] - y_im;
    }
    return [ans_re, ans_im];
}

export function _cx_v_subSV(x_re: number, x_im: number, y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re - y_re[i];
        ans_im[i] = x_im - y_im[i];
    }
    return [ans_re, ans_im];
}

export function _cx_v_mulVV(x_re: number[], x_im: number[], y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re[i]*y_re[i] - x_im[i]*y_im[i];
        ans_im[i] = x_re[i]*y_im[i] + x_im[i]*y_re[i];
    }
    return [ans_re, ans_im];
}

export function _cx_v_mulVS(x_re: number[], x_im: number[], y_re: number, y_im: number, n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re[i]*y_re - x_im[i]*y_im;
        ans_im[i] = x_re[i]*y_im + x_im[i]*y_re;
    }
    return [ans_re, ans_im];
}

export function _cx_v_mulSV(x_re: number, x_im: number, y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = x_re*y_re[i] - x_im*y_im[i];
        ans_im[i] = x_re*y_im[i] + x_im*y_re[i];
    }
    return [ans_re, ans_im];
}

export function _cx_v_divVV(x_re: number[], x_im: number[], y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = (x_re[i]*y_re[i]+x_im[i]*y_im[i])/(y_re[i]*y_re[i]+y_im[i]*y_im[i]);
        ans_im[i] = (x_im[i]*y_re[i]-x_re[i]*y_im[i])/(y_re[i]*y_re[i]+y_im[i]*y_im[i]);
    }
    return [ans_re, ans_im];
}

export function _cx_v_divVS(x_re: number[], x_im: number[], y_re: number, y_im: number, n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = (x_re[i]*y_re+x_im[i]*y_im)/(y_re*y_re+y_im*y_im);
        ans_im[i] = (x_im[i]*y_re-x_re[i]*y_im)/(y_re*y_re+y_im*y_im);
    }
    return [ans_re, ans_im];
}

export function _cx_v_divSV(x_re: number, x_im: number, y_re: number[], y_im: number[], n: number): [number[], number[]] {
    let i = n-1;
    const ans_re = Array(n), ans_im = Array(n);
    for (; i >= 0; i -= 1) {
        ans_re[i] = (x_re*y_re[i]+x_im*y_im[i])/(y_re[i]*y_re[i]+y_im[i]*y_im[i]);
        ans_im[i] = (x_im*y_re[i]-x_re*y_im[i])/(y_re[i]*y_re[i]+y_im[i]*y_im[i]);
    }
    return [ans_re, ans_im];
}

