import UnitCoversion from '../lib/UnitCoversion';

class ConverterDpi {
  /**
   * 缩放比例
   * @date 2022/8/23 - 09:26:37
   *
   * @type {number}
   */
  scale: number;

  initScale: number;
  constructor() {
    this.scale = 1;
    this.initScale = 1;
  }
  setInitScale(n: number) {
    this.initScale = n || 1;
  }
  setScale(n: number, isSeal = false) {
    if (!n) {
      return;
    }
    if (isSeal) {
      this.scale = n * this.initScale;
    } else {
      this.scale = n;
    }
  }
  getScreenPX(millimeter: string | number) {
    return UnitCoversion.CoversionPx(Number(millimeter) * (this.scale || 1));
  }
}

export default new ConverterDpi();
