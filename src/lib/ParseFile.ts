import JSZip from 'jszip';
class ParseFile {
  static zip: JSZip;

  init(zip: JSZip) {
    ParseFile.zip = zip;
  }

  // parseImageFromZip(data: { Path: string }) {}
}

export default new ParseFile();
