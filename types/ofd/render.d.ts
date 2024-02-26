import { ResultData, Page } from '../core/ofd-core/index.d';
/**
 * 渲染OFD
 * @param data OFD元数据
 * @param zip 解压
 * @param defaultWall 最大宽度
 * @param isSeal 是否是签章渲染
 */
export declare const OFDRender: (data: ResultData, defaultWidth?: number, isSeal?: boolean) => HTMLDivElement;
/**
 * 序列化绘制 Template pages
 * @param pages
 * @param data
 * @param zIndex
 * @param pageDivs
 */
export declare const renderTplsPage: (pages: Page[], data: ResultData, zIndex: number) => any[];
export declare const renderPage: (page: Page, data: ResultData, content?: HTMLElement) => any[];
