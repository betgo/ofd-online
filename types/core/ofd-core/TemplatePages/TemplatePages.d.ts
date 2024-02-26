import { Element } from 'xml-js';
import OFDElement from '../OFDElement';
declare class TemplatePages extends OFDElement {
    /**
     * TemplatePages 文件，以数组存放，存在多页
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    tplsXml: {
        [k: string]: Element;
    } | null;
    static fileName: string;
    constructor(tplsElements: Element[]);
    formatTplsXml(tplsFile: {
        [k: string]: Element;
    }): void;
    setTplsXml(tplsElements: Element[]): void;
}
export default TemplatePages;
