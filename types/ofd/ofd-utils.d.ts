import { Res } from '../core/ofd-core';
/**
 * @desc 字体family
 */
export declare const FONT_FAMILY: {
    楷体: string;
    kaiti: string;
    Kai: string;
    simsun: string;
    宋体: string;
    黑体: string;
    仿宋: string;
    小标宋体: string;
    方正小标宋_gbk: string;
    仿宋_gb2312: string;
    楷体_gb2312: string;
    华文楷体: string;
    华文中宋: string;
    couriernew: string;
    'courier new': string;
};
export declare const pageZIndex: {
    Background: number;
    Body: number;
    WatermarkAnnot: number;
    Foreground: number;
};
/**
 * 设置style样式文件
 * @param ele
 * @param styles
 */
export declare const setStyle: (ele: HTMLElement | SVGImageElement | SVGSVGElement, styles: {
    [k: string]: string | number;
}) => void;
export declare const converterDpi: (p: string | number) => number;
export declare const parseCtm: (ctm: string) => string[] | null;
export declare const parseAbbreviatedData: (abbreviatedData: string) => string | null;
/**
 * 格式化ST_Box数据
 * @param ST_Box
 * @returns
 */
export declare const formatSTBox: (a: string, shouldAds?: boolean) => {
    left: number;
    top: number;
    width: number;
    height: number;
};
export declare const getRes: (Res: Res[] | null, resId: string, type: string) => Res | null;
export declare const getFont: (Fonts: Res[] | null, resId: string) => Res | null;
export declare const getDrawParam: (DrawParam: Res[] | null, resId: string) => Res | null;
export declare const getMultiMedia: (MultiMedias: Res[] | null, resId: string) => Res | null;
/**
 * 替换html可识别family
 * @param fontObj
 * @returns
 */
export declare const getFontFamily: (fontInfo?: Res) => any;
/**
 * 格式化颜色
 * @param color
 * @returns
 */
export declare const parseColor: (color: string) => string;
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
export declare const calTextPoint: (textCode: {
    [k: string]: any;
}, cgTransform: {
    [k: string]: any;
}[], ctm: string | string[], Boundary: string, compositeObjectCTM?: any) => any[];
export declare const drawBMPImage: (d: string) => Promise<string>;
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
export declare const drawGlyph: (path: string, horiUnderlinePosition: string, units_per_EM: number, xsize: number, ysize: number, color: string, defaultFillOpacity: string) => {
    img: SVGSVGElement;
    yScale: number;
};
