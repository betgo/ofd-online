import { ResultData, LayerPageBlock } from '../core/ofd-core/index.d';
declare const renderPathObject: (pathObject: LayerPageBlock & {
    [k: string]: any;
}, data: ResultData, content: HTMLElement, drawLineWidth?: number, drawFillColor?: string, drawStrokeColor?: string, isStampAnnot?: boolean, compositeObjectAlpha?: any, compositeObjectBoundary?: any, compositeObjectCTM?: any) => SVGSVGElement;
export default renderPathObject;
