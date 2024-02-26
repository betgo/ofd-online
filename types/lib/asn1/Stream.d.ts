declare class Stream {
    enc: string | Uint8Array;
    pos: number;
    static hexDigits: '0123456789ABCDEF';
    constructor(streams: Stream | string, pos?: number);
    hexDigits: string;
    get(pos?: number): number;
    hexByte(b: number): string;
    hexDump(start: number, end: number, raw?: boolean): string;
    b64Dump(start: number, end: number): string;
    isASCII(start: number, end: number): boolean;
    parseStringISO(start: number, end: number): string;
    parseStringUTF(start: number, end: number): string;
    parseStringBMP(start: number, end: number): string;
    parseTime(start: number, end: number, shortYear: boolean): string;
    parseInteger(start: number, end: number): string;
    parseBitString(start: number, end: number, maxLength: number): {
        size: number;
        str: string;
    };
    parseOctetString(start: number, end: number, maxLength: number): {
        size: number;
        str: string;
    };
    parseOID(start: number, end: number, maxLength: number): string;
}
export default Stream;
