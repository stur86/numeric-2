import { UnaryMethod } from "../core/utils";
import type { TensorBase } from "../base";


export function norm2(x: TensorBase): number {
    return new UnaryMethod(x, "norm2").invoke();
}

export function norm2squared(x: TensorBase): number {
    return new UnaryMethod(x, "norm2squared").invoke();
}

export function norm1(x: TensorBase): number {
    return new UnaryMethod(x, "norm1").invoke();
}

export function normInf(x: TensorBase): number {
    return new UnaryMethod(x, "normInf").invoke();
}