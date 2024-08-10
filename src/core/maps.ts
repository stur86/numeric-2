export function _re_v_sqrt(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.sqrt(x[i]);
    }
    return ans;
}

export function _re_v_abs(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.abs(x[i]);
    }
    return ans;
}

export function _re_v_exp(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.exp(x[i]);
    }
    return ans;
}

export function _re_v_log(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.log(x[i]);
    }
    return ans;
}

export function _re_v_sin(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.sin(x[i]);
    }
    return ans;
}

export function _re_v_cos(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.cos(x[i]);
    }
    return ans;
}

export function _re_v_tan(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.tan(x[i]);
    }
    return ans;
}

export function _re_v_asin(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.asin(x[i]);
    }
    return ans;
}

export function _re_v_acos(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.acos(x[i]);
    }
    return ans;
}

export function _re_v_atan(x: number[], n: number): number[] {
    let i = n-1,
        ans = Array(n);
    for (; i >= 0; i -= 1) {
        ans[i] = Math.atan(x[i]);
    }
    return ans;
}

