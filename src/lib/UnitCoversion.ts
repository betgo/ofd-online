/**
 * @desc mm 转 px
 */
class UnitCoversion {
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
  setUnit() {
    if (document?.body) {
      const div = document.createElement('div');
      div.setAttribute('style', 'width:1mm');
      document.body.appendChild(div);
      const { width } = div.getBoundingClientRect();
      UnitCoversion.multiple = width;
      document.body.removeChild(div);
    }
  }

  /**
   * px转换MM
   * @param millimeter 待转换毫米
   * @returns number
   */
  CoversionMill(px: number): number {
    if (!px) return 0;
    if (!UnitCoversion.multiple) {
      this.setUnit();
    }
    return Number(px) / UnitCoversion.multiple;
  }

  /**
   * 毫米转换PX
   * @param millimeter 待转换毫米
   * @returns number
   */
  CoversionPx(millimeter: number | string): number {
    if (!millimeter) return 0;
    if (!UnitCoversion.multiple) {
      this.setUnit();
    }
    return Number(millimeter) * UnitCoversion.multiple;
  }
}

export default new UnitCoversion();
