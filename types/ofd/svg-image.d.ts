import { ResultData, LayerPageBlock, StampAnnot } from '../core/ofd-core/index.d';
interface PictureInfo {
    type: string;
    data: Uint8Array;
    width: string;
    height: string;
}
declare const renderImageObject: (imageObject: LayerPageBlock & {
    [k: string]: any;
}, data: ResultData, content: HTMLElement, isStampAnnot?: boolean, StampId?: string, PageRef?: string, compositeObjectCTM?: any) => false | undefined;
export declare const renderBitImage: (pictureInfo: PictureInfo, Box: StampAnnot, content: HTMLElement) => HTMLCanvasElement | undefined;
export default renderImageObject;
