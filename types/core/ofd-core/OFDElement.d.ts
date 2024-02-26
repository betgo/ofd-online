import { Element } from 'xml-js';
import { Page, CT_Layer, CT_PageArea, Res, LayerPageBlock, Signatures } from './index.d';
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
export declare class OFDElement {
    /**
     * OFD文件xml合集
     * @date 2022/7/22 - 14:30:53
     *
     * @type {Element}
     */
    static OFDElements: {
        [key: string]: Element;
    };
    /**
     * OFDxml转换成json
     * @date 7/25/2022 - 7:42:51 PM
     *
     * @type {(null | { [key: string]: any })}
     */
    static OFDElemetJSON: null | {
        [key: string]: any;
    };
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
    static Tpls: null | {
        [k: string]: Page[];
    };
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
    static PageSignatures: null | {
        [key: string]: Signatures[];
    };
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
    static OFDElemetFlatJSON: null | {
        [key: string]: any;
    };
    /**
     * 根目录地址 以"/"结尾
     * @date 2022/7/27 - 16:00:31
     *
     * @static
     * @type {string}
     */
    static STLoc: string;
    constructor(ofdXML?: {
        [key: string]: Element;
    });
    /**
     * @desc 初始化
     */
    static init(): void;
    /**
     * @desc 设置文档根目录名称
     */
    setST_Loc(str: string): void;
    /**
     *
     * @param name 节点名称
     * @returns ofd:xxx
     */
    OFDCommonQName(name: string): string;
    /**
     * 获取指定文件xml
     * @param name
     * @param fileName
     * @returns
     */
    getElements(name: string, fileName: string): string;
    /**
     * 格式化xml文件
     * @param ofdXml
     */
    XmlChangeJson(xmlKey: string): void;
    /**
     * 获取OFD的元素
     * <p>
     * 若无法在OFD命名空间下获取同名元素，则尝试从默认命名空间获取。
     *
     * @param name OFD元素名称
     * @return OFD元素或null
     */
    getOFDElements(fileName: string, name: string): Element | null;
    /**
     * 获取OFD的元素
     * <p>
     * 若无法在OFD命名空间下获取同名元素，则尝试从默认命名空间获取。
     * 无法获取同名数据
     * @param name OFD元素名称
     * @return OFD元素或null
     */
    getJSONElement(elements: Element[]): {
        [k: string]: string;
    } | null;
    /**
     * 获取OFD元素中的文本
     *
     * @param elements 元素节点
     * @return 文本
     */
    getOFDElementText(elements: Element[] | null, fileName?: string): {
        [k: string]: unknown;
    };
    getPageAction(): void;
    getPageRes(): void;
    /**
     * 获取TextObject、ImageObject、PathObject
     */
    getLayerObject(elements: Element[]): {
        [k: string]: unknown;
    };
    /**
     * 获取layer节点信息
     * @param elements
     * @returns
     */
    getPageBlock(elements: Element[]): LayerPageBlock[] & {
        [k: string]: unknown;
    }[];
    /**
     * 获取Content下Layer,多个Layer 合并进入数组
     * @param elements
     * @returns [{Type:'ImageObject'|'TextObject'|'PathObject',ID:'',Boundary:'', }]
     */
    getPageContent(elements: Element[]): CT_Layer[];
    /**
     * 获取ofd:Page Elemnet数据
     * @param pageElement ofd:Page节点
     * @param type 类型 page|template type=template：不返回 Template
     * @return
     * ```{Area: CT_PageArea;Content: PageLayer[];Template?: Template;}```
     */
    getPageAttr(pageElement: Element, type?: string): Page & {
        [k: string]: any;
    };
    setTpls(tplElement: Element, tplId: string): void;
    /**
     * @desc 设置Pages
     * @param pageElements
     */
    setPages(pageElement: Element & {
        PageID: string;
    }): void;
    /**
     * 设置资源内容
     * @param documnetResXml
     */
    setRes(resElement: Element[], rootPath: string): void;
}
export default OFDElement;
