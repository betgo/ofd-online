import VaildOFDError from 'src/errors/OFDErrors';
import { Element } from 'xml-js';

import OFDElement from '../OFDElement';
// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';

class PublicResXml extends OFDElement {
  /**
   * PublicRes.xml文件
   * @date 2022/7/27 - 09:41:22
   *
   * @type {Element[]}
   */
  static fileName: string;
  constructor(documnetResElements: Element[]) {
    super();
    this.setPublicResXml(documnetResElements);
  }

  setRootPath(publicResXml: Element) {
    if (publicResXml?.elements) {
      publicResXml.elements.forEach(item => {
        if (item?.name) {
          const { name, attributes, elements } = item;
          // 设置资源路径
          if (name === this.OFDCommonQName('Res')) {
            const rootPath = `${OFDElement.STLoc}${attributes?.BaseLoc || ''}`;
            OFDElement.PublicResRoot = rootPath;
            if (elements && elements.length) {
              this.setRes(elements, rootPath);
            }
          }
        }
      });
    }
  }

  setPublicResXml(publicResElements: Element[]): void {
    if (publicResElements?.length && publicResElements.length === 1) {
      const publicResXmlPath = `${OFDElement.STLoc}${publicResElements[0].text}`;
      this.setRootPath(OFDElement.OFDElements[publicResXmlPath]);
    } else {
      throw new VaildOFDError(9999, '获取PublicRes失败');
    }
  }

  //   getPages() {
  //     const res = this.getElements('DocRoot', PagesXml.fileName);
  //     console.log('getPages:', res);
  //     if (res) {
  //       return new DocumnetXml(this.OFDElements, res);
  //     }
  //     return null;
  //   }
}

export default PublicResXml;
