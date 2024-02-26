import VaildMimeError from '../errors/MimeError';
import readBuffer from './read-buffer';

const mimeTypes: { [key: string]: string } = {
  '504B0304': 'zip',
  '504B0506': 'zip',
  '504B0708': 'zip',
  '52617221': 'rar',

  '89504E47': 'png',
  '25504446': 'pdf',
  '4F676753': 'ogg',
  '75737461': 'tar',
  D0CF11E0: 'msOffice',
  FFD8FFDB: 'jpg',
  FFD8FFE0: 'jpg',
  FFD8FFEE: 'jpeg',
  FFD8FFE1: 'jpeg',
  '47494638': 'gif',
  '52494646': 'wegp',
  '424D663B': 'bmp',
  '3C3F786D': 'xml',
  '3C786272': 'xml',
  '32303232': 'xml'
};

const msOfficeType: { [key: string]: string } = {
  'application/msword': 'doc',
  'pplication/vnd.ms-excel': 'xls',
  'pplication/vnd.mspowerpoint': 'ppt',
  'pplication/vnd.ms-outlook': 'msg'
};

const zipsFileType: { [key: string]: string } = {
  'application/ofd': 'ofd',
  'application/vnd.ofd': 'ofd',
  'application/docx': 'docx',
  'application/xlsx': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
  'application/zip': 'zip',
  'application/x-zip-ompressed': 'zip'
};

/**
 * 使用arrayBuffer获取文件Magic，转换为文件类型
 * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 * @link https://datatracker.ietf.org/doc/html/rfc6838
 * @date 2022/7/5 - 09:48:27
 */
const getFileType = async (file: File): Promise<string> => {
  try {
    if (!file || !(file instanceof File)) {
      throw new VaildMimeError(404);
    }
    const bufferData = await readBuffer(file);
    // uint8Array 转16进制
    const hex16Array = Array.prototype.map.call(new Uint8Array(bufferData), x =>
      ('00' + x.toString(16)).slice(-2)
    );

    const hex16String = hex16Array.join('').toLocaleUpperCase();

    const mimeType = mimeTypes[hex16String];
    let { type: fileType } = file;
    if (!fileType && !mimeType) {
      return '';
    }

    // 同时存在 fileType 以及 mimeType 优先使用mimeType，zip mimeType需要判断，fileType是否是zip类型文件比如：PDF
    if (fileType && mimeType) {
      if (mimeType === 'zip') {
        return zipsFileType[fileType] || fileType.replace(/application\//, '');
      }
      if (mimeType === 'msOffice') {
        return msOfficeType[fileType] || fileType.replace(/application\//, '');
      }
      return mimeType;
    }
    if (!fileType) {
      // 不存在type,截取文件名后缀
      return mimeType;
    }
    if (!mimeType) {
      return fileType;
    }
  } catch (err) {
    console.error(err, 'getFileType error');
  }

  return '';
};

export default getFileType;
