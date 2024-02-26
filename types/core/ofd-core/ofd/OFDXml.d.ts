import { Element } from 'xml-js';
import OFDElement from '../OFDElement';
import DocumnetXml from '../Documents/DocumnetXml';
import SignaturesXml from '../Signatures/Signatures';
import { ResultData } from '..';
declare class OFDXMl extends OFDElement {
    static fileName: string;
    constructor(ofdxml: {
        [key: string]: Element;
    });
    getDocument(): DocumnetXml | null;
    getSignatures(): SignaturesXml | null;
    /**
     * 将OFD文件XML转换成渲染获取可操作数据
     * @returns ResultData
     */
    getData(): ResultData;
}
export default OFDXMl;
