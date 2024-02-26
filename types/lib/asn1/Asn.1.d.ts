import Stream from './Stream';
export declare class ASN1Tag {
    tagClass: number;
    tagNumber: number;
    tagConstructed: boolean;
    constructor(stream: Stream);
    isUniversal(): boolean;
    isEOC(): boolean;
}
export declare class Asn1 {
    stream: {
        [k: string | number]: any;
    };
    header: number;
    length: number;
    tag: ASN1Tag;
    tagLen: number;
    sub: any[];
    constructor(stream: {
        [k: string | number]: any;
    }, header: number, length: number, tag: ASN1Tag, tagLen: number, sub: any[]);
    typeName(): string | undefined;
    content(maxLength?: number): any;
    toString(): string;
    toPrettyString(indent: any): string;
    posStart(): any;
    posContent(): any;
    posEnd(): any;
    /** Position of the length. */
    posLen(): any;
    toHexString(): any;
    toB64String(): any;
}
export default Asn1;
