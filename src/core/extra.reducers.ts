// Core reducers that are coded explicitly instead of generated
export function _bool_v_any(x: boolean[], n: number): boolean {
    let i = n-1;
    for (; i >= 1; i -= 2) {
        if (x[i] || x[i-1]) {
            return true;
        }
    }
    return x[0];
}

export function _bool_v_all(x: boolean[], n: number): boolean {
    let i = n-1;
    for (; i >= 1; i -= 2) {
        if (!x[i] || !x[i-1]) {
            return false;
        }
    }
    return x[0];
}