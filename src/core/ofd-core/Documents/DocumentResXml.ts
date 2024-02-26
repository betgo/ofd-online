import VaildOFDError from 'src/errors/OFDErrors';
import { Element } from 'xml-js';

import OFDElement from '../OFDElement';
// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';

class DocumentResXml extends OFDElement {
  /**
   * DocumentRes xml文件，
   * @date 2022/7/27 - 09:41:22
   *
   * @type {Element[]}
   */
  static fileName: string;
  constructor(documnetResElements: Element[]) {
    super();
    this.setDocumnetResXml(documnetResElements);
  }

  setRootPath(documnetResXml: Element) {
    if (documnetResXml?.elements) {
      documnetResXml.elements.forEach(item => {
        if (item?.name) {
          const { name, attributes, elements } = item;
          // 设置资源路径
          if (this.OFDCommonQName('Res') === name) {
            const rootPath = `${OFDElement.STLoc}${attributes?.BaseLoc || ''}`;
            OFDElement.DocumnetResRoot = rootPath;
            if (elements && elements.length) {
              this.setRes(elements, rootPath);
            }
          }
        }
      });
    }
  }

  setDocumnetResXml(documnetResElements: Element[]): void {
    if (documnetResElements?.length && documnetResElements.length === 1) {
      const documentResXmlPath = `${OFDElement.STLoc}${documnetResElements[0].text}`;
      this.setRootPath(OFDElement.OFDElements[documentResXmlPath]);
    } else {
      throw new VaildOFDError(9999, '获取documentRes失败');
    }
  }
}

export default DocumentResXml;
