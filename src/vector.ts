import { TensorBase } from "./base";


export default class Vector extends TensorBase {

    constructor(data: number[]) {
        super(data, [data.length]);
    }

    get length() {
        return this.shape[0];
    }
}