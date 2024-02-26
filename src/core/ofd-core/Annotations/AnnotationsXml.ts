import VaildOFDError from 'src/errors/OFDErrors';
import { Element } from 'xml-js';

import OFDElement from '../OFDElement';
// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';

class AnnotationsXml extends OFDElement {
  /**
   * PublicRes.xml文件
   * @date 2022/7/27 - 09:41:22
   *
   * @type {Element[]}
   */
  static fileName: string;
  constructor(documnetResElements: Element[]) {
    super();
    this.setAnnotationsXml(documnetResElements);
  }

  formatAnnotationXml(annotFile: Element, annot: any) {
    if (annotFile?.elements && annotFile.elements[0]) {
      annotFile.elements[0].elements?.forEach(item => {
        const { attributes, elements } = item;
        Object.assign(annot, { ...attributes });
        if (elements?.length) {
          const appearanceInfo = elements.find(
            cItem => cItem.name === this.OFDCommonQName('Appearance')
          );
          if (appearanceInfo && appearanceInfo.elements) {
            const result = { ...appearanceInfo.attributes };
            const block = this.getPageBlock(appearanceInfo.elements);
            Object.assign(result, { PageBlock: block });
            if (annot['Appearance'] === undefined) {
              annot['Appearance'] = [];
            }
            annot['Appearance'].push({ ...result });
          }
        }
      });
    }
  }

  setRootPath(annotationsXml: Element, relativePath: string) {
    if (annotationsXml?.elements) {
      annotationsXml.elements.forEach(item => {
        if (item?.name) {
          const { name, elements } = item;
          const priexPath = relativePath.substring(
            0,
            relativePath.lastIndexOf('/') + 1
          );
          if (name === this.OFDCommonQName('Annotations')) {
            // 设置资源路径
            if (elements?.length) {
              elements.forEach(cItem => {
                const {
                  name: cName,
                  attributes: cAttributes,
                  elements: cElements
                } = cItem;
                if (cName === this.OFDCommonQName('Page')) {
                  if (
                    cElements?.length === 1 &&
                    cElements[0].name === this.OFDCommonQName('FileLoc')
                  ) {
                    const { text: cText } = cElements[0].elements?.[0] || {};
                    const rootPath = `${OFDElement.STLoc}${priexPath}${
                      cText || ''
                    }`;
                    OFDElement.AnnotationsRoot = rootPath;
                    if (cAttributes?.PageID) {
                      const pageInfo = OFDElement.Pages?.find(
                        pItem => cAttributes.PageID === pItem.PageID
                      );
                      if (pageInfo) {
                        // annation写入pages
                        pageInfo['Annot'] = { FileLoc: cText as string };

                        this.formatAnnotationXml(
                          OFDElement.OFDElements[rootPath],
                          pageInfo['Annot']
                        );
                      }
                    }
                  }
                }
              });
            }
          }
        }
      });
    }
  }

  setAnnotationsXml(annotationsElements: Element[]): void {
    if (annotationsElements?.length && annotationsElements.length === 1) {
      const annotationsXmlPath = `${OFDElement.STLoc}${annotationsElements[0].text}`;
      this.setRootPath(
        OFDElement.OFDElements[annotationsXmlPath],
        annotationsElements[0].text as string
      );
    } else {
      throw new VaildOFDError(9999, '获取Annotations失败');
    }
  }
}

export default AnnotationsXml;
