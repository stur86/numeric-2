export function _re_s_addSS(m: number, n: number, xp: number[], xi: number[], xv: number[], yp: number[], yi: number[], yv: number[]): [number[], number[], number[]] {
    const zp: number[] = new Array(n + 1), zi: number[] = [], zv: number[] = [];
    let nz = 0;
    zp[0] = 0;
    for (let j = 0; j < n; j++) {
        let a = xp[j], b = yp[j];
        const ae = xp[j + 1], be = yp[j + 1];
        while (a < ae || b < be) {
            const ra = a < ae ? xi[a] : m, rb = b < be ? yi[b] : m;
            let r: number, xk: number, yk: number;
            if (ra === rb) { r = ra; xk = xv[a++]; yk = yv[b++]; }
            else if (ra < rb) { r = ra; xk = xv[a++]; yk = 0; }
            else { r = rb; xk = 0; yk = yv[b++]; }
            const zk = xk + yk;
            if (zk !== 0) { zi[nz] = r; zv[nz] = zk; nz++; }
        }
        zp[j + 1] = nz;
    }
    return [zp, zi, zv];
}

export function _re_s_subSS(m: number, n: number, xp: number[], xi: number[], xv: number[], yp: number[], yi: number[], yv: number[]): [number[], number[], number[]] {
    const zp: number[] = new Array(n + 1), zi: number[] = [], zv: number[] = [];
    let nz = 0;
    zp[0] = 0;
    for (let j = 0; j < n; j++) {
        let a = xp[j], b = yp[j];
        const ae = xp[j + 1], be = yp[j + 1];
        while (a < ae || b < be) {
            const ra = a < ae ? xi[a] : m, rb = b < be ? yi[b] : m;
            let r: number, xk: number, yk: number;
            if (ra === rb) { r = ra; xk = xv[a++]; yk = yv[b++]; }
            else if (ra < rb) { r = ra; xk = xv[a++]; yk = 0; }
            else { r = rb; xk = 0; yk = yv[b++]; }
            const zk = xk - yk;
            if (zk !== 0) { zi[nz] = r; zv[nz] = zk; nz++; }
        }
        zp[j + 1] = nz;
    }
    return [zp, zi, zv];
}

export function _re_s_mulSS(m: number, n: number, xp: number[], xi: number[], xv: number[], yp: number[], yi: number[], yv: number[]): [number[], number[], number[]] {
    const zp: number[] = new Array(n + 1), zi: number[] = [], zv: number[] = [];
    let nz = 0;
    zp[0] = 0;
    for (let j = 0; j < n; j++) {
        let a = xp[j], b = yp[j];
        const ae = xp[j + 1], be = yp[j + 1];
        while (a < ae || b < be) {
            const ra = a < ae ? xi[a] : m, rb = b < be ? yi[b] : m;
            let r: number, xk: number, yk: number;
            if (ra === rb) { r = ra; xk = xv[a++]; yk = yv[b++]; }
            else if (ra < rb) { r = ra; xk = xv[a++]; yk = 0; }
            else { r = rb; xk = 0; yk = yv[b++]; }
            const zk = xk * yk;
            if (zk !== 0) { zi[nz] = r; zv[nz] = zk; nz++; }
        }
        zp[j + 1] = nz;
    }
    return [zp, zi, zv];
}

