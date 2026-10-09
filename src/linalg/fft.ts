/**
 * Discrete Fourier transform.
 *
 * Power-of-two lengths use an iterative in-place radix-2 FFT with cached
 * twiddle factors. Other lengths use Bluestein's algorithm (a chirp-z
 * convolution evaluated with the radix-2 FFT), so every length is O(n log n).
 * The inverse is computed through conjugation and scaled by 1/n, matching
 * NumPy's `fft` / `ifft` conventions.
 */

import Vector from "../vector";
import { type VectorLike, toRawCxVector } from "./wrap";

const isPow2 = (n: number) => (n & (n - 1)) === 0;

/** Small cache keyed by transform length (bounded, oldest entry evicted first). */
class LengthCache<T> {
    private map = new Map<number, T>();
    constructor(private limit: number) {}
    get(n: number, make: () => T): T {
        let v = this.map.get(n);
        if (v === undefined) {
            v = make();
            if (this.map.size >= this.limit) this.map.delete(this.map.keys().next().value!);
            this.map.set(n, v);
        }
        return v;
    }
}

/** cos(2πk/n) and -sin(2πk/n) for k < n/2 (forward-transform twiddles). */
const twiddles = new LengthCache<{ cos: Float64Array; sin: Float64Array }>(32);
function twiddleTable(n: number) {
    return twiddles.get(n, () => {
        const h = n >> 1;
        const cos = new Float64Array(h), sin = new Float64Array(h);
        for (let k = 0; k < h; k++) {
            const t = (2 * Math.PI * k) / n;
            cos[k] = Math.cos(t);
            sin[k] = -Math.sin(t);
        }
        return { cos, sin };
    });
}

/** In-place forward FFT of a power-of-two length (re, im are modified). */
function fftPow2(re: number[], im: number[]): void {
    const n = re.length;
    if (n <= 1) return;

    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            let t = re[i]; re[i] = re[j]; re[j] = t;
            t = im[i]; im[i] = im[j]; im[j] = t;
        }
    }

    const { cos, sin } = twiddleTable(n);
    for (let size = 2; size <= n; size <<= 1) {
        const half = size >> 1, step = n / size;
        for (let start = 0; start < n; start += size) {
            for (let k = 0, t = 0; k < half; k++, t += step) {
                const wr = cos[t], wi = sin[t];
                const j = start + k, l = j + half;
                const xr = re[l], xi = im[l];
                const tr = wr * xr - wi * xi;
                const ti = wr * xi + wi * xr;
                re[l] = re[j] - tr;
                im[l] = im[j] - ti;
                re[j] += tr;
                im[j] += ti;
            }
        }
    }
}

/**
 * Bluestein data for length n: the chirp w_k = exp(-iπk²/n) and the forward
 * FFT of its conjugate, zero-padded and wrapped to a power-of-two length m.
 */
const chirps = new LengthCache<{ m: number; wr: Float64Array; wi: Float64Array; Br: number[]; Bi: number[] }>(16);
function chirpData(n: number) {
    return chirps.get(n, () => {
        let m = 1;
        while (m < 2 * n - 1) m <<= 1;
        const wr = new Float64Array(n), wi = new Float64Array(n);
        const nn = 2 * n;
        for (let k = 0; k < n; k++) {
            // k² mod 2n keeps the angle small (and exact) for large n
            const t = (Math.PI * ((k * k) % nn)) / n;
            wr[k] = Math.cos(t);
            wi[k] = -Math.sin(t);
        }
        const Br: number[] = new Array(m).fill(0), Bi: number[] = new Array(m).fill(0);
        Br[0] = wr[0];
        Bi[0] = -wi[0];
        for (let k = 1; k < n; k++) {
            Br[k] = Br[m - k] = wr[k];
            Bi[k] = Bi[m - k] = -wi[k];
        }
        fftPow2(Br, Bi);
        return { m, wr, wi, Br, Bi };
    });
}

/** Forward DFT of any length via Bluestein's algorithm (returns new arrays). */
function fftBluestein(re: number[], im: number[]): [number[], number[]] {
    const n = re.length;
    const { m, wr, wi, Br, Bi } = chirpData(n);
    const ar: number[] = new Array(m).fill(0), ai: number[] = new Array(m).fill(0);
    for (let k = 0; k < n; k++) {
        ar[k] = re[k] * wr[k] - im[k] * wi[k];
        ai[k] = re[k] * wi[k] + im[k] * wr[k];
    }
    fftPow2(ar, ai);
    // Pointwise product, then inverse FFT via conjugation: ifft(z) = conj(fft(conj(z))) / m
    for (let k = 0; k < m; k++) {
        const xr = ar[k], xi = ai[k];
        ar[k] = xr * Br[k] - xi * Bi[k];
        ai[k] = -(xr * Bi[k] + xi * Br[k]);
    }
    fftPow2(ar, ai);
    const outR = new Array(n), outI = new Array(n);
    for (let k = 0; k < n; k++) {
        const cr = ar[k] / m, ci = -ai[k] / m;
        outR[k] = cr * wr[k] - ci * wi[k];
        outI[k] = cr * wi[k] + ci * wr[k];
    }
    return [outR, outI];
}

/** Forward DFT on raw arrays (inputs are not modified). */
export function rawFFT(re: number[], im: number[] | null): [number[], number[]] {
    const n = re.length;
    const r = re.slice();
    const i = im === null ? new Array(n).fill(0) : im.slice();
    if (isPow2(n)) {
        fftPow2(r, i);
        return [r, i];
    }
    return fftBluestein(r, i);
}

/** Inverse DFT on raw arrays, scaled by 1/n (inputs are not modified). */
export function rawIFFT(re: number[], im: number[] | null): [number[], number[]] {
    const n = re.length;
    // ifft(x) = conj(fft(conj(x))) / n
    const negIm = im === null ? new Array(n).fill(0) : im.map((v) => -v);
    const [r, i] = rawFFT(re, negIm);
    for (let k = 0; k < n; k++) {
        r[k] /= n;
        i[k] = -i[k] / n;
    }
    return [r, i];
}

/**
 * Discrete Fourier transform: X_k = Σ_j x_j · exp(-2πi·jk/n).
 *
 * Works for any length (O(n log n)). Accepts a real or complex vector, or a
 * raw array, and always returns a complex Vector.
 *
 * @param x     The signal.
 * @returns     Its DFT.
 */
export function fft(x: VectorLike): Vector {
    const [re, im] = rawFFT(...toRawCxVector(x));
    return new Vector(re, im);
}

/**
 * Inverse discrete Fourier transform: x_j = (1/n) Σ_k X_k · exp(2πi·jk/n),
 * so that ifft(fft(x)) = x.
 *
 * @param X     The spectrum (real or complex vector, or raw array).
 * @returns     The complex signal.
 */
export function ifft(X: VectorLike): Vector {
    const [re, im] = rawIFFT(...toRawCxVector(X));
    return new Vector(re, im);
}
