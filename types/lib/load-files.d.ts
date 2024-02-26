declare type TypeFile = File | ArrayBuffer;
declare const unzipFile: (file: TypeFile) => Promise<unknown>;
export default unzipFile;
