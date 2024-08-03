export type NestedArray<T> = Array<T | NestedArray<T> >;

/**
 * A base class for a tensor
 * @class TensorBase
 * 
 * @param data: NestedArray<number> - The data of the tensor
 * @param shape: number[] - The shape of the tensor
 */
export class TensorBase {
    protected _data: NestedArray<number>;
    protected _shape: number[];

    /**
     * Create a tensor base class
     * 
     * @param data      The data of the tensor
     * @param shape     The shape of the tensor
     */
    constructor(data: NestedArray<number>, shape: number[]) {
        this._data = data;
        this._shape = shape;
    }

    get data() {
        return this._data;
    }

    get shape() {
        return this._shape;
    }

    get size() {
        return this._shape.reduce((a, b) => a * b, 1);
    }
}