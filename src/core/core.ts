export default class NumericCore {
  protected static _something = 5;

  static changeSomething(value: number) {
    NumericCore._something = value;
  }

  static getElement(name: string): number {
    return NumericCore[name as keyof typeof NumericCore] as number;
  }
}
