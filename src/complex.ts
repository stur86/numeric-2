/** A complex scalar. */
export type Complex = { re: number; im: number };

/** A real or complex scalar. */
export type Scalar = number | Complex;

/** Create a complex scalar. */
export function complex(re: number, im: number = 0): Complex {
    return { re, im };
}

/** Type guard: true if x is a Complex scalar (not a plain number). */
export function isComplex(x: unknown): x is Complex {
    return typeof x === "object" && x !== null
        && typeof (x as Complex).re === "number" && typeof (x as Complex).im === "number"
        && !Array.isArray(x);
}

/** Return a plain number when the imaginary part is zero, otherwise a Complex. */
export function toScalar(re: number, im: number): Scalar {
    return im === 0 ? re : { re, im };
}
