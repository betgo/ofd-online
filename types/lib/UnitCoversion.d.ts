/**
 * @desc mm 转 px
 */
declare class UnitCoversion {
    /**
     * Description placeholder
     * @date 2022/8/2 - 15:49:57
     *
     * @static
     * @type {number}
     */
    static multiple: number;
    /**
     * 设置1mm单位
     */
    setUnit(): void;
    /**
     * px转换MM
     * @param millimeter 待转换毫米
     * @returns number
     */
    CoversionMill(px: number): number;
    /**
     * 毫米转换PX
     * @param millimeter 待转换毫米
     * @returns number
     */
    CoversionPx(millimeter: number | string): number;
}
declare const _default: UnitCoversion;
export default _default;
