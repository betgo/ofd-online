declare class ConverterDpi {
    /**
     * 缩放比例
     * @date 2022/8/23 - 09:26:37
     *
     * @type {number}
     */
    scale: number;
    initScale: number;
    constructor();
    setInitScale(n: number): void;
    setScale(n: number, isSeal?: boolean): void;
    getScreenPX(millimeter: string | number): number;
}
declare const _default: ConverterDpi;
export default _default;
