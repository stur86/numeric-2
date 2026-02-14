export function _cx_v_norm2(x_re: number[], x_im: number[], n: number): number {
    let i = n-1,
        ans = x_re[i]*x_re[i]+x_im[i]*x_im[i];
    --i;
    for (; i >= 0; i -= 1) {
        ans += x_re[i]*x_re[i]+x_im[i]*x_im[i];
    }
    return Math.sqrt(ans);
}

export function _cx_v_norm2squared(x_re: number[], x_im: number[], n: number): number {
    let i = n-1,
        ans = x_re[i]*x_re[i]+x_im[i]*x_im[i];
    --i;
    for (; i >= 0; i -= 1) {
        ans += x_re[i]*x_re[i]+x_im[i]*x_im[i];
    }
    return ans;
}

export function _cx_v_norm1(x_re: number[], x_im: number[], n: number): number {
    let i = n-1,
        ans = Math.sqrt(x_re[i]*x_re[i]+x_im[i]*x_im[i]);
    --i;
    for (; i >= 0; i -= 1) {
        ans += Math.sqrt(x_re[i]*x_re[i]+x_im[i]*x_im[i]);
    }
    return ans;
}

