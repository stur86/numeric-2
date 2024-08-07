import Vector from "./vector";

export function selectUnaryMethodName(op: Vector, name: string): string {
    if (op instanceof Vector) {
        // Is it real or complex?
        const t_prefix = op.is_complex? "_cx" : "_re";
        return `${t_prefix}_v_${name}`;
    }

    // Not identified
    throw new Error(`Method ${name} not supported for ${op}`);
} 