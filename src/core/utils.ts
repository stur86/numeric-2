import type { TensorBase } from "../base";
import Vector from "../vector";
import NumericCore from ".";

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
        const method = NumericCore[this.key] as Function;
        return method(...this.args);
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
            } else {
                this.args.push((left as TensorBase).real);
            }
            if (rightIsScalar) {
                this.args.push(right);
            } else {
                this.args.push((right as TensorBase).real);
            }
            this.args.push(tensor.shape[0]);
        }
    }

    get key(): keyof typeof NumericCore {
        return this.full_name as keyof typeof NumericCore;
    }

    invoke(): any {
        const method = NumericCore[this.key] as Function;
        return method(...this.args);
    }
}