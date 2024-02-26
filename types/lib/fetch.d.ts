declare type FetchMethod = 'POST' | 'GET';
declare type FetchMode = 'no-cors' | 'cors' | 'same-origin';
declare type FetchCredentials = 'include' | 'same-origin' | 'omit';
declare type FetchCache = 'default' | 'no-cache' | 'reload' | 'force-cache' | 'only-if-cached';
interface FetchHeader {
    [key: string]: string;
}
interface FetchOptions {
    method?: FetchMethod;
    headers?: FetchHeader;
    mode?: FetchMode;
    credentials?: FetchCredentials;
    cache?: FetchCache;
    body?: any;
}
declare const _default: (url: string, data: any, options: FetchOptions) => Promise<any>;
export default _default;
