interface Options {
    file: string | File | ArrayBuffer;
    content?: Element;
    id?: string;
    success?: (k: Element) => any;
    fail?: (e: Error) => any;
    requestOptions?: undefined | {
        [key: string]: any;
    };
    requestData?: undefined | {
        [key: string]: any;
    };
    responseFilter?: (key: {
        [key: string]: string | number;
    }) => string;
}
declare const _default: ({ file, content, id, ...restOptions }: Options) => Promise<unknown>;
export default _default;
