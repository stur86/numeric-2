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