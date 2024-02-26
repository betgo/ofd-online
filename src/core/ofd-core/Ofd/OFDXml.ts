import { Element } from 'xml-js';

import OFDElement from '../OFDElement';
import DocumnetXml from '../Documents/DocumnetXml';
import SignaturesXml from '../Signatures/Signatures';
import { ResultData } from '..';

class OFDXMl extends OFDElement {
  static fileName: string;
  constructor(ofdxml: { [key: string]: Element }) {
    OFDElement.init();
    OFDXMl.fileName = 'OFD.xml';
    super(ofdxml);
    this.XmlChangeJson(OFDXMl.fileName);
    this.getDocument();
    this.getSignatures();
  }

  getDocument() {
    const res = this.getElements('DocRoot', OFDXMl.fileName);
    this.setST_Loc(res.replace(/^\//, ''));
    if (res) {
      return new DocumnetXml(res.replace(/^\//, ''));
    }
    return null;
  }

  getSignatures() {
    const res = this.getElements('Signatures', OFDXMl.fileName);
    if (res) {
      return new SignaturesXml(res.replace(/^\//, ''));
    }
    return null;
  }

  /**
   * 将OFD文件XML转换成渲染获取可操作数据
   * @returns ResultData
   */
  getData(): ResultData {
    const {
      Pages,
      Res,
      OFDElements,
      DocumnetResRoot,
      PublicResRoot,
      Tpls,
      STLoc,
      PageArea,
      Signatures,
      PageSignatures
    } = OFDElement;

    return {
      Pages,
      Res,
      DocumnetResRoot,
      PublicResRoot,
      Tpls,
      STLoc,
      OFDElements,
      PageArea,
      Signatures,
      PageSignatures
    };
  }
}

export default OFDXMl;
