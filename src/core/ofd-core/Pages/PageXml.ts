import { Element } from 'xml-js';

import OFDElement from '../OFDElement';
// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';

class PagesXml extends OFDElement {
  /**
   * Pages xml文件，以数组存放，存在多页
   * @date 2022/7/27 - 09:41:22
   *
   * @type {Element[]}
   */
  pagesXml: (Element & { PageID: string })[];
  static fileName: string;
  constructor(pagesElements: Element[]) {
    super();
    this.setPagesXml(pagesElements);
    this.pagesXml = [];
    // this.getPages();
  }

  formatPageXml(pagesFile: (Element & { PageID: string })[]) {
    pagesFile.forEach(item => {
      this.setPages(item);
    });
  }

  setPagesXml(pageElements: Element[]): void {
    if (pageElements?.length) {
      const pageName = this.OFDCommonQName('Page');
      this.pagesXml = [];
      pageElements.forEach(item => {
        const { attributes, name } = item;
        if (name === pageName && attributes) {
          const { BaseLoc, ID } = attributes;
          const pagePath = `${OFDElement.STLoc}${BaseLoc}`;
          this.pagesXml.push({
            ...OFDElement.OFDElements[pagePath],
            PageID: String(ID || '')
          });
        }
      });
      // 获取 Page xml 内数据
      this.formatPageXml(this.pagesXml);
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

export default PagesXml;
