import { Element } from 'xml-js';

import VaildOFDError from '../../../errors/OFDErrors';

import OFDElement from '../OFDElement';
// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';

class TemplatePages extends OFDElement {
  /**
   * TemplatePages 文件，以数组存放，存在多页
   * @date 2022/7/27 - 09:41:22
   *
   * @type {Element[]}
   */
  tplsXml: { [k: string]: Element } | null;
  static fileName: string;
  constructor(tplsElements: Element[]) {
    super();
    // 区分多页TemplatePages 暂时没有该类型OFD
    if (tplsElements?.length) {
      this.setTplsXml(tplsElements);
    } else {
      throw new VaildOFDError(9999, 'Documents下TemplatePage解析失败');
    }
    this.tplsXml = null;
  }

  formatTplsXml(tplsFile: { [k: string]: Element }) {
    Object.entries(tplsFile).forEach(([keys, content]) => {
      if (content && content.elements?.length) {
        this.setTpls(content, keys);
      }
    });
  }

  setTplsXml(tplsElements: Element[]): void {
    tplsElements.forEach(tplElement => {
      if (tplElement?.attributes) {
        const { BaseLoc, ID = '' } = tplElement.attributes;
        const tplsPath = `${OFDElement.STLoc}${BaseLoc}`;
        if (!this.tplsXml) {
          this.tplsXml = {};
        }

        this.tplsXml[ID] = OFDElement.OFDElements[tplsPath];
      }
    });
    if (this.tplsXml) {
      // 获取 Tpls xml 内数据
      this.formatTplsXml(this.tplsXml);
    }
  }
}

export default TemplatePages;
