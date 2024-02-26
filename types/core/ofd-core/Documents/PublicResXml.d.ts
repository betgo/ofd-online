import { Element } from 'xml-js';
import OFDElement from '../OFDElement';
declare class PublicResXml extends OFDElement {
    /**
     * PublicRes.xml文件
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    static fileName: string;
    constructor(documnetResElements: Element[]);
    setRootPath(publicResXml: Element): void;
    setPublicResXml(publicResElements: Element[]): void;
}
export default PublicResXml;
