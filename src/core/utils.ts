import type { TensorBase } from "../base";
import Vector from "../vector";
import NumericCore from ".";

/** The imaginary part of a tensor, or a zero array if it is real. */
function imagOrZeros(t: TensorBase): number[] {
    if (t.imag !== null) return t.imag as number[];
    const n = t.shape[0];
    const z = Array(n);
    for (let i = n - 1; i >= 0; i--) z[i] = 0;
    return z;
}

function resolveKernel(full_name: string, name: string, dtype: string): Function {
    const method = NumericCore[full_name as keyof typeof NumericCore];
    if (typeof method !== "function") {
        const kind = dtype === "cx" ? "complex" : "real";
        throw new Error(`Operation ${name} is not supported for ${kind} tensors`);
    }
    return method;
}

export class UnaryMethod {
    dtype: string;
    optype: string;
    name: string;
    full_name: string;
    args: any[] = [];

    constructor(op: TensorBase, name: string) {
        this.name = name;
        if (op instanceof Vector) {
            this.dtype = op.is_complex? "cx" : "re";
            this.optype = "v";
        }
        else {
            // Not supported for now
            throw new Error(`Method ${name} not supported for ${op}`);
        }
        this.full_name = `_${this.dtype}_${this.optype}_${name}`;

        // Build the method arguments
        if (this.optype == "v") {
            this.args.push(op.real);
            if (this.dtype == "cx") {
                this.args.push(op.imag);
            }
            this.args.push(op.shape[0]);
        }
    }

    get key(): keyof typeof NumericCore {
        return this.full_name as keyof typeof NumericCore;
    }

    invoke(): any {
        return resolveKernel(this.full_name, this.name, this.dtype)(...this.args);
    }
}

export class BinaryMethod {
    dtype: string;
    optype: string;
    name: string;
    variant: string;
    full_name: string;
    args: any[] = [];

    constructor(left: TensorBase | number, right: TensorBase | number, name: string) {
        this.name = name;

        // Determine variant (VV, VS, SV) and extract data
        const leftIsScalar = typeof left === 'number';
        const rightIsScalar = typeof right === 'number';

        if (leftIsScalar && rightIsScalar) {
            throw new Error(`Binary op ${name} requires at least one tensor operand`);
        }

        const tensor = (leftIsScalar ? right : left) as TensorBase;

        if (tensor instanceof Vector) {
            this.dtype = tensor.is_complex ? "cx" : "re";
            this.optype = "v";
        } else {
            throw new Error(`Method ${name} not supported for ${tensor}`);
        }

        if (!leftIsScalar && !rightIsScalar) {
            const other = (right as TensorBase);
            if (!(other instanceof Vector)) {
                throw new Error(`Method ${name} not supported for ${other}`);
            }
            if (other.shape[0] !== tensor.shape[0]) {
                throw new Error(`Binary op ${name}: length mismatch (${tensor.shape[0]} vs ${other.shape[0]})`);
            }
            // Mixed real/complex operands are computed in complex mode
            if (other.is_complex) this.dtype = "cx";
            this.variant = "VV";
        } else if (rightIsScalar) {
            this.variant = "VS";
        } else {
            this.variant = "SV";
        }

        this.full_name = `_${this.dtype}_${this.optype}_${name}${this.variant}`;

        // Build arguments
        if (this.optype == "v") {
            if (leftIsScalar) {
                this.args.push(left);
                if (this.dtype == "cx") {
                    this.args.push(0); // imaginary part of scalar is 0
                }
            } else {
                this.args.push((left as TensorBase).real);
                if (this.dtype == "cx") {
                    this.args.push(imagOrZeros(left as TensorBase));
                }
            }
            if (rightIsScalar) {
                this.args.push(right);
                if (this.dtype == "cx") {
                    this.args.push(0); // imaginary part of scalar is 0
                }
            } else {
                this.args.push((right as TensorBase).real);
                if (this.dtype == "cx") {
                    this.args.push(imagOrZeros(right as TensorBase));
                }
            }
            this.args.push(tensor.shape[0]);
        }
    }

    get key(): keyof typeof NumericCore {
        return this.full_name as keyof typeof NumericCore;
    }

    invoke(): any {
        return resolveKernel(this.full_name, this.name, this.dtype)(...this.args);
    }
}