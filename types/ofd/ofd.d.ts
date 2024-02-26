import { ResultData } from '../core/ofd-core';
interface Options {
    file: string | File | ArrayBuffer;
    ofd?: string | File | ArrayBuffer;
    content?: Element;
    id?: string;
    fail?: (err: Error) => undefined;
    success?: (s: HTMLElement) => undefined;
    screenWidth?: number;
    requestOptions?: undefined | {
        [key: string]: any;
    };
    requestData?: undefined | {
        [key: string]: any;
    };
    responseFilter?: (key: {
        [key: string]: string | number;
    }) => string;
}
/**
 * 直接输出渲染节点
 * @param param0
 * @returns
 */
export declare const getSVGDoms: (r: Options) => Promise<HTMLElement>;
/**
 *  输出格式化OFD JSON
 * @param param0
 * @returns
 */
declare const OFDParse: (p: Options) => Promise<{
    code: number;
    data: ResultData;
}>;
export default OFDParse;
