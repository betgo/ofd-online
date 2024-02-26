interface Options {
    file: string | File | ArrayBuffer;
    container?: Element;
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
declare const parse: ({ file }: Options) => void;
export default parse;
