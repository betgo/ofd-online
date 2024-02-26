import JSZip from 'jszip';
import { ResultData } from '../core/ofd-core';
interface OFDXML {
    'OFD.xml': any;
    [key: string]: any;
}
/**
 * @description 解析ofd.xml
 */
/**
 * @description 解析ofd xml 文件
 * @param data OFD解压出来的文件
 * @param zip jszip 实例化对象
 * @param isParse true:直接返回解析json，false 返回dom节点
 * @param isSeal true:签章渲染，false:非签章渲染
 */
declare const parse: (data: OFDXML, zip: JSZip, defaultWidth?: number, isParse?: boolean, isSeal?: boolean) => Promise<HTMLElement | ResultData>;
export default parse;
