import { Element } from 'xml-js';
import OFDElement from '../OFDElement';
import { Seal, Signature, Signatures, SignedInfo } from '../index.d';
declare class SignaturesXml extends OFDElement {
    static fileName: string;
    static Signatures: Signatures[];
    signedPath: string;
    constructor(fileName: string);
    getDocumentRes(): void;
    getPublicRes(): null;
    getSeal(filePath: string): Seal;
    getSignedInfo(signedInfoElement: Element[]): SignedInfo;
    getSignature(filePath: string): Signature | null;
    /**
     * 获取文档区域坐标
     * @returns
     */
    getSignatures(): null;
}
export default SignaturesXml;
