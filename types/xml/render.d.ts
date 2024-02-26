import { Element } from 'xml-js';
export declare const elementRender: (w: Element[], d: HTMLElement) => boolean;
export declare const textRender: (a: Element, d: HTMLElement) => void;
export declare const cdataRender: (a: Element, d: HTMLElement) => void;
declare const render: (a: any) => HTMLDivElement;
export default render;
