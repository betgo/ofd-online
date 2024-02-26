/// <reference types="node" />
/**
 * @description 加载内置字体
 */
declare class FontMap {
    loading: boolean;
    fontFile: {
        [k: string | number]: {
            getPath: (s: string, n?: number, c?: number, v?: number, op?: {
                hinting?: boolean;
                kerning?: boolean;
                features?: boolean;
            }) => {
                glyphs: any;
                toSVG: (a: number) => string;
                Path: any;
            };
        };
    };
    intervalTimer: NodeJS.Timer | null;
    callbacks: {
        funs: (l: boolean) => void;
        k: string | number;
        file: ArrayBuffer;
    }[];
    init(): void;
    setFontFile(key: string | number, file: ArrayBuffer, callback: (r: boolean) => void): void;
    getFontFile(key: string | number, txt: string, x: number, y: number, s: number): string;
    destroy(): void;
}
declare const _default: FontMap;
export default _default;
