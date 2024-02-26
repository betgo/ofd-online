// import { parse, Font } from 'opentype.js';

import loadScript from './load-script';

/**
 * @description 加载内置字体
 */
class FontMap {
  loading: boolean = false;

  fontFile: {
    [k: string | number]: {
      getPath: (
        s: string,
        n?: number,
        c?: number,
        v?: number,
        op?: { hinting?: boolean; kerning?: boolean; features?: boolean }
      ) => { glyphs: any; toSVG: (a: number) => string; Path: any };
    };
  } = {};

  intervalTimer: NodeJS.Timer | null = null;
  callbacks: {
    funs: (l: boolean) => void;
    k: string | number;
    file: ArrayBuffer;
  }[] = [];

  init() {
    // cdn方式引入opentype.js
    if (!window.opentype) {
      this.loading = true;

      loadScript('https://cdn.jsdelivr.net/npm/opentype.js').then(() => {
        this.loading = false;
        // callback && callback();
      });
    } else {
      // callback && callback();
    }
  }

  setFontFile(
    key: string | number,
    file: ArrayBuffer,
    callback: (r: boolean) => void
  ) {
    if (!window.opentype) {
      if (this.loading) {
        // 等待 opentype.min.js 加载完成
        if (!this.intervalTimer) {
          this.intervalTimer = setInterval(() => {
            if (!this.loading) {
              if (this.intervalTimer) {
                clearInterval(this.intervalTimer);
              }
              if (this.callbacks.length) {
                this.callbacks.forEach(({ k, funs, file: f }) => {
                  try {
                    if (!this.fontFile[k]) {
                      this.fontFile[k] = window.opentype.parse(f);
                    }
                    funs(true);
                  } catch (er) {
                    console.warn(er);
                    funs(false);
                  }
                });
              }
            }
          }, 30);
        }
        this.callbacks.push({ k: key, file, funs: callback });
      } else {
        this.init();
      }
      return;
    }
    try {
      if (window.opentype && !this.fontFile[key]) {
        this.fontFile[key] = window.opentype.parse(file);
      }
      callback(true);
    } catch (err) {
      console.warn(err);
      callback(false);
    }
  }

  getFontFile(
    key: string | number,
    txt: string,
    x: number,
    y: number,
    s: number
  ): string {
    return this.fontFile[key].getPath(txt, x, y, s, { hinting: true }).toSVG(2);
  }

  destroy() {
    this.fontFile = {};
    this.callbacks = [];
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
  }
}

export default new FontMap();
