import VaildOFDError from 'src/errors/OFDErrors';
import { Element } from 'xml-js';
import { OFD_Q } from './constant';
import {
  Page,
  CT_Layer,
  LayerType,
  CT_PageArea,
  Res,
  LayerPageBlock,
  Signatures
} from './index.d';

import { NameREG, recursion, recursionGet } from './utils';

/**
 * @desc 解析ofd 工具类
 */

/**
 * Description placeholder
 * @date 2022/7/22 - 13:29:35
 *
 * @class OFDElement
 * @typedef {OFDElement}
 */
export class OFDElement {
  /**
   * OFD文件xml合集
   * @date 2022/7/22 - 14:30:53
   *
   * @type {Element}
   */
  static OFDElements: { [key: string]: Element };

  /**
   * OFDxml转换成json
   * @date 7/25/2022 - 7:42:51 PM
   *
   * @type {(null | { [key: string]: any })}
   */
  static OFDElemetJSON: null | { [key: string]: any };

  /**
   * OFD文档区域坐标
   * @date 2022/8/1 - 19:01:44
   *
   * @static
   * @type {(null | CT_PageArea)}
   */
  static PageArea: null | CT_PageArea;

  /**
   * ofd page数组
   * @date 2022/7/26 - 17:17:13
   *
   * @type {(null | Page)}
   */
  static Pages: null | Page[];

  /**
   * ofd Tpls 对象
   * @date 2022/7/26 - 17:17:13
   *
   * @type {(null | Tpls)}
   */
  static Tpls: null | { [k: string]: Page[] };

  /**
   * DocumnetRes.xml、PublicRes.xml 解析合并生成数组
   * @date 2022/8/1 - 13:24:15
   *
   * @static
   * @type {(null|Res[])}
   */
  static Res: null | Res[];

  /**
   * 签章信息
   * @date 2022/8/19 - 10:27:27
   *
   * @static
   * @type {(null | Signatures[])}
   */
  static Signatures: null | Signatures[];

  static PageSignatures: null | { [key: string]: Signatures[] };

  /**
   * documnetRes资源文件路径
   * @date 2022/8/1 - 15:18:10
   *
   * @static
   * @type {string}
   */
  static DocumnetResRoot: string;

  /**
   * PublicRes资源文件路径
   * @date 2022/8/1 - 15:18:10
   *
   * @static
   * @type {string}
   */
  static PublicResRoot: string;

  /**
   * AnnotationsRoot 文件路径
   * @date 2023/8/7 - 14:23:52
   *
   * @static
   * @type {string}
   */
  static AnnotationsRoot: string;

  /**
   * OFDxml转换成json 平级
   * @date 7/25/2022 - 7:42:51 PM
   *
   * @type {(null | { [key: string]: any })}
   */
  static OFDElemetFlatJSON: null | { [key: string]: any };

  /**
   * 根目录地址 以"/"结尾
   * @date 2022/7/27 - 16:00:31
   *
   * @static
   * @type {string}
   */
  static STLoc: string;

  constructor(ofdXML?: { [key: string]: Element }) {
    if (ofdXML) {
      OFDElement.OFDElements = ofdXML;
    }

    this.XmlChangeJson = this.XmlChangeJson.bind(this);
  }

  /**
   * @desc 初始化
   */
  static init() {
    // @ts-ignore
    this.OFDElements = undefined;
    this.STLoc = '';
    this.OFDElemetFlatJSON = null;
    this.OFDElemetJSON = null;
    this.Res = null;
    this.Tpls = null;
    this.Pages = null;
    this.PageArea = null;
    this.Signatures = null;
    this.PageSignatures = null;
    this.DocumnetResRoot = '';
    this.PublicResRoot = '';
    this.AnnotationsRoot = '';
  }

  /**
   * @desc 设置文档根目录名称
   */
  setST_Loc(str: string) {
    const ST = str.substring(0, str.indexOf('/'));
    OFDElement.STLoc = ST + '/';
  }

  /**
   *
   * @param name 节点名称
   * @returns ofd:xxx
   */
  OFDCommonQName(name: string) {
    return `${OFD_Q}${name}`;
  }

  /**
   * 获取指定文件xml
   * @param name
   * @param fileName
   * @returns
   */
  getElements(name: string, fileName: string): string {
    if (OFDElement.OFDElemetFlatJSON?.[fileName]) {
      // 遍历当前xml获取数据
      const xmlJSON = OFDElement.OFDElemetFlatJSON[fileName];
      if (xmlJSON) {
        return xmlJSON[this.OFDCommonQName(name)];
      }
    }
    return '';
  }

  /**
   * 格式化xml文件
   * @param ofdXml
   */
  XmlChangeJson(xmlKey: string) {
    const ofdXml = OFDElement.OFDElements[xmlKey];
    if (ofdXml && ofdXml.elements && ofdXml.elements.length) {
      const result: { [key: string]: any } = {};
      const flatResult: { [key: string]: any } = {};
      const elements = ofdXml.elements;
      recursion(elements, result, flatResult);
      if (!OFDElement.OFDElemetJSON) {
        OFDElement.OFDElemetJSON = {};
      }
      OFDElement.OFDElemetJSON[xmlKey] = result;
      if (!OFDElement.OFDElemetFlatJSON) {
        OFDElement.OFDElemetFlatJSON = {};
      }
      OFDElement.OFDElemetFlatJSON[xmlKey] = flatResult;
    }
  }

  /**
   * 获取OFD的元素
   * <p>
   * 若无法在OFD命名空间下获取同名元素，则尝试从默认命名空间获取。
   *
   * @param name OFD元素名称
   * @return OFD元素或null
   */
  getOFDElements(fileName: string, name: string) {
    const currentXml = OFDElement.OFDElements[fileName];
    if (currentXml?.elements) {
      return recursionGet(currentXml.elements, this.OFDCommonQName(name));
    }

    return null;
  }

  /**
   * 获取OFD的元素
   * <p>
   * 若无法在OFD命名空间下获取同名元素，则尝试从默认命名空间获取。
   * 无法获取同名数据
   * @param name OFD元素名称
   * @return OFD元素或null
   */
  getJSONElement(elements: Element[]) {
    if (elements) {
      const result = {};
      const flatResult: { [k: string]: string } = {};
      recursion(elements, result, flatResult);

      Object.entries(flatResult).forEach(([keys, val]) => {
        if (keys) {
          flatResult[keys.replace(NameREG, '')] = val;
          delete flatResult[keys];
        }
      });
      return flatResult;
    }

    return null;
  }

  /**
   * 获取OFD元素中的文本
   *
   * @param elements 元素节点
   * @return 文本
   */
  getOFDElementText(
    elements: Element[] | null,
    fileName?: string
    // name?: string
  ) {
    if (!elements && !fileName) {
      throw new VaildOFDError(9999, 'fileName is required');
    }
    let result: { [k: string]: unknown } = {};
    const diffElements =
      elements || OFDElement.OFDElements[fileName || ''].elements;
    if (diffElements?.length) {
      diffElements.forEach((item: Element) => {
        if (item) {
          const { attributes, elements, name } = item;
          if (name) {
            const simpleName = name.replace(NameREG, '');
            if (attributes && attributes.Value) {
              result[simpleName] = attributes.Value;
            }
            Object.assign(result, attributes);
            if (elements && elements[0].type === 'text') {
              result[simpleName] = elements[0].text;
            }
          }
        }
      });
    }
    return result;
  }

  getPageAction() {}

  getPageRes() {}

  /**
   * 获取TextObject、ImageObject、PathObject
   */
  getLayerObject(elements: Element[]) {
    const result: { [k: string]: unknown } = {};
    elements.forEach(item => {
      if (item) {
        const { name, attributes, elements } = item;
        if (name) {
          const simpleName = name.replace(NameREG, '');
          if (attributes) {
            result[simpleName] = { ...attributes };
          }
          if (elements) {
            // 深度递归 elements
            if (elements.length === 1 && elements[0].type) {
              const typeKeys = elements[0].type as string;
              // xml 文件cdata渲染
              if (
                // @ts-ignore
                elements[0][typeKeys] &&
                // @ts-ignore
                typeof elements[0][typeKeys] === 'string'
              ) {
                result[simpleName] = {
                  ...attributes,
                  // @ts-ignore
                  text: elements[0][typeKeys]
                };
              }
            } else {
              result[simpleName] = Object.assign(
                {},
                result[simpleName],
                this.getOFDElementText(elements)
              );
            }
          }
        }
      }
    });
    return result;
  }

  /**
   * 获取layer节点信息
   * @param elements
   * @returns
   */
  getPageBlock(
    elements: Element[]
  ): LayerPageBlock[] & { [k: string]: unknown }[] {
    let result: LayerPageBlock[] & { [k: string]: unknown }[] = [];
    if (elements && elements.length) {
      elements.forEach(item => {
        if (item) {
          const { name, elements, attributes } = item;
          if (name) {
            const simpleName = name.replace(NameREG, '');
            if (
              simpleName === 'PathObject' ||
              simpleName === 'TextObject' ||
              simpleName === 'ImageObject' ||
              simpleName === 'CompositeObject'
            ) {
              const info: LayerPageBlock & { [k: string]: any } = {
                Type: simpleName
              };
              if (simpleName === 'TextObject') {
                Object.assign(info, {
                  Weight: '400',
                  Fill: 'true',
                  HScale: '1.0',
                  ReadDirection: '0',
                  CharDirection: '0',
                  Italic: 'fasle',
                  Stroke: 'false'
                });
              }
              if (simpleName === 'PathObject') {
                Object.assign(info, {
                  Fill: 'false',
                  Rule: 'NonZero',
                  Stroke: 'true'
                });
              }
              Object.assign(info, attributes);
              if (elements) {
                Object.assign(info, this.getLayerObject(elements));
              }
              result.push(info);
            }
            // PageBlock 需要递归
            if (simpleName === 'PageBlock' && elements) {
              // @ts-ignore
              result = result.concat(this.getPageBlock(elements));
            }
          }
        }
      });
    }

    return result;
  }

  /**
   * 获取Content下Layer,多个Layer 合并进入数组
   * @param elements
   * @returns [{Type:'ImageObject'|'TextObject'|'PathObject',ID:'',Boundary:'', }]
   */
  getPageContent(elements: Element[]): CT_Layer[] {
    const result: CT_Layer[] = [];
    if (elements && elements.length) {
      elements.forEach(item => {
        const info: CT_Layer & { [k: string]: any } = {};
        if (item) {
          const { name, elements, attributes } = item;
          if (name === this.OFDCommonQName('Layer') && elements) {
            if (attributes) {
              const {
                ID,
                Type = 'Body',
                DrawParam
              } = attributes as {
                Type?: LayerType;
                ID: string;
                DrawParam?: string;
              };
              info.ID = ID;
              info.Type = Type;
              info.DrawParam = DrawParam;
            }
            info.PageBlock = this.getPageBlock(elements);
            result.push(info);
          }
        }
      });
    }
    return result;
  }

  /**
   * 获取ofd:Page Elemnet数据
   * @param pageElement ofd:Page节点
   * @param type 类型 page|template type=template：不返回 Template
   * @return
   * ```{Area: CT_PageArea;Content: PageLayer[];Template?: Template;}```
   */
  getPageAttr(pageElement: Element, type = 'page') {
    const result: Page & { [k: string]: any } = {
      Area: {
        PhysicalBox: ''
      },
      Content: null,
      PageID: ''
    };
    if (pageElement?.elements) {
      pageElement.elements.forEach(item => {
        if (item) {
          const { name = '', attributes, elements } = item;
          // 忽略template属性 详见 ./Pages/PAGE.md
          if (type === 'template' && name === this.OFDCommonQName('Template')) {
            return false;
          }
          result[name] = {};
          const info: { [k: string]: any } = {};
          if (attributes) {
            Object.assign(info, attributes);
          }
          result[name.replace(NameREG, '')] = { ...info };
          // 获取 Area内属性
          if (name === this.OFDCommonQName('Area') && elements) {
            result.Area = { PhysicalBox: '', ...this.getJSONElement(elements) };
          }
          // 获取 Area内属性
          if (name === this.OFDCommonQName('Content') && elements) {
            result.Content = this.getPageContent(elements);
          }
        }
      });
    }
    return result;
  }

  setTpls(tplElement: Element, tplId: string) {
    if (tplElement && tplElement.elements?.length) {
      tplElement.elements.forEach(item => {
        if (item) {
          if (!OFDElement.Tpls) {
            OFDElement.Tpls = {};
          }
          OFDElement.Tpls[tplId] = [];
          OFDElement.Tpls[tplId].push(this.getPageAttr(item));
        }
      });
    }
  }

  /**
   * @desc 设置Pages
   * @param pageElements
   */
  setPages(pageElement: Element & { PageID: string }) {
    if (pageElement && pageElement.elements?.length) {
      pageElement.elements.forEach(item => {
        if (item) {
          if (!OFDElement.Pages) {
            OFDElement.Pages = [];
          }
          OFDElement.Pages.push({
            ...this.getPageAttr(item),
            PageID: pageElement.PageID
          });
        }
      });
    }
  }

  /**
   * 设置资源内容
   * @param documnetResXml
   */
  setRes(resElement: Element[], rootPath: string) {
    // console.log('resElement:', resElement);
    if (resElement) {
      //
      resElement.forEach(item => {
        if (item?.name) {
          const { name, attributes, elements } = item;
          // 资源文件限制死五种类型（国标时间2022-08-01）
          const simpleName = name.replace(NameREG, '');
          if (
            simpleName !== 'MediaFile' &&
            simpleName !== 'Font' &&
            simpleName !== 'DrawParam' &&
            simpleName !== 'CompositeGraphicUnit' &&
            simpleName !== 'ColorSpace' &&
            simpleName !== 'MultiMedia'
          ) {
            if (elements?.length) {
              this.setRes(elements, rootPath);
            }
          } else {
            if (attributes && attributes.ID) {
              const result: Res = {
                ...attributes,
                OFDType: simpleName,
                ID: String(attributes.ID)
              };
              if (elements?.length) {
                // (MediaFile文件)图片  直接获取 ofd:MediaFile节点text
                if (simpleName === 'MultiMedia') {
                  if (elements[0]?.name === this.OFDCommonQName('MediaFile')) {
                    result.Path =
                      rootPath +
                      '/' +
                      String(elements[0].elements?.[0]?.text || '');
                  }
                }
                // ColorSpace
                if (simpleName === 'ColorSpace') {
                  if (elements[0].name === this.OFDCommonQName('Palette')) {
                    const PaletteElem = elements[0].elements || [];
                    // @ts-ignore
                    result.Palette = {
                      ...elements[0].attributes,
                      CV: PaletteElem[0].elements?.[0]?.text
                    };
                  }
                }
                // Font
                if (simpleName === 'Font') {
                  // 字体文件，保留字体文件路径，使用opentype.js加载字体文件
                  if (elements[0].name === 'ofd:FontFile') {
                    result.Path =
                      rootPath +
                      '/' +
                      String(elements[0].elements?.[0]?.text || '');
                  }
                }
                // DrawParam
                if (simpleName === 'DrawParam') {
                  // 设置 DrawParam默认值, 详见
                  Object.assign(
                    {
                      Join: 'Miter',
                      LineWidth: ' 0.353',
                      Cap: 'Butt',
                      Relative: null,
                      DashOffset: 0,
                      DashPattern: null,
                      MiterLimit: '3.528'
                    },
                    result
                  );
                  // 按节点解析DrawParam->Element
                  if (elements?.length) {
                    Object.assign(result, this.getLayerObject(elements));
                  }
                }
                result.Elements = elements.map(cItem => ({ ...cItem }));
              }
              if (!OFDElement.Res) {
                OFDElement.Res = [];
              }
              OFDElement.Res.push(result);
            } else {
              // 资源未设置ID，不渲染资源
              console.error(item, `解析资源文件失败，未找到资源ID`);
              // throw new VaildOFDError(9999, '解析资源文件失败，未找到资源ID');
            }
          }
        }
      });
    }
  }
}

export default OFDElement;
