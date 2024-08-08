import Vector from "../vector";
import NumericCore from "../core";
import { selectUnaryMethodName } from "../utils";


export function norm2(x: Vector): number {
    const methodName = selectUnaryMethodName(x, "norm2") as keyof typeof NumericCore;
    const method = NumericCore[methodName] as (x: any, n: number) => number;
    return method(x.real, x.length);
}