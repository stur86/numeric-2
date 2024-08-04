export function _re_v_norm2squared(x: number[], n: number): number {
    let i = n-1,
        ans = x[i]*x[i];
    --i;
    for (; i >= 0; i -= 1) {
        ans += x[i]*x[i];
    }
    return ans;
}

export function _re_v_norm1(x: number[], n: number): number {
    let i = n-1,
        ans = Math.abs(x[i]);
    --i;
    for (; i >= 0; i -= 1) {
        ans += Math.abs(x[i]);
    }
    return ans;
}

export function _re_v_sum(x: number[], n: number): number {
    let i = n-1,
        ans = x[i];
    --i;
    for (; i >= 0; i -= 1) {
        ans += x[i];
    }
    return ans;
}

export function _re_v_prod(x: number[], n: number): number {
    let i = n-1,
        ans = x[i];
    --i;
    for (; i >= 0; i -= 1) {
        ans *= x[i];
    }
    return ans;
}

export function _re_v_max(x: number[], n: number): number {
    let i = n-1,
        ans = x[i];
    --i;
    for (; i >= 0; i -= 1) {
        ans = Math.max(ans, x[i]);
    }
    return ans;
}

export function _re_v_min(x: number[], n: number): number {
    let i = n-1,
        ans = x[i];
    --i;
    for (; i >= 0; i -= 1) {
        ans = Math.min(ans, x[i]);
    }
    return ans;
}

export function _re_v_norm2(x: number[], n: number): number {
	return Math.sqrt(_re_v_norm2squared(x, n));
}

