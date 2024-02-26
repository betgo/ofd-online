/**
 * 使用arrayBuffer获取文件Magic，转换为文件类型
 * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 * @link https://datatracker.ietf.org/doc/html/rfc6838
 * @date 2022/7/5 - 09:48:27
 */
declare const getFileType: (file: File) => Promise<string>;
export default getFileType;
