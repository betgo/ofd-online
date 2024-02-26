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
    formatAnnotationXml(annotFile: Element, annot: any): void;
    setRootPath(annotationsXml: Element, relativePath: string): void;
    setAnnotationsXml(annotationsElements: Element[]): void;
}
export default AnnotationsXml;
