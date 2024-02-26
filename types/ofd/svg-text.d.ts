import { ResultData, LayerPageBlock } from '../core/ofd-core/index.d';
/**
 * 绘制Text
 */
declare const renderTextObject: (info: LayerPageBlock & {
    [k: string]: any;
}, data: ResultData, content: HTMLElement, drawFillColor?: string, drawStrokeColor?: string) => void;
export default renderTextObject;
