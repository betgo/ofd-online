import VaildMimeError from '../errors/MimeError';

const readBuffer = (file: File, start = 0, end = 4): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    try {
      const readFile = new FileReader();
      readFile.onload = () => {
        if (readFile.result && readFile.result instanceof ArrayBuffer) {
          resolve(readFile.result);
        }
      };
      readFile.onerror = reject;
      readFile.readAsArrayBuffer(file.slice(start, end));
    } catch (err) {
      reject(new VaildMimeError(500));
    }
  });

export default readBuffer;
