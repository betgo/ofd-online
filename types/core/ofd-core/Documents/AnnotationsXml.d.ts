import { Element } from 'xml-js';
import OFDElement from '../OFDElement';
declare class AnnotationsXml extends OFDElement {
    /**
     * PublicRes.xml文件
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    static fileName: string;
    constructor(documnetResElements: Element[]);
    setRootPath(annotationsXml: Element): void;
    setAnnotationsXml(annotationsElements: Element[]): void;
}
export default AnnotationsXml;
