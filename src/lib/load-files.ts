import JSZip from 'jszip';
import UnzipError from '../errors/UnzipErrors';

type TypeFile = File | ArrayBuffer;

const unzipFile = (file: TypeFile) => {
  return new Promise((resolve, reject) => {
    try {
      if (!file) {
        reject(new UnzipError(404));
      }
      if (file instanceof File) {
      }
      if (file instanceof ArrayBuffer) {
        JSZip.loadAsync(file).then(res => {
          console.log(res);
        });
      }
      resolve('');
    } catch (err) {
      console.error('unzip:', err);
    }
  });
};

export default unzipFile;
