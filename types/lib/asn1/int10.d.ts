/**
 * Arbitrary length base-10 value.
 * @param {number} value - Optional initial value (will be 0 otherwise).
 */
declare class Int10 {
    buf: number[];
    constructor(value?: number);
    /**
     * Multiply value by m and add c.
     * @param {number} m - multiplier, must be < =256
     * @param {number} c - value to add
     */
    mulAdd(m: number, c: number): void;
    /**
     * Subtract value.
     * @param {number} c - value to subtract
     */
    sub(c: number): void;
    /**
     * Convert to decimal string representation.
     * @param {*} base - optional value, only value accepted is 10
     */
    toString(base?: any): string;
    /**
     * Convert to Number value representation.
     * Will probably overflow 2^53 and thus become approximate.
     */
    valueOf(): number;
    /**
     * Return value as a simple Number (if it is <= 10000000000000), or return this.
     */
    simplify(): number | this;
}
export default Int10;
