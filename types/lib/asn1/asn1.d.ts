import Stream from './Stream';
export declare function decodeLength(stream: Stream): number | null;
export declare function decode(pStream: Stream | string, offset?: number): any;
export default decode;
