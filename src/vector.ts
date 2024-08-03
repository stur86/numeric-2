import { TensorBase } from "./base";


/**
 * A class representing a vector, or 1D tensor
 * 
 * @class Vector
 * 
 * @param data: number[] - The data of the vector
 */
export default class Vector extends TensorBase {

    declare _data: number[];
    declare _shape: [number];

    /**
     * Create a vector
     * 
     * @param data The data of the vector
     */
    constructor(data: number[]) {
        super(data, [data.length]);
    }

    get length() {
        return this.shape[0];
    }
}