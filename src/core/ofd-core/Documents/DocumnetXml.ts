import { Element } from 'xml-js';
import OFDElement from '../OFDElement';
import PagesXml from '../Pages/PageXml';
import AnnotationsXml from '../Annotations/AnnotationsXml';
import TemplatePages from '../TemplatePages/TemplatePages';
import { NameREG } from '../utils';

import DocumentResXml from './DocumentResXml';
import PublicResXml from './PublicResXml';
// import { OFD_Q } from '../constant';

type PageAreaKey = 'PhysicalBox' | 'ApplicationBox' | 'ContentBox' | 'BleedBox';

class DocumnetXml extends OFDElement {
  static fileName: string;
  constructor(fileName: string) {
    super();
    DocumnetXml.fileName = fileName;
    this.getPageArea();
    this.getPages();
    // 获取 DocumnetRes
    this.getDocumentRes();
    // 获取 PublicRes
    this.getPublicRes();
    // 获取 模版
    this.getTemplatePage();
    // 获取annotation
    this.getAnnotation();
  }

  /**
   * 获取 TemplatePage
   * @returns
   */
  getTemplatePage() {
    const CommonDataElements = this.getOFDElements(
      DocumnetXml.fileName,
      'CommonData'
    );
    if (CommonDataElements?.elements?.length) {
      const tplElements: Element[] = [];
      CommonDataElements.elements.forEach(element => {
        if (element.name === this.OFDCommonQName('TemplatePage')) {
          // console.log('element:', element);
          tplElements.push(element);
        }
      });
      if (tplElements?.length) {
        return new TemplatePages(tplElements);
      }
    }
    //const res = this.getOFDElements(DocumnetXml.fileName, 'TemplatePage');
    return null;
  }

  getDocumentRes() {
    const res = this.getOFDElements(DocumnetXml.fileName, 'DocumentRes');
    if (res && res.elements) {
      return new DocumentResXml(res.elements);
    }
    return null;
  }

  getPublicRes() {
    const res = this.getOFDElements(DocumnetXml.fileName, 'PublicRes');
    if (res && res.elements) {
      return new PublicResXml(res.elements);
    }
    return null;
  }

  getPages() {
    //  const res = this.getElements('DocRoot', DocumnetXml.fileName);
    const res = this.getOFDElements(DocumnetXml.fileName, 'Pages');
    if (res && res.elements) {
      return new PagesXml(res.elements);
    }
    return null;
  }

  /**
   * 获取文档区域坐标
   * @returns
   */
  getPageArea() {
    const res = this.getOFDElements(DocumnetXml.fileName, 'PageArea');
    // console.log('getPageArea:', DocumnetXml.fileName, res);
    if (res && res.elements) {
      const PageAreaElements = res.elements;
      PageAreaElements.forEach(item => {
        if (item?.name) {
          const { name, elements } = item;
          const simpleName: PageAreaKey = name.replace(
            NameREG,
            ''
          ) as PageAreaKey;
          if (!OFDElement.PageArea) {
            OFDElement.PageArea = { PhysicalBox: '' };
          }
          if (elements?.length) {
            OFDElement.PageArea[simpleName] = String(elements[0]?.text);
          }
        }
      });
    }
    return null;
  }

  getAnnotation() {
    const res = this.getOFDElements(DocumnetXml.fileName, 'Annotations');
    if (res && res.elements) {
      return new AnnotationsXml(res.elements);
    }
    return null;
  }
}

export default DocumnetXml;
