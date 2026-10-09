/**
 * Discrete linear convolution of two vectors (NumPy's np.convolve).
 */

import Vector from "../vector";
import { type VectorLike, toRawCxVector } from "./wrap";
import { rawFFT, rawIFFT } from "./fft";

export type ConvolveMode = "full" | "same" | "valid";

/** Above this many multiply-adds (n·m), use the FFT instead of the direct sum. */
const DIRECT_LIMIT = 1 << 14;

function direct(ar: number[], ai: number[] | null, br: number[], bi: number[] | null): [number[], number[] | null] {
    const n = ar.length, m = br.length, L = n + m - 1;
    const cr = new Array(L).fill(0);
    if (ai === null && bi === null) {
        for (let i = 0; i < n; i++) {
            const a = ar[i];
            if (a === 0) continue;
            for (let j = 0; j < m; j++) cr[i + j] += a * br[j];
        }
        return [cr, null];
    }
    const ci = new Array(L).fill(0);
    for (let i = 0; i < n; i++) {
        const xr = ar[i], xi = ai === null ? 0 : ai[i];
        for (let j = 0; j < m; j++) {
            const yr = br[j], yi = bi === null ? 0 : bi[j];
            cr[i + j] += xr * yr - xi * yi;
            ci[i + j] += xr * yi + xi * yr;
        }
    }
    return [cr, ci];
}

function viaFFT(ar: number[], ai: number[] | null, br: number[], bi: number[] | null): [number[], number[] | null] {
    const L = ar.length + br.length - 1;
    let P = 1;
    while (P < L) P <<= 1; // power-of-two length: the fast radix-2 path
    const pad = (x: number[] | null, len: number) => {
        const out = new Array(P).fill(0);
        if (x !== null) for (let k = 0; k < len; k++) out[k] = x[k];
        return out;
    };
    const [Ar, Ai] = rawFFT(pad(ar, ar.length), ai === null ? null : pad(ai, ai.length));
    const [Br, Bi] = rawFFT(pad(br, br.length), bi === null ? null : pad(bi, bi.length));
    const Cr = new Array(P), Ci = new Array(P);
    for (let k = 0; k < P; k++) {
        Cr[k] = Ar[k] * Br[k] - Ai[k] * Bi[k];
        Ci[k] = Ar[k] * Bi[k] + Ai[k] * Br[k];
    }
    const [cr, ci] = rawIFFT(Cr, Ci);
    cr.length = L;
    if (ai === null && bi === null) return [cr, null]; // real inputs: drop round-off imaginary parts
    ci.length = L;
    return [cr, ci];
}

/**
 * Linear convolution (a ∗ v)[k] = Σ_j a[j] · v[k − j], as np.convolve.
 *
 * Modes:
 * - "full" (default): every overlap, length n + m − 1;
 * - "same": length max(n, m), centred on the "full" result;
 * - "valid": only complete overlaps, length max(n, m) − min(n, m) + 1.
 *
 * Small inputs use the direct sum, larger ones the FFT. Real inputs give a
 * real result; if either input is complex, so is the result.
 */
export function convolve(a: VectorLike, v: VectorLike, mode: ConvolveMode = "full"): Vector {
    const [ar, ai] = toRawCxVector(a);
    const [br, bi] = toRawCxVector(v);
    const n = ar.length, m = br.length;
    if (n === 0 || m === 0) throw new Error("convolve: inputs must not be empty");
    const [cr, ci] = n * m <= DIRECT_LIMIT || Math.min(n, m) < 32 ? direct(ar, ai, br, bi) : viaFFT(ar, ai, br, bi);

    let start = 0, len = n + m - 1;
    const big = Math.max(n, m), small = Math.min(n, m);
    if (mode === "same") {
        start = Math.floor((small - 1) / 2);
        len = big;
    } else if (mode === "valid") {
        start = small - 1;
        len = big - small + 1;
    } else if (mode !== "full") {
        throw new Error(`convolve: unknown mode "${mode}" (use "full", "same" or "valid")`);
    }
    return new Vector(cr.slice(start, start + len), ci === null ? null : ci.slice(start, start + len));
}
