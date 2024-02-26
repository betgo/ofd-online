import { Element } from 'xml-js';
import OFDElement from '../OFDElement';
declare class DocumentResXml extends OFDElement {
    /**
     * DocumentRes xml文件，
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    static fileName: string;
    constructor(documnetResElements: Element[]);
    setRootPath(documnetResXml: Element): void;
    setDocumnetResXml(documnetResElements: Element[]): void;
}
export default DocumentResXml;
