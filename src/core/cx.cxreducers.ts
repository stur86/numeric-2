export function _cx_v_sum(x_re: number[], x_im: number[], n: number): [number, number] {
    let i = n-1,
        ans_re = x_re[i],
        ans_im = x_im[i],
        t_re: number;
    --i;
    for (; i >= 0; i -= 1) {
        t_re = ans_re + x_re[i];
        ans_im = ans_im + x_im[i];
        ans_re = t_re;
    }
    return [ans_re, ans_im];
}

export function _cx_v_prod(x_re: number[], x_im: number[], n: number): [number, number] {
    let i = n-1,
        ans_re = x_re[i],
        ans_im = x_im[i],
        t_re: number;
    --i;
    for (; i >= 0; i -= 1) {
        t_re = ans_re*x_re[i] - ans_im*x_im[i];
        ans_im = ans_re*x_im[i] + ans_im*x_re[i];
        ans_re = t_re;
    }
    return [ans_re, ans_im];
}

