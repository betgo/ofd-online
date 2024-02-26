import { Element } from 'xml-js';
import OFDElement from '../OFDElement';
declare class PagesXml extends OFDElement {
    /**
     * Pages xml文件，以数组存放，存在多页
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    pagesXml: (Element & {
        PageID: string;
    })[];
    static fileName: string;
    constructor(pagesElements: Element[]);
    formatPageXml(pagesFile: (Element & {
        PageID: string;
    })[]): void;
    setPagesXml(pageElements: Element[]): void;
}
export default PagesXml;
