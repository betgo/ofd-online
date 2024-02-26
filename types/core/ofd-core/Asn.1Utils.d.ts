import { ASN1Tag } from '../../lib/asn1/Asn.1';
import Stream from '../../lib/asn1/Stream';
interface ASN1 {
    tagLen: number;
    tag: ASN1Tag;
    stream: Stream;
    header: number;
    length: number;
    value: string;
    tagName: string;
    sub: ASN1[] | undefined | null;
}
export declare const STATIC_TAG_SEQUENCE = "SEQUENCE";
export declare const STATIC_TAG_OCTET_STRING = "OCTET_STRING";
export declare const STATIC_TAG_IA5STRING = "IA5String";
export declare const STATIC_TAG_INTEGER = "INTEGER";
/**
 * utf8 string 转Uint8Array
 * @param str
 * @returns
 */
export declare function toUint8Arr(str: string): Uint8Array;
declare class Asn1Parse {
    static asn1ESealHeader: ASN1;
    static asn1ESealEsID: ASN1;
    static asn1ESealPictureInfo: ASN1;
    static asn1ESealExtDatas: ASN1;
    static asn1ESealProperty: ASN1;
    asn1: string;
    static pricuteInfo: {
        data: Uint8Array | null | string;
        type: string;
        width: string;
        height: string;
    };
    constructor(str: string);
    init(): void;
    decodeUTCTime(str: string): string;
    parsePricuter(ans: ASN1): void;
    getPicture(): {
        type: string;
        data: Uint8Array;
        width: string;
        height: string;
    } | null;
}
export default Asn1Parse;
