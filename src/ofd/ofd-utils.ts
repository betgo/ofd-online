import { Res } from '../core/ofd-core';
import ConverterDpi from './ConverterDpi';
import decodeHtml from '../lib/decode-html';

/**
 * @desc 字体family
 */
export const FONT_FAMILY = {
  楷体: '楷体, KaiTi, Kai, simkai',
  kaiti: '楷体, KaiTi, Kai, simkai',
  Kai: '楷体, KaiTi, Kai',
  simsun: 'SimSun, simsun, Songti SC',
  宋体: '宋体, SimSun, simsun, Songti SC',
  黑体: '黑体, SimHei, STHeiti, simhei',
  仿宋: 'FangSong, STFangsong, simfang',
  小标宋体: 'sSun',
  方正小标宋_gbk: 'sSun',
  仿宋_gb2312: 'FangSong, STFangsong, simfang',
  楷体_gb2312: '楷体, KaiTi, Kai, simkai',
  华文楷体: '华文楷体, 楷体, KaiTi, Kai, simkai, 宋体',
  华文中宋: '华文楷体, 楷体, KaiTi, Kai, simkai, 宋体',
  couriernew: 'Courier New',
  'courier new': 'Courier New'
};

export const pageZIndex = {
  Background: 2,
  Body: 4,
  WatermarkAnnot: 6,
  Foreground: 8
};

/**
 * 设置style样式文件
 * @param ele
 * @param styles
 */
export const setStyle = (
  ele: HTMLElement | SVGImageElement | SVGSVGElement,
  styles: { [k: string]: string | number }
) => {
  if (ele?.setAttribute && styles) {
    let str = '';
    Object.entries(styles).forEach(([keys, val]) => {
      str += `${keys}:${val};`;
    });
    ele.setAttribute('style', str);
  }
};

export const converterDpi: (p: string | number) => number = millimeter => {
  let defaultPx = ConverterDpi.getScreenPX(millimeter);

  return defaultPx;
};

export const parseCtm = (ctm: string) => {
  if (ctm) {
    return ctm.split(' ');
  }
  return null;
};

export const parseAbbreviatedData = (abbreviatedData: string) => {
  if (abbreviatedData) {
    const abbreviatedDataArray = abbreviatedData.split(' ');
    const result: string[] = [];
    for (let item of abbreviatedDataArray) {
      if (item) {
        if (item && !/[A-Z]/i.test(item)) {
          result.push(String(converterDpi(item).toFixed(4)));
        } else {
          let cit = item;
          if (item === 'S') {
            cit = 'M';
          }
          if (item === 'B') {
            cit = 'C';
          }
          if (item === 'C') {
            cit = 'Z';
          }
          result.push(String(cit));
        }
      }
    }
    return result.join(' ');
  }
  return null;
};

/**
 * 格式化ST_Box数据
 * @param ST_Box
 * @returns
 */
export const formatSTBox: (
  a: string,
  shouldAds?: boolean
) => {
  left: number;
  top: number;
  width: number;
  height: number;
} = (ST_Box, shouldAds = true) => {
  if (!ST_Box)
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0
    };
  const [left, top, width, height] = ST_Box.split(' ');

  const returnLeft =
    Number(width) < 0
      ? converterDpi(Number(left) + Number(width))
      : converterDpi(left);
  const returnTop =
    Number(height) < 0
      ? converterDpi(Number(top) + Number(height))
      : converterDpi(top);

  const returnWidth = converterDpi(shouldAds ? Math.abs(Number(width)) : width);
  const returnHeight = converterDpi(
    shouldAds ? Math.abs(Number(height)) : height
  );
  return {
    left: returnLeft,
    top: returnTop,
    width: returnWidth,
    height: returnHeight
  };
};

export const getRes = (Res: Res[] | null, resId: string, type: string) => {
  if (Res) {
    for (let res of Res) {
      if (res.ID == resId && res.OFDType === type) {
        return res;
      }
    }
  }
  return null;
};

export const getFont = (Fonts: Res[] | null, resId: string) => {
  return getRes(Fonts, resId, 'Font');
};

export const getDrawParam = (DrawParam: Res[] | null, resId: string) => {
  return getRes(DrawParam, resId, 'DrawParam');
};

export const getMultiMedia = (MultiMedias: Res[] | null, resId: string) => {
  return getRes(MultiMedias, resId, 'MultiMedia');
};

const calcDeltaPos: (k: string, text?: string) => number[] = (
  deltaPos,
  textStr
) => {
  const result: number[] = [];
  let flagG = false;
  let currentGIndex = 0;
  if (deltaPos) {
    const deltaPosArrays = deltaPos.split(' ').filter(Boolean);
    deltaPosArrays.forEach((item, index) => {
      if (item === 'g') {
        flagG = true;
        currentGIndex = index;
      }
      if (index > currentGIndex + 2) {
        flagG = false;
      }
      if (!flagG) {
        result.push(Number(item));
      }
      // 当循环 为g时， g后第一项为 长度，第二项为度量值，第三项及其后面值直接插入result，直到遇到g
      if (flagG) {
        if (index <= currentGIndex + 2 && index !== currentGIndex) {
          return;
        }
        const max = Number(deltaPosArrays[currentGIndex + 1]);
        for (let i = 0; i < max; i++) {
          result.push(Number(deltaPosArrays[currentGIndex + 2]));
        }
      }
    });
    // 优化空格文字
    if (textStr && textStr.length !== result.length + 1) {
      const diff = result[result.length - 1];
      textStr
        .split('')
        .slice(result.length + 1)
        .forEach((_, i) => {
          result.splice(result.length + i, 0, diff + diff * i);
        });
    }
  }
  return result;
};

/**
 * 替换html可识别family
 * @param fontObj
 * @returns
 */
export const getFontFamily = (fontInfo?: Res) => {
  if (!fontInfo || (!fontInfo.FontName && !fontInfo.family)) {
    return FONT_FAMILY['宋体'];
  }
  if (fontInfo?.Path) {
    return `${fontInfo?.FontName || fontInfo.family}, ${FONT_FAMILY['宋体']}`;
  }

  return (
    //@ts-ignore
    FONT_FAMILY[fontInfo.FontName || fontInfo.family] || FONT_FAMILY['宋体']
  );
};

/**
 * 计算坐标
 * @param x
 * @param y
 * @param boundary
 * @returns
 */
const adjustPos = function (
  x: number,
  y: number,
  boundary: string | string[] | { top: number; left: number }
) {
  let posX = 0;
  let posY = 0;
  if (boundary) {
    if (typeof boundary === 'string') {
      const [x, y] = boundary.split(' ');
      posX = Number(x);
      posY = Number(y);
    }
    if (typeof boundary === 'object') {
      if (Array.isArray(boundary)) {
        const [x, y] = boundary;
        posX = Number(x);
        posY = Number(y);
      } else {
        posX = boundary.left;
        posY = boundary.top;
      }
    }
  }
  const realX = posX + x;
  const realY = posY + y;
  return { cx: realX, cy: realY };
};

/**
 * 格式化颜色
 * @param color
 * @returns
 */
export const parseColor = function (color: string) {
  const cols = String(color);
  if (cols && cols.length > 0) {
    if (cols.indexOf('#') !== -1) {
      let hexCols = cols.replace(/#/g, '');
      hexCols = hexCols.replace(/ /g, '');
      hexCols = '#' + hexCols.toString();
      return hexCols;
    }
    const array = cols.split(' ');
    return `rgb(${array[0]}, ${array[1]}, ${array[2]})`;
  } else {
    return `rgb(0, 0, 0)`;
  }
};

const ctmCalPoint = function (
  x: number | string,
  y: number | string,
  ctm: string[] | string
) {
  const numX = Number(x);
  const numY = Number(y);
  if (Array.isArray(ctm)) {
    const [a, b, c, d, e, f] = ctm.map(item => Number(item));
    const ctmX = numX * a + numY * c + 1 * e;
    const ctmY = numX * b + numY * d + 1 * f;
    return { cx: ctmX, cy: ctmY };
  }
  const [a, b, c, d, e, f] = ctm.split(' ').map(item => Number(item));
  const ctmX = numX * a + numY * c + 1 * e;
  const ctmY = numX * b + numY * d + 1 * f;
  return { cx: ctmX, cy: ctmY };
};

const ctmCalDetalPoint = function (
  x: number | string,
  y: number | string,
  ctm: string | string[]
) {
  const numX = Number(x);
  const numY = Number(y);
  if (Array.isArray(ctm)) {
    const [a, b, c, d] = ctm.map(item => Number(item));
    const ctmX = numX * a + numY * c;
    const ctmY = numX * b + numY * d;
    return { ctmX, ctmY };
  }
  const [a, b, c, d] = ctm.split(' ').map(item => Number(item));
  const ctmX = numX * a + numY * c;
  const ctmY = numX * b + numY * d;
  return { ctmX, ctmY };
};

/**
 *
 * @param textCodes
 * @param cgTransform
 * @param ctm
 * @param boundary
 * @param compositeObjectBoundary
 * @param compositeObjectCTM
 * @returns
 */
export const calTextPoint = function (
  textCode: { [k: string]: any },
  cgTransform: { [k: string]: any }[],
  ctm: string | string[],
  Boundary: string,
  compositeObjectCTM?: any
) {
  let x = 0;
  let y = 0;
  let cx = 0;
  let cy = 0;
  let textCodePointList: any[] = [];
  if (!textCode) {
    return textCodePointList;
  }
  const boundary = formatSTBox(Boundary, false);
  // console.log('textCode:', textCode, boundary);
  x = parseFloat(textCode['X']);
  y = parseFloat(textCode['Y']);

  // 存在负数宽度字体位置需要调整
  if (isNaN(x) || (x < 0 && boundary.width < 0)) {
    x = 0;
  }
  // 存在负数宽度字体位置需要调整
  if (isNaN(y) || (y < 0 && boundary.height < 0)) {
    y = 0;
  }
  cx = x;
  cy = y;
  if (ctm) {
    const r = ctmCalPoint(cx, cy, ctm);
    cx = r.cx;
    cy = r.cy;
  }
  let textStr = textCode['text'];
  if (textStr) {
    textStr = decodeHtml(textStr);
    textStr = textStr.replace(/&#x20;/g, ' ');
  }
  let deltaXList: number[] = [];
  let deltaYList: number[] = [];
  if (textCode['DeltaX']) {
    Array.prototype.push.apply(
      deltaXList,
      calcDeltaPos(textCode['DeltaX'], textStr)
    );
  }
  if (textCode['DeltaY']) {
    // 确定文字排列位置
    Array.prototype.push.apply(
      deltaYList,
      calcDeltaPos(textCode['DeltaY'], textStr)
    );
  }

  if (textStr) {
    for (let i = 0; i < textStr.length; i++) {
      if (i > 0 && deltaXList.length > 0) {
        x += deltaXList[i - 1];
        if (ctm) {
          const r = ctmCalDetalPoint(deltaXList[i - 1], 0, ctm);
          cx += r.ctmX;
        } else {
          cx = x;
        }
      }
      if (i > 0 && deltaYList.length > 0) {
        y += deltaYList[i - 1];
        if (ctm) {
          const r = ctmCalDetalPoint(0, deltaYList[i - 1], ctm);
          cy += r.ctmY;
        } else {
          cy = y;
        }
      }
      let realPos = adjustPos(cx, cy, boundary);
      if (compositeObjectCTM) {
        realPos = ctmCalPoint(realPos.cx, realPos.cy, compositeObjectCTM);
      }
      let text = textStr.substring(i, i + 1);
      let textCodePoint = {
        x: converterDpi(x),
        y: converterDpi(y),
        text: text,
        cx: converterDpi(realPos.cx),
        cy: converterDpi(realPos.cy)
      };
      textCodePointList.push(textCodePoint);
    }
  }

  if (textCodePointList.length > 0 && cgTransform?.length) {
    for (const transform of cgTransform) {
      // console.log(transform)
      const pos = transform['CodePosition'];
      const glyphCount = transform['GlyphCount'];
      // const codeCount = transform['CodeCount']
      for (let i = pos; i < glyphCount + pos; i++) {
        if (textCodePointList.length <= i) {
          const glyphs = `${
            textCodePointList[textCodePointList.length - 1].glyph
          } ${transform['Glyphs'][i - pos]}`;
          textCodePointList[textCodePointList.length - 1].glyph = glyphs;
        } else {
          textCodePointList[i].glyph = transform['Glyphs'][i - pos];
        }
      }
    }
  }
  return textCodePointList;
};

export const drawBMPImage: (d: string) => Promise<string> = async (
  imgSrc: string
) => {
  try {
    return await new Promise((resolve, reject) => {
      const images = new Image();
      images.src = imgSrc;
      const devRatio = window.devicePixelRatio || 1;
      images.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = images.width * devRatio;
        canvas.height = images.height * devRatio;
        const context = canvas.getContext('2d') as CanvasRenderingContext2D;
        context.drawImage(images, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        for (let i = 0; i < imageData.data.length; i += 4) {
          //rgb大于250的透明度y均设置成0
          if (
            imageData.data[i] > 250 &&
            imageData.data[i + 1] > 250 &&
            imageData.data[i + 2] > 250
          ) {
            imageData.data[i + 3] = 0;
          }
        }
        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      images.onerror = reject;
    });
  } catch (err) {
    console.error('渲染BMP图片异常');
  }
  return '';
};

/**
 * 绘制自定义字体
 * @param path
 * @param horiUnderlinePosition
 * @param units_per_EM
 * @param xsize
 * @param ysize
 * @param color
 * @param defaultFillOpacity
 * @returns
 */
export const drawGlyph = function (
  path: string,
  horiUnderlinePosition: string,
  units_per_EM: number,
  xsize: number,
  ysize: number,
  color: string,
  defaultFillOpacity: string
) {
  let xScale = xsize / units_per_EM;
  let yScale = ysize / units_per_EM;

  let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('version', '1.1');
  let svgPathElement = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  );
  svgPathElement.setAttribute(
    'transform',
    `translate(0, ${ysize}) scale(${xScale}, ${-yScale}) translate(0, ${-horiUnderlinePosition})`
  );
  svgPathElement.setAttribute('d', path);
  if (color) {
    svgPathElement.setAttribute('fill', color);
  }
  svgPathElement.setAttribute('fill-opacity', defaultFillOpacity);
  svg.appendChild(svgPathElement);
  return { img: svg, yScale };
};
