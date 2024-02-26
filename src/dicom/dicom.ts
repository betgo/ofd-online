// import dicomParser from 'dicom-parser';

interface Options {
  file: string | File | ArrayBuffer;
  container?: Element;
  requestOptions?: undefined | { [key: string]: any };
  requestData?: undefined | { [key: string]: any };
  responseFilter?: (key: { [key: string]: string | number }) => string;
}
const parse = ({ file }: Options) => {
  if (file instanceof File) {
    var reader = new FileReader();
    reader.onload = function () {
      // var arrayBuffer = reader.result as ArrayBuffer;

      // Here we have the file data as an ArrayBuffer.  dicomParser requires as input a
      // Uint8Array so we create that here
      // var byteArray = new Uint8Array(arrayBuffer);

      // var kb = byteArray.length / 1024;
      // var mb = kb / 1024;
      // var byteStr = mb > 1 ? mb.toFixed(3) + ' MB' : kb.toFixed(0) + ' KB';

      // set a short timeout to do the parse so the DOM has time to update itself with the above message
      setTimeout(function () {
        // Invoke the paresDicom function and get back a DataSet object with the contents
        try {
          // var start = new Date().getTime();
          // const dataSet = dicomParser.parseDicom(byteArray);
          // Here we call dumpDataSet to update the DOM with the contents of the dataSet
          // dumpDataSet(dataSet);
        } catch (err) {
          console.error('err:', err);
        }
      }, 20);
    };

    reader.readAsArrayBuffer(file);
  }
};

export default parse;
