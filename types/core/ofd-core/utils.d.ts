import { Element } from 'xml-js';
export declare const reHex: RegExp;
export declare function recursion(elements: Array<Element>, result: {
    [key: string]: any;
}, flatResult: {
    [key: string]: any;
}): void;
export declare function recursionGet(elements: Array<Element>, qName: string): Element | null;
export declare const NameREG: RegExp;
