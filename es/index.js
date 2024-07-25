import { xml2js } from 'xml-js';
import JSZip from 'jszip';

const ERROR_TYPE_FETCH = 'fetch';
const ERROR_TYPE_MAGIC = 'MAGIC';
const FILE_TYPE_XML = 'xml';
const FILE_TYPE_OFD = 'ofd';

const errorMsg = {
    '400': '参数传递错误',
    '403': '类型不支持',
    '404': '文件不存在',
    '500': '文件解析错误',
    '9999': '未知错误'
};

class ErrorHandle extends Error {
    code;
    type;
    constructor(code, type) {
        super();
        this.code = code;
        this.type = type;
        this.message = errorMsg[code];
    }
}

class VaildXmlError extends ErrorHandle {
    constructor(code, msg) {
        super(code, FILE_TYPE_XML);
        if (msg) {
            this.message = msg;
        }
    }
}

class VaildFetchError extends ErrorHandle {
    constructor(code) {
        super(code, ERROR_TYPE_FETCH);
    }
}

var fetchs = async (url, data, options) => {
    try {
        const { method = 'GET', mode = 'cors', cache = 'no-cache', credentials = 'same-origin', headers, body, ...restOpts } = options || {};
        const fetchOptions = {
            method,
            mode,
            cache,
            credentials
        };
        if (method === 'POST') {
            fetchOptions.headers = { 'Content-type': 'application/json;' };
            fetchOptions.body = JSON.stringify(data);
        }
        Object.assign(fetchOptions, { ...restOpts });
        const response = await window.fetch(url, {
            ...fetchOptions
        });
        if (!response.ok) {
            throw new Error('Network response was not OK');
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        if (response && contentType) {
            if (contentType.includes('application/xml')) {
                return response.text();
            }
            return response.arrayBuffer();
        }
    }
    catch (err) {
        return new VaildFetchError(500);
    }
    return new VaildFetchError(9999);
};

class VaildMimeError extends ErrorHandle {
    constructor(code) {
        super(code, ERROR_TYPE_MAGIC);
    }
}

const readBuffer = (file, start = 0, end = 4) => new Promise((resolve, reject) => {
    try {
        const readFile = new FileReader();
        readFile.onload = () => {
            if (readFile.result && readFile.result instanceof ArrayBuffer) {
                resolve(readFile.result);
            }
        };
        readFile.onerror = reject;
        readFile.readAsArrayBuffer(file.slice(start, end));
    }
    catch (err) {
        reject(new VaildMimeError(500));
    }
});

const mimeTypes = {
    '504B0304': 'zip',
    '504B0506': 'zip',
    '504B0708': 'zip',
    '52617221': 'rar',
    '89504E47': 'png',
    '25504446': 'pdf',
    '4F676753': 'ogg',
    '75737461': 'tar',
    D0CF11E0: 'msOffice',
    FFD8FFDB: 'jpg',
    FFD8FFE0: 'jpg',
    FFD8FFEE: 'jpeg',
    FFD8FFE1: 'jpeg',
    '47494638': 'gif',
    '52494646': 'wegp',
    '424D663B': 'bmp',
    '3C3F786D': 'xml',
    '3C786272': 'xml',
    '32303232': 'xml'
};
const msOfficeType = {
    'application/msword': 'doc',
    'pplication/vnd.ms-excel': 'xls',
    'pplication/vnd.mspowerpoint': 'ppt',
    'pplication/vnd.ms-outlook': 'msg'
};
const zipsFileType = {
    'application/ofd': 'ofd',
    'application/vnd.ofd': 'ofd',
    'application/docx': 'docx',
    'application/xlsx': 'xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip'
};
/**
 * 使用arrayBuffer获取文件Magic，转换为文件类型
 * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 * @link https://datatracker.ietf.org/doc/html/rfc6838
 * @date 2022/7/5 - 09:48:27
 */
const getFileType = async (file) => {
    try {
        if (!file || !(file instanceof File)) {
            throw new VaildMimeError(404);
        }
        const bufferData = await readBuffer(file);
        // uint8Array 转16进制
        const hex16Array = Array.prototype.map.call(new Uint8Array(bufferData), x => ('00' + x.toString(16)).slice(-2));
        const hex16String = hex16Array.join('').toLocaleUpperCase();
        const mimeType = mimeTypes[hex16String];
        let { type: fileType } = file;
        if (!fileType && !mimeType) {
            return '';
        }
        // 同时存在 fileType 以及 mimeType 优先使用mimeType，zip mimeType需要判断，fileType是否是zip类型文件比如：PDF
        if (fileType && mimeType) {
            if (mimeType === 'zip') {
                return zipsFileType[fileType] || fileType.replace(/application\//, '');
            }
            if (mimeType === 'msOffice') {
                return msOfficeType[fileType] || fileType.replace(/application\//, '');
            }
            return mimeType;
        }
        if (!fileType) {
            // 不存在type,截取文件名后缀
            return mimeType;
        }
        if (!mimeType) {
            return fileType;
        }
    }
    catch (err) {
        console.error(err, 'getFileType error');
    }
    return '';
};

/**
 * @description 判断是否为DOM节点
 */
var isElement = (n) => {
    if (!n) {
        console.error('n is not Element');
        return false;
    }
    if (n.nodeType === 1) {
        return true;
    }
    return false;
};

const REGX_HTML_DECODE = /&\w+;|&#(\d+);/g;
const HTML_DECODE = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&nbsp;': ' ',
    '&quot;': '"',
    '&copy;': '',
    '&apos;': "'"
    // Add more
};
/**
 * html标签语义转string
 * @param str
 * @returns
 */
const decodeHtml = function (str) {
    const htmlStr = str !== undefined ? str : String(str);
    return typeof htmlStr != 'string'
        ? htmlStr
        : htmlStr.replace(REGX_HTML_DECODE, function ($0, $1) {
            var c = HTML_DECODE[$0];
            if (c == undefined) {
                // Maybe is Entity Number
                if (!isNaN($1)) {
                    c = String.fromCharCode($1 == 160 ? 32 : $1);
                }
                else {
                    c = $0;
                }
            }
            return c;
        });
};

const TYPE_ELEMENT = 'element';
const TYPE_TEXT = 'text';
const TYPE_CDATA = 'cdata';
const closeSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="#909090" width="10" height="10"><path d="M0 0 L0 8 L7 4 Z"/></svg>`;
const openSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="#909090" width="10" height="10"><path d="M0 0 L8 0 L4 7 Z"/></svg>`;
const attrTemplate = attributes => {
    let attr = '';
    if (attributes) {
        Object.entries(attributes).forEach(([keys, val]) => {
            attr += `&nbsp;<span style="color:rgb(153, 69, 0)"><span>${keys}</span>="<span style="color:rgb(26, 26, 166)">${val}</span>"</span>`;
        });
    }
    return attr;
};
const tagTemplate = (name, attributes, elements) => {
    let htmlTag = '';
    if (elements) {
        htmlTag += `<span class="folder-button" style="position:absolute;left:-10px;top:3px;user-select: none;cursor: pointer;width: 10px;height: 10px;">${openSvg}</span>`;
    }
    htmlTag += `<span class="html-tag" style="color:rgb(136, 18, 128);">&lt;${name}${attrTemplate(attributes)}${!elements ? '&nbsp;/' : ''}&gt;</span>`;
    return htmlTag;
};
const findParentNode = (className, currentDom) => {
    const parentNode = currentDom.parentElement;
    if (!parentNode) {
        return null;
    }
    const classes = parentNode.getAttribute('class');
    if (classes !== className) {
        return findParentNode(className, parentNode);
    }
    return parentNode;
};
const elementRender = (elements, dom) => {
    if (!elements || !elements.length) {
        return false;
    }
    elements.forEach(item => {
        const { name, attributes, elements, type } = item;
        if (type === TYPE_ELEMENT && name) {
            const divLine = document.createElement('div');
            const divOpen = document.createElement('div');
            const htmlTmp = tagTemplate(name, attributes, elements);
            divLine.setAttribute('class', 'f-line');
            divLine.setAttribute('style', 'position:relative;cursor: pointer;user-select: none;margin-left: 1em;font-family: monospace;font-size: 13px;');
            divLine.innerHTML = htmlTmp;
            divOpen.setAttribute('style', 'margin-left: 1em;');
            divOpen.setAttribute('class', 'opened');
            dom.appendChild(divLine);
            dom.appendChild(divOpen);
            if (elements && elements.length) {
                divLine.addEventListener('click', function (e) {
                    const currentDom = e.target;
                    const className = currentDom?.getAttribute('class');
                    let openDom = null;
                    if (className !== 'f-line') {
                        openDom = findParentNode('f-line', currentDom);
                    }
                    else {
                        openDom = currentDom;
                    }
                    const closeDom = openDom?.nextSibling;
                    if (!closeDom) {
                        console.error(closeDom);
                        return;
                    }
                    // 向上查找父节点
                    let styles = closeDom.getAttribute('style');
                    if (styles && openDom) {
                        const btnDom = openDom.querySelector('.folder-button');
                        if (btnDom) {
                            if (styles.indexOf('display') > -1) {
                                styles = styles.replace(/display:.*none;/, '');
                                btnDom.innerHTML = openSvg;
                            }
                            else {
                                btnDom.innerHTML = closeSvg;
                                styles += 'display:none;';
                            }
                        }
                    }
                    closeDom.setAttribute('style', styles);
                });
                const divCloseTag = document.createElement('div');
                divCloseTag.setAttribute('style', 'margin-left: 1em;');
                divCloseTag.innerHTML = `<span class="html-tag" style="color:rgb(136, 18, 128);font-family: monospace;font-size: 13px;">&lt;/${name}&gt;</span>`;
                dom.appendChild(divCloseTag);
                elementRender(elements, divOpen);
            }
        }
        if (type === TYPE_TEXT) {
            textRender(item, dom);
        }
        else if (type === TYPE_CDATA) {
            cdataRender(item, dom);
        }
        else {
            if (type) {
                // @ts-ignore
                const elemHtml = item[type];
                if (elemHtml !== undefined && typeof elemHtml === 'string') {
                    const divLine = document.createElement('div');
                    divLine.setAttribute('style', 'margin-left: 1em;');
                    divLine.innerHTML = `<span>${decodeHtml(String(elemHtml || ''))}<span>`;
                    dom.appendChild(divLine);
                }
            }
        }
    });
    return true;
};
const textRender = (info, dom) => {
    const { text } = info;
    const divLine = document.createElement('div');
    divLine.setAttribute('style', 'margin-left: 1em;');
    divLine.innerHTML = `<span>${decodeHtml(String(text || ''))}<span>`;
    dom.appendChild(divLine);
};
const cdataRender = (info, dom) => {
    const { cdata } = info;
    const divLine = document.createElement('div');
    divLine.setAttribute('style', 'margin-left: 1em;');
    divLine.innerHTML = `<span>&lt;![CDATA[ ${decodeHtml(String(cdata || ''))} ]]&gt;<span>`;
    dom.appendChild(divLine);
};
const render = xmlParse => {
    const div = document.createElement('div');
    div.setAttribute('class', 'm-xml-pre');
    div.setAttribute('style', 'text-align:left;font-size:12px');
    elementRender(xmlParse.elements, div);
    return div;
};

const xmlOptions$1 = { compact: false, spaces: 4 };
const xmlParse = ({ file, requestData, requestOptions, responseFilter }) => {
    return new Promise((resolve, reject) => {
        //
        if (typeof file === 'string') {
            if (file.indexOf('<') > -1 &&
                file.indexOf('>') > -1 &&
                /<[^>]+>/g.test(file)) {
                // xml需要使用string格式化
                const xmlJSON = xml2js(file, xmlOptions$1);
                if (xmlJSON) {
                    resolve({
                        code: 200,
                        data: xmlJSON
                    });
                    return { code: 200, data: xmlJSON };
                }
            }
            else {
                fetchs(file, { ...requestData }, { ...requestOptions }).then(res => {
                    let xmlStr = '';
                    if (res) {
                        if (responseFilter) {
                            xmlStr = responseFilter(res);
                        }
                        else if (typeof res === 'string') {
                            xmlStr = res;
                        }
                    }
                    if (xmlStr) {
                        // xml需要使用string格式化
                        const xmlJSON = xml2js(xmlStr, xmlOptions$1);
                        if (xmlJSON) {
                            resolve({
                                code: 200,
                                data: xmlJSON
                            });
                        }
                    }
                    else {
                        reject(new VaildXmlError(404));
                    }
                });
            }
        }
        if (file instanceof File) {
            // 优先获取魔数判断文件类型
            getFileType(file).then(fileType => {
                if (fileType === 'xml') {
                    const fileReader = new FileReader();
                    fileReader.onload = () => {
                        if (fileReader.result && typeof fileReader.result === 'string') {
                            const xmlJSON = xml2js(fileReader.result, xmlOptions$1);
                            if (xmlJSON) {
                                resolve({
                                    code: 200,
                                    data: xmlJSON
                                });
                            }
                        }
                    };
                    fileReader.readAsText(file);
                }
            });
        }
        if (file instanceof ArrayBuffer) {
            reject(new VaildXmlError(403, 'file 参数只能为string或者File，不允许使用ArrayBuffer'));
        }
    });
};
var xml = ({ file, content, id, ...restOptions }) => new Promise((resolve, reject) => {
    if (!file) {
        reject(new VaildXmlError(400));
        return;
    }
    xmlParse({ file, ...restOptions })
        .then(res => {
        if (res && res.code === 200) {
            let container = content;
            if (id) {
                container = document.querySelector(`#${id}`);
            }
            if (container) {
                if (isElement(container)) {
                    // 清空 container 防止xml重复渲染
                    container.innerHTML = '';
                    const pres = render(res.data);
                    container.appendChild(pres);
                    if (restOptions.success) {
                        restOptions.success(pres);
                    }
                    resolve(pres);
                    return;
                }
            }
            if (restOptions.fail) {
                restOptions.fail(new VaildXmlError(403, 'content is not Element 或者 id 为空'));
            }
            reject(new VaildXmlError(403, 'content is not Element 或者 id 为空'));
        }
    })
        .catch(reject);
});

class VaildOFDError extends ErrorHandle {
    constructor(code, msg) {
        super(code, FILE_TYPE_OFD);
        if (msg) {
            this.message = msg;
        }
    }
}

/**
 * 命名空间 URI,《GB/T_33190-2016》 7.1 命名空间
 */
/**
 * OFD命名空间
 */
const OFD_Q = 'ofd:';

function recursion(elements, result, flatResult) {
    if (elements && elements.length) {
        elements.forEach(item => {
            const { type, name, elements } = item;
            if (name) {
                // 获取子集是否是text
                result[name] = null;
                flatResult[name] = null;
                if (type === 'element') {
                    if (elements &&
                        elements.length === 1 &&
                        elements[0].type === 'text') {
                        result[name] = elements[0].text;
                        flatResult[name] = elements[0].text;
                    }
                    // 递归
                    if (elements && elements.length && elements[0].type !== 'text') {
                        result[name] = {};
                        recursion(elements, result[name], flatResult);
                    }
                    if (!elements && item.attributes) {
                        result[name] = { ...item.attributes };
                        flatResult[name] = { ...item.attributes };
                    }
                }
            }
        });
    }
}
function recursionGet(elements, qName) {
    if (elements && elements.length) {
        for (let i = 0; i < elements.length; i++) {
            const item = elements[i];
            const { name, elements: cElements, type } = item;
            if (qName === name) {
                return { ...item };
            }
            if (type === 'element' && cElements?.length) {
                const result = recursionGet(cElements, qName);
                if (result) {
                    return result;
                }
            }
            continue;
        }
    }
    return null;
}
const NameREG = new RegExp(OFD_Q);

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
class OFDElement {
    /**
     * OFD文件xml合集
     * @date 2022/7/22 - 14:30:53
     *
     * @type {Element}
     */
    static OFDElements;
    /**
     * OFDxml转换成json
     * @date 7/25/2022 - 7:42:51 PM
     *
     * @type {(null | { [key: string]: any })}
     */
    static OFDElemetJSON;
    /**
     * OFD文档区域坐标
     * @date 2022/8/1 - 19:01:44
     *
     * @static
     * @type {(null | CT_PageArea)}
     */
    static PageArea;
    /**
     * ofd page数组
     * @date 2022/7/26 - 17:17:13
     *
     * @type {(null | Page)}
     */
    static Pages;
    /**
     * ofd Tpls 对象
     * @date 2022/7/26 - 17:17:13
     *
     * @type {(null | Tpls)}
     */
    static Tpls;
    /**
     * DocumnetRes.xml、PublicRes.xml 解析合并生成数组
     * @date 2022/8/1 - 13:24:15
     *
     * @static
     * @type {(null|Res[])}
     */
    static Res;
    /**
     * 签章信息
     * @date 2022/8/19 - 10:27:27
     *
     * @static
     * @type {(null | Signatures[])}
     */
    static Signatures;
    static PageSignatures;
    /**
     * documnetRes资源文件路径
     * @date 2022/8/1 - 15:18:10
     *
     * @static
     * @type {string}
     */
    static DocumnetResRoot;
    /**
     * PublicRes资源文件路径
     * @date 2022/8/1 - 15:18:10
     *
     * @static
     * @type {string}
     */
    static PublicResRoot;
    /**
     * AnnotationsRoot 文件路径
     * @date 2023/8/7 - 14:23:52
     *
     * @static
     * @type {string}
     */
    static AnnotationsRoot;
    /**
     * OFDxml转换成json 平级
     * @date 7/25/2022 - 7:42:51 PM
     *
     * @type {(null | { [key: string]: any })}
     */
    static OFDElemetFlatJSON;
    /**
     * 根目录地址 以"/"结尾
     * @date 2022/7/27 - 16:00:31
     *
     * @static
     * @type {string}
     */
    static STLoc;
    constructor(ofdXML) {
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
    setST_Loc(str) {
        const ST = str.substring(0, str.indexOf('/'));
        OFDElement.STLoc = ST + '/';
    }
    /**
     *
     * @param name 节点名称
     * @returns ofd:xxx
     */
    OFDCommonQName(name) {
        return `${OFD_Q}${name}`;
    }
    /**
     * 获取指定文件xml
     * @param name
     * @param fileName
     * @returns
     */
    getElements(name, fileName) {
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
    XmlChangeJson(xmlKey) {
        const ofdXml = OFDElement.OFDElements[xmlKey];
        if (ofdXml && ofdXml.elements && ofdXml.elements.length) {
            const result = {};
            const flatResult = {};
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
    getOFDElements(fileName, name) {
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
    getJSONElement(elements) {
        if (elements) {
            const result = {};
            const flatResult = {};
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
    getOFDElementText(elements, fileName
    // name?: string
    ) {
        if (!elements && !fileName) {
            throw new VaildOFDError(9999, 'fileName is required');
        }
        let result = {};
        const diffElements = elements || OFDElement.OFDElements[fileName || ''].elements;
        if (diffElements?.length) {
            diffElements.forEach((item) => {
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
    getPageAction() { }
    getPageRes() { }
    /**
     * 获取TextObject、ImageObject、PathObject
     */
    getLayerObject(elements) {
        const result = {};
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
                            const typeKeys = elements[0].type;
                            // xml 文件cdata渲染
                            if (
                            // @ts-ignore
                            elements[0][typeKeys] &&
                                // @ts-ignore
                                typeof elements[0][typeKeys] === 'string') {
                                result[simpleName] = {
                                    ...attributes,
                                    // @ts-ignore
                                    text: elements[0][typeKeys]
                                };
                            }
                        }
                        else {
                            result[simpleName] = Object.assign({}, result[simpleName], this.getOFDElementText(elements));
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
    getPageBlock(elements) {
        let result = [];
        if (elements && elements.length) {
            elements.forEach(item => {
                if (item) {
                    const { name, elements, attributes } = item;
                    if (name) {
                        const simpleName = name.replace(NameREG, '');
                        if (simpleName === 'PathObject' ||
                            simpleName === 'TextObject' ||
                            simpleName === 'ImageObject' ||
                            simpleName === 'CompositeObject') {
                            const info = {
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
    getPageContent(elements) {
        const result = [];
        if (elements && elements.length) {
            elements.forEach(item => {
                const info = {};
                if (item) {
                    const { name, elements, attributes } = item;
                    if (name === this.OFDCommonQName('Layer') && elements) {
                        if (attributes) {
                            const { ID, Type = 'Body', DrawParam } = attributes;
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
    getPageAttr(pageElement, type = 'page') {
        const result = {
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
                    const info = {};
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
    setTpls(tplElement, tplId) {
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
    setPages(pageElement) {
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
    setRes(resElement, rootPath) {
        // console.log('resElement:', resElement);
        if (resElement) {
            //
            resElement.forEach(item => {
                if (item?.name) {
                    const { name, attributes, elements } = item;
                    // 资源文件限制死五种类型（国标时间2022-08-01）
                    const simpleName = name.replace(NameREG, '');
                    if (simpleName !== 'MediaFile' &&
                        simpleName !== 'Font' &&
                        simpleName !== 'DrawParam' &&
                        simpleName !== 'CompositeGraphicUnit' &&
                        simpleName !== 'ColorSpace' &&
                        simpleName !== 'MultiMedia') {
                        if (elements?.length) {
                            this.setRes(elements, rootPath);
                        }
                    }
                    else {
                        if (attributes && attributes.ID) {
                            const result = {
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
                                    Object.assign({
                                        Join: 'Miter',
                                        LineWidth: ' 0.353',
                                        Cap: 'Butt',
                                        Relative: null,
                                        DashOffset: 0,
                                        DashPattern: null,
                                        MiterLimit: '3.528'
                                    }, result);
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
                        }
                        else {
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

// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';
class PagesXml extends OFDElement {
    /**
     * Pages xml文件，以数组存放，存在多页
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    pagesXml;
    static fileName;
    constructor(pagesElements) {
        super();
        this.setPagesXml(pagesElements);
        this.pagesXml = [];
        // this.getPages();
    }
    formatPageXml(pagesFile) {
        pagesFile.forEach(item => {
            this.setPages(item);
        });
    }
    setPagesXml(pageElements) {
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
}

// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';
class AnnotationsXml extends OFDElement {
    /**
     * PublicRes.xml文件
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    static fileName;
    constructor(documnetResElements) {
        super();
        this.setAnnotationsXml(documnetResElements);
    }
    formatAnnotationXml(annotFile, annot) {
        if (annotFile?.elements && annotFile.elements[0]) {
            annotFile.elements[0].elements?.forEach(item => {
                const { attributes, elements } = item;
                Object.assign(annot, { ...attributes });
                if (elements?.length) {
                    const appearanceInfo = elements.find(cItem => cItem.name === this.OFDCommonQName('Appearance'));
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
    setRootPath(annotationsXml, relativePath) {
        if (annotationsXml?.elements) {
            annotationsXml.elements.forEach(item => {
                if (item?.name) {
                    const { name, elements } = item;
                    const priexPath = relativePath.substring(0, relativePath.lastIndexOf('/') + 1);
                    if (name === this.OFDCommonQName('Annotations')) {
                        // 设置资源路径
                        if (elements?.length) {
                            elements.forEach(cItem => {
                                const { name: cName, attributes: cAttributes, elements: cElements } = cItem;
                                if (cName === this.OFDCommonQName('Page')) {
                                    if (cElements?.length === 1 &&
                                        cElements[0].name === this.OFDCommonQName('FileLoc')) {
                                        const { text: cText } = cElements[0].elements?.[0] || {};
                                        const rootPath = `${OFDElement.STLoc}${priexPath}${cText || ''}`;
                                        OFDElement.AnnotationsRoot = rootPath;
                                        if (cAttributes?.PageID) {
                                            const pageInfo = OFDElement.Pages?.find(pItem => cAttributes.PageID === pItem.PageID);
                                            if (pageInfo) {
                                                // annation写入pages
                                                pageInfo['Annot'] = { FileLoc: cText };
                                                this.formatAnnotationXml(OFDElement.OFDElements[rootPath], pageInfo['Annot']);
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
    setAnnotationsXml(annotationsElements) {
        if (annotationsElements?.length && annotationsElements.length === 1) {
            const annotationsXmlPath = `${OFDElement.STLoc}${annotationsElements[0].text}`;
            this.setRootPath(OFDElement.OFDElements[annotationsXmlPath], annotationsElements[0].text);
        }
        else {
            throw new VaildOFDError(9999, '获取Annotations失败');
        }
    }
}

// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';
class TemplatePages extends OFDElement {
    /**
     * TemplatePages 文件，以数组存放，存在多页
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    tplsXml;
    static fileName;
    constructor(tplsElements) {
        super();
        // 区分多页TemplatePages 暂时没有该类型OFD
        if (tplsElements?.length) {
            this.setTplsXml(tplsElements);
        }
        else {
            throw new VaildOFDError(9999, 'Documents下TemplatePage解析失败');
        }
        this.tplsXml = null;
    }
    formatTplsXml(tplsFile) {
        Object.entries(tplsFile).forEach(([keys, content]) => {
            if (content && content.elements?.length) {
                this.setTpls(content, keys);
            }
        });
    }
    setTplsXml(tplsElements) {
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

// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';
class DocumentResXml extends OFDElement {
    /**
     * DocumentRes xml文件，
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    static fileName;
    constructor(documnetResElements) {
        super();
        this.setDocumnetResXml(documnetResElements);
    }
    setRootPath(documnetResXml) {
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
    setDocumnetResXml(documnetResElements) {
        if (documnetResElements?.length && documnetResElements.length === 1) {
            const documentResXmlPath = `${OFDElement.STLoc}${documnetResElements[0].text}`;
            this.setRootPath(OFDElement.OFDElements[documentResXmlPath]);
        }
        else {
            throw new VaildOFDError(9999, '获取documentRes失败');
        }
    }
}

// import OFDXMl from '../ofd/OFDXml';
// import { OFD_PATH } from '../constant';
class PublicResXml extends OFDElement {
    /**
     * PublicRes.xml文件
     * @date 2022/7/27 - 09:41:22
     *
     * @type {Element[]}
     */
    static fileName;
    constructor(documnetResElements) {
        super();
        this.setPublicResXml(documnetResElements);
    }
    setRootPath(publicResXml) {
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
    setPublicResXml(publicResElements) {
        if (publicResElements?.length && publicResElements.length === 1) {
            const publicResXmlPath = `${OFDElement.STLoc}${publicResElements[0].text}`;
            this.setRootPath(OFDElement.OFDElements[publicResXmlPath]);
        }
        else {
            throw new VaildOFDError(9999, '获取PublicRes失败');
        }
    }
}

class DocumnetXml extends OFDElement {
    static fileName;
    constructor(fileName) {
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
        const CommonDataElements = this.getOFDElements(DocumnetXml.fileName, 'CommonData');
        if (CommonDataElements?.elements?.length) {
            const tplElements = [];
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
                    const simpleName = name.replace(NameREG, '');
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

// Big integer base-10 printing library
// Copyright (c) 2008-2021 Lapo Luchini <lapo@lapo.it>
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
var max = 10000000000000; // biggest 10^n integer that can still fit 2^53 when multiplied by 256
/**
 * Arbitrary length base-10 value.
 * @param {number} value - Optional initial value (will be 0 otherwise).
 */
class Int10 {
    buf;
    constructor(value) {
        this.buf = value ? [+value] : [0];
    }
    /**
     * Multiply value by m and add c.
     * @param {number} m - multiplier, must be < =256
     * @param {number} c - value to add
     */
    mulAdd(m, c) {
        // assert(m <= 256)
        var b = this.buf, l = b.length, i, t;
        for (i = 0; i < l; ++i) {
            t = b[i] * m + c;
            if (t < max)
                c = 0;
            else {
                c = 0 | (t / max);
                t -= c * max;
            }
            b[i] = t;
        }
        if (c > 0)
            b[i] = c;
    }
    /**
     * Subtract value.
     * @param {number} c - value to subtract
     */
    sub(c) {
        var b = this.buf, l = b.length, i, t;
        for (i = 0; i < l; ++i) {
            t = b[i] - c;
            if (t < 0) {
                t += max;
                c = 1;
            }
            else
                c = 0;
            b[i] = t;
        }
        while (b[b.length - 1] === 0)
            b.pop();
    }
    /**
     * Convert to decimal string representation.
     * @param {*} base - optional value, only value accepted is 10
     */
    toString(base) {
        if ((base || 10) != 10)
            throw 'only base 10 is supported';
        var b = this.buf, s = b[b.length - 1].toString();
        for (var i = b.length - 2; i >= 0; --i)
            s += (max + b[i]).toString().substring(1);
        return s;
    }
    /**
     * Convert to Number value representation.
     * Will probably overflow 2^53 and thus become approximate.
     */
    valueOf() {
        var b = this.buf, v = 0;
        for (var i = b.length - 1; i >= 0; --i)
            v = v * max + b[i];
        return v;
    }
    /**
     * Return value as a simple Number (if it is <= 10000000000000), or return this.
     */
    simplify() {
        var b = this.buf;
        return b.length == 1 ? b[0] : this;
    }
}

// Converted from: https://www.cs.auckland.ac.nz/~pgut001/dumpasn1.cfg
// which is made by Peter Gutmann and whose license states:
//   You can use this code in whatever way you want,
//   as long as you don't try to claim you wrote it.
const Oids = {
    '0.2.262.1.10': { d: 'Telesec', c: 'Deutsche Telekom' },
    '0.2.262.1.10.0': { d: 'extension', c: 'Telesec' },
    '0.2.262.1.10.1': { d: 'mechanism', c: 'Telesec' },
    '0.2.262.1.10.1.0': { d: 'authentication', c: 'Telesec mechanism' },
    '0.2.262.1.10.1.0.1': {
        d: 'passwordAuthentication',
        c: 'Telesec authentication'
    },
    '0.2.262.1.10.1.0.2': {
        d: 'protectedPasswordAuthentication',
        c: 'Telesec authentication'
    },
    '0.2.262.1.10.1.0.3': {
        d: 'oneWayX509Authentication',
        c: 'Telesec authentication'
    },
    '0.2.262.1.10.1.0.4': {
        d: 'twoWayX509Authentication',
        c: 'Telesec authentication'
    },
    '0.2.262.1.10.1.0.5': {
        d: 'threeWayX509Authentication',
        c: 'Telesec authentication'
    },
    '0.2.262.1.10.1.0.6': {
        d: 'oneWayISO9798Authentication',
        c: 'Telesec authentication'
    },
    '0.2.262.1.10.1.0.7': {
        d: 'twoWayISO9798Authentication',
        c: 'Telesec authentication'
    },
    '0.2.262.1.10.1.0.8': {
        d: 'telekomAuthentication',
        c: 'Telesec authentication'
    },
    '0.2.262.1.10.1.1': { d: 'signature', c: 'Telesec mechanism' },
    '0.2.262.1.10.1.1.1': { d: 'md4WithRSAAndISO9697', c: 'Telesec mechanism' },
    '0.2.262.1.10.1.1.2': {
        d: 'md4WithRSAAndTelesecSignatureStandard',
        c: 'Telesec mechanism'
    },
    '0.2.262.1.10.1.1.3': { d: 'md5WithRSAAndISO9697', c: 'Telesec mechanism' },
    '0.2.262.1.10.1.1.4': {
        d: 'md5WithRSAAndTelesecSignatureStandard',
        c: 'Telesec mechanism'
    },
    '0.2.262.1.10.1.1.5': {
        d: 'ripemd160WithRSAAndTelekomSignatureStandard',
        c: 'Telesec mechanism'
    },
    '0.2.262.1.10.1.1.9': { d: 'hbciRsaSignature', c: 'Telesec signature' },
    '0.2.262.1.10.1.2': { d: 'encryption', c: 'Telesec mechanism' },
    '0.2.262.1.10.1.2.0': { d: 'none', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.1': { d: 'rsaTelesec', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.2': { d: 'des', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.2.1': { d: 'desECB', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.2.2': { d: 'desCBC', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.2.3': { d: 'desOFB', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.2.4': { d: 'desCFB8', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.2.5': { d: 'desCFB64', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.3': { d: 'des3', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.3.1': { d: 'des3ECB', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.3.2': { d: 'des3CBC', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.3.3': { d: 'des3OFB', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.3.4': { d: 'des3CFB8', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.3.5': { d: 'des3CFB64', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.4': { d: 'magenta', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.5': { d: 'idea', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.5.1': { d: 'ideaECB', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.5.2': { d: 'ideaCBC', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.5.3': { d: 'ideaOFB', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.5.4': { d: 'ideaCFB8', c: 'Telesec encryption' },
    '0.2.262.1.10.1.2.5.5': { d: 'ideaCFB64', c: 'Telesec encryption' },
    '0.2.262.1.10.1.3': { d: 'oneWayFunction', c: 'Telesec mechanism' },
    '0.2.262.1.10.1.3.1': { d: 'md4', c: 'Telesec one-way function' },
    '0.2.262.1.10.1.3.2': { d: 'md5', c: 'Telesec one-way function' },
    '0.2.262.1.10.1.3.3': { d: 'sqModNX509', c: 'Telesec one-way function' },
    '0.2.262.1.10.1.3.4': { d: 'sqModNISO', c: 'Telesec one-way function' },
    '0.2.262.1.10.1.3.5': { d: 'ripemd128', c: 'Telesec one-way function' },
    '0.2.262.1.10.1.3.6': {
        d: 'hashUsingBlockCipher',
        c: 'Telesec one-way function'
    },
    '0.2.262.1.10.1.3.7': { d: 'mac', c: 'Telesec one-way function' },
    '0.2.262.1.10.1.3.8': { d: 'ripemd160', c: 'Telesec one-way function' },
    '0.2.262.1.10.1.4': { d: 'fecFunction', c: 'Telesec mechanism' },
    '0.2.262.1.10.1.4.1': { d: 'reedSolomon', c: 'Telesec mechanism' },
    '0.2.262.1.10.2': { d: 'module', c: 'Telesec' },
    '0.2.262.1.10.2.0': { d: 'algorithms', c: 'Telesec module' },
    '0.2.262.1.10.2.1': { d: 'attributeTypes', c: 'Telesec module' },
    '0.2.262.1.10.2.2': { d: 'certificateTypes', c: 'Telesec module' },
    '0.2.262.1.10.2.3': { d: 'messageTypes', c: 'Telesec module' },
    '0.2.262.1.10.2.4': { d: 'plProtocol', c: 'Telesec module' },
    '0.2.262.1.10.2.5': { d: 'smeAndComponentsOfSme', c: 'Telesec module' },
    '0.2.262.1.10.2.6': { d: 'fec', c: 'Telesec module' },
    '0.2.262.1.10.2.7': { d: 'usefulDefinitions', c: 'Telesec module' },
    '0.2.262.1.10.2.8': { d: 'stefiles', c: 'Telesec module' },
    '0.2.262.1.10.2.9': { d: 'sadmib', c: 'Telesec module' },
    '0.2.262.1.10.2.10': { d: 'electronicOrder', c: 'Telesec module' },
    '0.2.262.1.10.2.11': {
        d: 'telesecTtpAsymmetricApplication',
        c: 'Telesec module'
    },
    '0.2.262.1.10.2.12': { d: 'telesecTtpBasisApplication', c: 'Telesec module' },
    '0.2.262.1.10.2.13': { d: 'telesecTtpMessages', c: 'Telesec module' },
    '0.2.262.1.10.2.14': {
        d: 'telesecTtpTimeStampApplication',
        c: 'Telesec module'
    },
    '0.2.262.1.10.3': { d: 'objectClass', c: 'Telesec' },
    '0.2.262.1.10.3.0': { d: 'telesecOtherName', c: 'Telesec object class' },
    '0.2.262.1.10.3.1': { d: 'directory', c: 'Telesec object class' },
    '0.2.262.1.10.3.2': { d: 'directoryType', c: 'Telesec object class' },
    '0.2.262.1.10.3.3': { d: 'directoryGroup', c: 'Telesec object class' },
    '0.2.262.1.10.3.4': { d: 'directoryUser', c: 'Telesec object class' },
    '0.2.262.1.10.3.5': { d: 'symmetricKeyEntry', c: 'Telesec object class' },
    '0.2.262.1.10.4': { d: 'package', c: 'Telesec' },
    '0.2.262.1.10.5': { d: 'parameter', c: 'Telesec' },
    '0.2.262.1.10.6': { d: 'nameBinding', c: 'Telesec' },
    '0.2.262.1.10.7': { d: 'attribute', c: 'Telesec' },
    '0.2.262.1.10.7.0': {
        d: 'applicationGroupIdentifier',
        c: 'Telesec attribute'
    },
    '0.2.262.1.10.7.1': { d: 'certificateType', c: 'Telesec attribute' },
    '0.2.262.1.10.7.2': { d: 'telesecCertificate', c: 'Telesec attribute' },
    '0.2.262.1.10.7.3': { d: 'certificateNumber', c: 'Telesec attribute' },
    '0.2.262.1.10.7.4': {
        d: 'certificateRevocationList',
        c: 'Telesec attribute'
    },
    '0.2.262.1.10.7.5': { d: 'creationDate', c: 'Telesec attribute' },
    '0.2.262.1.10.7.6': { d: 'issuer', c: 'Telesec attribute' },
    '0.2.262.1.10.7.7': { d: 'namingAuthority', c: 'Telesec attribute' },
    '0.2.262.1.10.7.8': { d: 'publicKeyDirectory', c: 'Telesec attribute' },
    '0.2.262.1.10.7.9': { d: 'securityDomain', c: 'Telesec attribute' },
    '0.2.262.1.10.7.10': { d: 'subject', c: 'Telesec attribute' },
    '0.2.262.1.10.7.11': { d: 'timeOfRevocation', c: 'Telesec attribute' },
    '0.2.262.1.10.7.12': { d: 'userGroupReference', c: 'Telesec attribute' },
    '0.2.262.1.10.7.13': { d: 'validity', c: 'Telesec attribute' },
    '0.2.262.1.10.7.14': { d: 'zert93', c: 'Telesec attribute' },
    '0.2.262.1.10.7.15': { d: 'securityMessEnv', c: 'Telesec attribute' },
    '0.2.262.1.10.7.16': {
        d: 'anonymizedPublicKeyDirectory',
        c: 'Telesec attribute'
    },
    '0.2.262.1.10.7.17': { d: 'telesecGivenName', c: 'Telesec attribute' },
    '0.2.262.1.10.7.18': { d: 'nameAdditions', c: 'Telesec attribute' },
    '0.2.262.1.10.7.19': { d: 'telesecPostalCode', c: 'Telesec attribute' },
    '0.2.262.1.10.7.20': { d: 'nameDistinguisher', c: 'Telesec attribute' },
    '0.2.262.1.10.7.21': { d: 'telesecCertificateList', c: 'Telesec attribute' },
    '0.2.262.1.10.7.22': {
        d: 'teletrustCertificateList',
        c: 'Telesec attribute'
    },
    '0.2.262.1.10.7.23': { d: 'x509CertificateList', c: 'Telesec attribute' },
    '0.2.262.1.10.7.24': { d: 'timeOfIssue', c: 'Telesec attribute' },
    '0.2.262.1.10.7.25': { d: 'physicalCardNumber', c: 'Telesec attribute' },
    '0.2.262.1.10.7.26': { d: 'fileType', c: 'Telesec attribute' },
    '0.2.262.1.10.7.27': { d: 'ctlFileIsArchive', c: 'Telesec attribute' },
    '0.2.262.1.10.7.28': { d: 'emailAddress', c: 'Telesec attribute' },
    '0.2.262.1.10.7.29': { d: 'certificateTemplateList', c: 'Telesec attribute' },
    '0.2.262.1.10.7.30': { d: 'directoryName', c: 'Telesec attribute' },
    '0.2.262.1.10.7.31': { d: 'directoryTypeName', c: 'Telesec attribute' },
    '0.2.262.1.10.7.32': { d: 'directoryGroupName', c: 'Telesec attribute' },
    '0.2.262.1.10.7.33': { d: 'directoryUserName', c: 'Telesec attribute' },
    '0.2.262.1.10.7.34': { d: 'revocationFlag', c: 'Telesec attribute' },
    '0.2.262.1.10.7.35': { d: 'symmetricKeyEntryName', c: 'Telesec attribute' },
    '0.2.262.1.10.7.36': { d: 'glNumber', c: 'Telesec attribute' },
    '0.2.262.1.10.7.37': { d: 'goNumber', c: 'Telesec attribute' },
    '0.2.262.1.10.7.38': { d: 'gKeyData', c: 'Telesec attribute' },
    '0.2.262.1.10.7.39': { d: 'zKeyData', c: 'Telesec attribute' },
    '0.2.262.1.10.7.40': { d: 'ktKeyData', c: 'Telesec attribute' },
    '0.2.262.1.10.7.41': { d: 'ktKeyNumber', c: 'Telesec attribute' },
    '0.2.262.1.10.7.51': { d: 'timeOfRevocationGen', c: 'Telesec attribute' },
    '0.2.262.1.10.7.52': { d: 'liabilityText', c: 'Telesec attribute' },
    '0.2.262.1.10.8': { d: 'attributeGroup', c: 'Telesec' },
    '0.2.262.1.10.9': { d: 'action', c: 'Telesec' },
    '0.2.262.1.10.10': { d: 'notification', c: 'Telesec' },
    '0.2.262.1.10.11': { d: 'snmp-mibs', c: 'Telesec' },
    '0.2.262.1.10.11.1': { d: 'securityApplication', c: 'Telesec SNMP MIBs' },
    '0.2.262.1.10.12': { d: 'certAndCrlExtensionDefinitions', c: 'Telesec' },
    '0.2.262.1.10.12.0': {
        d: 'liabilityLimitationFlag',
        c: 'Telesec cert/CRL extension'
    },
    '0.2.262.1.10.12.1': {
        d: 'telesecCertIdExt',
        c: 'Telesec cert/CRL extension'
    },
    '0.2.262.1.10.12.2': {
        d: 'Telesec policyIdentifier',
        c: 'Telesec cert/CRL extension'
    },
    '0.2.262.1.10.12.3': {
        d: 'telesecPolicyQualifierID',
        c: 'Telesec cert/CRL extension'
    },
    '0.2.262.1.10.12.4': {
        d: 'telesecCRLFilteredExt',
        c: 'Telesec cert/CRL extension'
    },
    '0.2.262.1.10.12.5': {
        d: 'telesecCRLFilterExt',
        c: 'Telesec cert/CRL extension'
    },
    '0.2.262.1.10.12.6': {
        d: 'telesecNamingAuthorityExt',
        c: 'Telesec cert/CRL extension'
    },
    '0.4.0.127.0.7': { d: 'bsi', c: 'BSI TR-03110/TR-03111' },
    '0.4.0.127.0.7.1': { d: 'bsiEcc', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1': { d: 'bsifieldType', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.1': { d: 'bsiPrimeField', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.2': { d: 'bsiCharacteristicTwoField', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.2.2': { d: 'bsiECTLVKeyFormat', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.2.2.1': { d: 'bsiECTLVPublicKey', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.2.3': {
        d: 'bsiCharacteristicTwoBasis',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.2.3.1': { d: 'bsiGnBasis', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.2.3.2': { d: 'bsiTpBasis', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.2.3.3': { d: 'bsiPpBasis', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.4.1': { d: 'bsiEcdsaSignatures', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.4.1.1': { d: 'bsiEcdsaWithSHA1', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.4.1.2': { d: 'bsiEcdsaWithSHA224', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.4.1.3': { d: 'bsiEcdsaWithSHA256', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.4.1.4': { d: 'bsiEcdsaWithSHA384', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.4.1.5': { d: 'bsiEcdsaWithSHA512', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.4.1.6': { d: 'bsiEcdsaWithRIPEMD160', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.5.1.1': { d: 'bsiEckaEgX963KDF', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.5.1.1.1': {
        d: 'bsiEckaEgX963KDFWithSHA1',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.1.1.2': {
        d: 'bsiEckaEgX963KDFWithSHA224',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.1.1.3': {
        d: 'bsiEckaEgX963KDFWithSHA256',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.1.1.4': {
        d: 'bsiEckaEgX963KDFWithSHA384',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.1.1.5': {
        d: 'bsiEckaEgX963KDFWithSHA512',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.1.1.6': {
        d: 'bsiEckaEgX963KDFWithRIPEMD160',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.1.2': { d: 'bsiEckaEgSessionKDF', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.5.1.2.1': {
        d: 'bsiEckaEgSessionKDFWith3DES',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.1.2.2': {
        d: 'bsiEckaEgSessionKDFWithAES128',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.1.2.3': {
        d: 'bsiEckaEgSessionKDFWithAES192',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.1.2.4': {
        d: 'bsiEckaEgSessionKDFWithAES256',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2': { d: 'bsiEckaDH', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.5.2.1': { d: 'bsiEckaDHX963KDF', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.5.2.1.1': {
        d: 'bsiEckaDHX963KDFWithSHA1',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2.1.2': {
        d: 'bsiEckaDHX963KDFWithSHA224',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2.1.3': {
        d: 'bsiEckaDHX963KDFWithSHA256',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2.1.4': {
        d: 'bsiEckaDHX963KDFWithSHA384',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2.1.5': {
        d: 'bsiEckaDHX963KDFWithSHA512',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2.1.6': {
        d: 'bsiEckaDHX963KDFWithRIPEMD160',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2.2': { d: 'bsiEckaDHSessionKDF', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.1.5.2.2.1': {
        d: 'bsiEckaDHSessionKDFWith3DES',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2.2.2': {
        d: 'bsiEckaDHSessionKDFWithAES128',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2.2.3': {
        d: 'bsiEckaDHSessionKDFWithAES192',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.1.5.2.2.4': {
        d: 'bsiEckaDHSessionKDFWithAES256',
        c: 'BSI TR-03111'
    },
    '0.4.0.127.0.7.1.2': { d: 'bsiEcKeyType', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.2.1': { d: 'bsiEcPublicKey', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.5.1': { d: 'bsiKaeg', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.5.1.1': { d: 'bsiKaegWithX963KDF', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.1.5.1.2': { d: 'bsiKaegWith3DESKDF', c: 'BSI TR-03111' },
    '0.4.0.127.0.7.2.2.1': {
        d: 'bsiPK',
        c: 'BSI TR-03110. Formerly known as bsiCA, now moved to ...2.2.3.x'
    },
    '0.4.0.127.0.7.2.2.1.1': {
        d: 'bsiPK_DH',
        c: 'BSI TR-03110. Formerly known as bsiCA_DH, now moved to ...2.2.3.x'
    },
    '0.4.0.127.0.7.2.2.1.2': {
        d: 'bsiPK_ECDH',
        c: 'BSI TR-03110. Formerly known as bsiCA_ECDH, now moved to ...2.2.3.x'
    },
    '0.4.0.127.0.7.2.2.2': { d: 'bsiTA', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.1': { d: 'bsiTA_RSA', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.1.1': { d: 'bsiTA_RSAv1_5_SHA1', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.1.2': { d: 'bsiTA_RSAv1_5_SHA256', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.1.3': { d: 'bsiTA_RSAPSS_SHA1', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.1.4': { d: 'bsiTA_RSAPSS_SHA256', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.1.5': { d: 'bsiTA_RSAv1_5_SHA512', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.1.6': { d: 'bsiTA_RSAPSS_SHA512', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.2': { d: 'bsiTA_ECDSA', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.2.1': { d: 'bsiTA_ECDSA_SHA1', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.2.2': { d: 'bsiTA_ECDSA_SHA224', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.2.3': { d: 'bsiTA_ECDSA_SHA256', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.2.4': { d: 'bsiTA_ECDSA_SHA384', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.2.2.5': { d: 'bsiTA_ECDSA_SHA512', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.3': { d: 'bsiCA', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.3.1': { d: 'bsiCA_DH', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.3.1.1': { d: 'bsiCA_DH_3DES_CBC_CBC', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.3.1.2': {
        d: 'bsiCA_DH_AES_CBC_CMAC_128',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.3.1.3': {
        d: 'bsiCA_DH_AES_CBC_CMAC_192',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.3.1.4': {
        d: 'bsiCA_DH_AES_CBC_CMAC_256',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.3.2': { d: 'bsiCA_ECDH', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.3.2.1': {
        d: 'bsiCA_ECDH_3DES_CBC_CBC',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.3.2.2': {
        d: 'bsiCA_ECDH_AES_CBC_CMAC_128',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.3.2.3': {
        d: 'bsiCA_ECDH_AES_CBC_CMAC_192',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.3.2.4': {
        d: 'bsiCA_ECDH_AES_CBC_CMAC_256',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4': { d: 'bsiPACE', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.4.1': { d: 'bsiPACE_DH_GM', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.4.1.1': {
        d: 'bsiPACE_DH_GM_3DES_CBC_CBC',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.1.2': {
        d: 'bsiPACE_DH_GM_AES_CBC_CMAC_128',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.1.3': {
        d: 'bsiPACE_DH_GM_AES_CBC_CMAC_192',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.1.4': {
        d: 'bsiPACE_DH_GM_AES_CBC_CMAC_256',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.2': { d: 'bsiPACE_ECDH_GM', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.4.2.1': {
        d: 'bsiPACE_ECDH_GM_3DES_CBC_CBC',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.2.2': {
        d: 'bsiPACE_ECDH_GM_AES_CBC_CMAC_128',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.2.3': {
        d: 'bsiPACE_ECDH_GM_AES_CBC_CMAC_192',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.2.4': {
        d: 'bsiPACE_ECDH_GM_AES_CBC_CMAC_256',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.3': { d: 'bsiPACE_DH_IM', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.4.3.1': {
        d: 'bsiPACE_DH_IM_3DES_CBC_CBC',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.3.2': {
        d: 'bsiPACE_DH_IM_AES_CBC_CMAC_128',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.3.3': {
        d: 'bsiPACE_DH_IM_AES_CBC_CMAC_192',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.3.4': {
        d: 'bsiPACE_DH_IM_AES_CBC_CMAC_256',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.4': { d: 'bsiPACE_ECDH_IM', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.4.4.1': {
        d: 'bsiPACE_ECDH_IM_3DES_CBC_CBC',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.4.2': {
        d: 'bsiPACE_ECDH_IM_AES_CBC_CMAC_128',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.4.3': {
        d: 'bsiPACE_ECDH_IM_AES_CBC_CMAC_192',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.4.4.4': {
        d: 'bsiPACE_ECDH_IM_AES_CBC_CMAC_256',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.2.2.5': { d: 'bsiRI', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.1': { d: 'bsiRI_DH', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.1.1': { d: 'bsiRI_DH_SHA1', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.1.2': { d: 'bsiRI_DH_SHA224', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.1.3': { d: 'bsiRI_DH_SHA256', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.1.4': { d: 'bsiRI_DH_SHA384', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.1.5': { d: 'bsiRI_DH_SHA512', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.2': { d: 'bsiRI_ECDH', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.2.1': { d: 'bsiRI_ECDH_SHA1', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.2.2': { d: 'bsiRI_ECDH_SHA224', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.2.3': { d: 'bsiRI_ECDH_SHA256', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.2.4': { d: 'bsiRI_ECDH_SHA384', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.5.2.5': { d: 'bsiRI_ECDH_SHA512', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.6': { d: 'bsiCardInfo', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.7': { d: 'bsiEidSecurity', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.2.2.8': { d: 'bsiPT', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.2': { d: 'bsiEACRoles', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.2.1': { d: 'bsiEACRolesIS', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.2.2': { d: 'bsiEACRolesAT', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.2.3': { d: 'bsiEACRolesST', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.3': { d: 'bsiTAv2ce', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.3.1': { d: 'bsiTAv2ceDescription', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.3.1.1': {
        d: 'bsiTAv2ceDescriptionPlainText',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.3.1.3.1.2': {
        d: 'bsiTAv2ceDescriptionIA5String',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.3.1.3.1.3': {
        d: 'bsiTAv2ceDescriptionOctetString',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.3.1.3.2': { d: 'bsiTAv2ceTerminalSector', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.4': { d: 'bsiAuxData', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.4.1': { d: 'bsiAuxDataBirthday', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.4.2': { d: 'bsiAuxDataExpireDate', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.4.3': { d: 'bsiAuxDataCommunityID', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5': { d: 'bsiDefectList', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5.1': { d: 'bsiDefectAuthDefect', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5.1.1': { d: 'bsiDefectCertRevoked', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5.1.2': { d: 'bsiDefectCertReplaced', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5.1.3': {
        d: 'bsiDefectChipAuthKeyRevoked',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.3.1.5.1.4': {
        d: 'bsiDefectActiveAuthKeyRevoked',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.3.1.5.2': { d: 'bsiDefectEPassportDefect', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5.2.1': {
        d: 'bsiDefectEPassportDGMalformed',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.3.1.5.2.2': { d: 'bsiDefectSODInvalid', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5.3': { d: 'bsiDefectEIDDefect', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5.3.1': {
        d: 'bsiDefectEIDDGMalformed',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.3.1.5.3.2': { d: 'bsiDefectEIDIntegrity', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5.4': { d: 'bsiDefectDocumentDefect', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.5.4.1': {
        d: 'bsiDefectCardSecurityMalformed',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.3.1.5.4.2': {
        d: 'bsiDefectChipSecurityMalformed',
        c: 'BSI TR-03110'
    },
    '0.4.0.127.0.7.3.1.5.4.3': { d: 'bsiDefectPowerDownReq', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.1.6': { d: 'bsiListContentDescription', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.2.1': { d: 'bsiSecurityObject', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.2.2': { d: 'bsiBlackList', c: 'BSI TR-03110' },
    '0.4.0.127.0.7.3.4.2.2': {
        d: 'bsiSignedUpdateDeviceAdmin',
        c: 'BSI TR-03109'
    },
    '0.4.0.127.0.7.4.1.1.1': { d: 'bsiCertReqMsgs', c: 'BSI TR-03109' },
    '0.4.0.127.0.7.4.1.1.2': {
        d: 'bsiCertReqMsgswithOuterSignature',
        c: 'BSI TR-03109'
    },
    '0.4.0.127.0.7.4.1.1.3': { d: 'bsiAuthorizedCertReqMsgs', c: 'BSI TR-03109' },
    '0.4.0.127.0.7.4.1.2.2': { d: 'bsiSignedRevReqs', c: 'BSI TR-03109' },
    '0.4.0.1862': {
        d: 'etsiQcsProfile',
        c: 'ETSI TS 101 862 qualified certificates'
    },
    '0.4.0.1862.1': { d: 'etsiQcs', c: 'ETSI TS 101 862 qualified certificates' },
    '0.4.0.1862.1.1': {
        d: 'etsiQcsCompliance',
        c: 'ETSI TS 101 862 qualified certificates'
    },
    '0.4.0.1862.1.2': {
        d: 'etsiQcsLimitValue',
        c: 'ETSI TS 101 862 qualified certificates'
    },
    '0.4.0.1862.1.3': {
        d: 'etsiQcsRetentionPeriod',
        c: 'ETSI TS 101 862 qualified certificates'
    },
    '0.4.0.1862.1.4': {
        d: 'etsiQcsQcSSCD',
        c: 'ETSI TS 101 862 qualified certificates'
    },
    '0.9.2342.19200300.100.1.1': {
        d: 'userID',
        c: 'Some oddball X.500 attribute collection'
    },
    '0.9.2342.19200300.100.1.3': {
        d: 'rfc822Mailbox',
        c: 'Some oddball X.500 attribute collection'
    },
    '0.9.2342.19200300.100.1.25': {
        d: 'domainComponent',
        c: 'Men are from Mars, this OID is from Pluto'
    },
    '1.0.10118.3.0.49': { d: 'ripemd160', c: 'ISO 10118-3 hash function' },
    '1.0.10118.3.0.50': { d: 'ripemd128', c: 'ISO 10118-3 hash function' },
    '1.0.10118.3.0.55': { d: 'whirlpool', c: 'ISO 10118-3 hash function' },
    '1.0.18033.2': { d: 'iso18033-2', c: 'ISO 18033-2' },
    '1.0.18033.2.2': { d: 'kem', c: 'ISO 18033-2 algorithms' },
    '1.0.18033.2.2.4': { d: 'kemRSA', c: 'ISO 18033-2 KEM algorithms' },
    '1.2.36.1.3.1.1.1': { d: 'qgpki', c: 'Queensland Government PKI' },
    '1.2.36.1.3.1.1.1.1': { d: 'qgpkiPolicies', c: 'QGPKI policies' },
    '1.2.36.1.3.1.1.1.1.1': { d: 'qgpkiMedIntermedCA', c: 'QGPKI policy' },
    '1.2.36.1.3.1.1.1.1.1.1': {
        d: 'qgpkiMedIntermedIndividual',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.1.2': {
        d: 'qgpkiMedIntermedDeviceControl',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.1.3': { d: 'qgpkiMedIntermedDevice', c: 'QGPKI policy' },
    '1.2.36.1.3.1.1.1.1.1.4': {
        d: 'qgpkiMedIntermedAuthorisedParty',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.1.5': {
        d: 'qgpkiMedIntermedDeviceSystem',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.2': { d: 'qgpkiMedIssuingCA', c: 'QGPKI policy' },
    '1.2.36.1.3.1.1.1.1.2.1': {
        d: 'qgpkiMedIssuingIndividual',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.2.2': {
        d: 'qgpkiMedIssuingDeviceControl',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.2.3': { d: 'qgpkiMedIssuingDevice', c: 'QGPKI policy' },
    '1.2.36.1.3.1.1.1.1.2.4': {
        d: 'qgpkiMedIssuingAuthorisedParty',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.2.5': {
        d: 'qgpkiMedIssuingClientAuth',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.2.6': {
        d: 'qgpkiMedIssuingServerAuth',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.2.7': { d: 'qgpkiMedIssuingDataProt', c: 'QGPKI policy' },
    '1.2.36.1.3.1.1.1.1.2.8': {
        d: 'qgpkiMedIssuingTokenAuth',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.3': { d: 'qgpkiBasicIntermedCA', c: 'QGPKI policy' },
    '1.2.36.1.3.1.1.1.1.3.1': {
        d: 'qgpkiBasicIntermedDeviceSystem',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.4': { d: 'qgpkiBasicIssuingCA', c: 'QGPKI policy' },
    '1.2.36.1.3.1.1.1.1.4.1': {
        d: 'qgpkiBasicIssuingClientAuth',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.4.2': {
        d: 'qgpkiBasicIssuingServerAuth',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.1.4.3': {
        d: 'qgpkiBasicIssuingDataSigning',
        c: 'QGPKI policy'
    },
    '1.2.36.1.3.1.1.1.2': {
        d: 'qgpkiAssuranceLevel',
        c: 'QGPKI assurance level'
    },
    '1.2.36.1.3.1.1.1.2.1': {
        d: 'qgpkiAssuranceRudimentary',
        c: 'QGPKI assurance level'
    },
    '1.2.36.1.3.1.1.1.2.2': {
        d: 'qgpkiAssuranceBasic',
        c: 'QGPKI assurance level'
    },
    '1.2.36.1.3.1.1.1.2.3': {
        d: 'qgpkiAssuranceMedium',
        c: 'QGPKI assurance level'
    },
    '1.2.36.1.3.1.1.1.2.4': {
        d: 'qgpkiAssuranceHigh',
        c: 'QGPKI assurance level'
    },
    '1.2.36.1.3.1.1.1.3': { d: 'qgpkiCertFunction', c: 'QGPKI policies' },
    '1.2.36.1.3.1.1.1.3.1': { d: 'qgpkiFunctionIndividual', c: 'QGPKI policies' },
    '1.2.36.1.3.1.1.1.3.2': { d: 'qgpkiFunctionDevice', c: 'QGPKI policies' },
    '1.2.36.1.3.1.1.1.3.3': {
        d: 'qgpkiFunctionAuthorisedParty',
        c: 'QGPKI policies'
    },
    '1.2.36.1.3.1.1.1.3.4': {
        d: 'qgpkiFunctionDeviceControl',
        c: 'QGPKI policies'
    },
    '1.2.36.1.3.1.2': { d: 'qpspki', c: 'Queensland Police PKI' },
    '1.2.36.1.3.1.2.1': { d: 'qpspkiPolicies', c: 'Queensland Police PKI' },
    '1.2.36.1.3.1.2.1.2': { d: 'qpspkiPolicyBasic', c: 'Queensland Police PKI' },
    '1.2.36.1.3.1.2.1.3': { d: 'qpspkiPolicyMedium', c: 'Queensland Police PKI' },
    '1.2.36.1.3.1.2.1.4': { d: 'qpspkiPolicyHigh', c: 'Queensland Police PKI' },
    '1.2.36.1.3.1.3.2': { d: 'qtmrpki', c: 'Queensland Transport PKI' },
    '1.2.36.1.3.1.3.2.1': { d: 'qtmrpkiPolicies', c: 'Queensland Transport PKI' },
    '1.2.36.1.3.1.3.2.2': { d: 'qtmrpkiPurpose', c: 'Queensland Transport PKI' },
    '1.2.36.1.3.1.3.2.2.1': {
        d: 'qtmrpkiIndividual',
        c: 'Queensland Transport PKI purpose'
    },
    '1.2.36.1.3.1.3.2.2.2': {
        d: 'qtmrpkiDeviceControl',
        c: 'Queensland Transport PKI purpose'
    },
    '1.2.36.1.3.1.3.2.2.3': {
        d: 'qtmrpkiDevice',
        c: 'Queensland Transport PKI purpose'
    },
    '1.2.36.1.3.1.3.2.2.4': {
        d: 'qtmrpkiAuthorisedParty',
        c: 'Queensland Transport PKI purpose'
    },
    '1.2.36.1.3.1.3.2.2.5': {
        d: 'qtmrpkiDeviceSystem',
        c: 'Queensland Transport PKI purpose'
    },
    '1.2.36.1.3.1.3.2.3': { d: 'qtmrpkiDevice', c: 'Queensland Transport PKI' },
    '1.2.36.1.3.1.3.2.3.1': {
        d: 'qtmrpkiDriverLicense',
        c: 'Queensland Transport PKI device'
    },
    '1.2.36.1.3.1.3.2.3.2': {
        d: 'qtmrpkiIndustryAuthority',
        c: 'Queensland Transport PKI device'
    },
    '1.2.36.1.3.1.3.2.3.3': {
        d: 'qtmrpkiMarineLicense',
        c: 'Queensland Transport PKI device'
    },
    '1.2.36.1.3.1.3.2.3.4': {
        d: 'qtmrpkiAdultProofOfAge',
        c: 'Queensland Transport PKI device'
    },
    '1.2.36.1.3.1.3.2.3.5': {
        d: 'qtmrpkiSam',
        c: 'Queensland Transport PKI device'
    },
    '1.2.36.1.3.1.3.2.4': {
        d: 'qtmrpkiAuthorisedParty',
        c: 'Queensland Transport PKI'
    },
    '1.2.36.1.3.1.3.2.4.1': {
        d: 'qtmrpkiTransportInspector',
        c: 'Queensland Transport PKI authorised party'
    },
    '1.2.36.1.3.1.3.2.4.2': {
        d: 'qtmrpkiPoliceOfficer',
        c: 'Queensland Transport PKI authorised party'
    },
    '1.2.36.1.3.1.3.2.4.3': {
        d: 'qtmrpkiSystem',
        c: 'Queensland Transport PKI authorised party'
    },
    '1.2.36.1.3.1.3.2.4.4': {
        d: 'qtmrpkiLiquorLicensingInspector',
        c: 'Queensland Transport PKI authorised party'
    },
    '1.2.36.1.3.1.3.2.4.5': {
        d: 'qtmrpkiMarineEnforcementOfficer',
        c: 'Queensland Transport PKI authorised party'
    },
    '1.2.36.1.333.1': {
        d: 'australianBusinessNumber',
        c: 'Australian Government corporate taxpayer ID'
    },
    '1.2.36.68980861.1.1.2': { d: 'signetPersonal', c: 'Signet CA' },
    '1.2.36.68980861.1.1.3': { d: 'signetBusiness', c: 'Signet CA' },
    '1.2.36.68980861.1.1.4': { d: 'signetLegal', c: 'Signet CA' },
    '1.2.36.68980861.1.1.10': { d: 'signetPilot', c: 'Signet CA' },
    '1.2.36.68980861.1.1.11': { d: 'signetIntraNet', c: 'Signet CA' },
    '1.2.36.68980861.1.1.20': { d: 'signetPolicy', c: 'Signet CA' },
    '1.2.36.75878867.1.100.1.1': {
        d: 'certificatesAustraliaPolicy',
        c: 'Certificates Australia CA'
    },
    '1.2.156.10197.1': {
        d: 'gmtCryptographicAlgorithm',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.100': {
        d: 'gmtBlockCipher',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.102': { d: 'sm1Cipher', c: 'China GM Standards Committee' },
    '1.2.156.10197.1.103': {
        d: 'ssf33Cipher',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.104': { d: 'sm4Cipher', c: 'China GM Standards Committee' },
    '1.2.156.10197.1.200': {
        d: 'gmtStreamCipher',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.201': { d: 'zucCipher', c: 'China GM Standards Committee' },
    '1.2.156.10197.1.300': {
        d: 'gmtPublicKeyCryptography',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.301': { d: 'sm2ECC', c: 'China GM Standards Committee' },
    '1.2.156.10197.1.301.1': {
        d: 'sm2-1DigitalSignature',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.301.2': {
        d: 'sm2-2KeyExchange',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.301.3': {
        d: 'sm2-3PublicKeyEncryption',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.302': { d: 'gmtSM9IBE', c: 'China GM Standards Committee' },
    '1.2.156.10197.1.302.1': {
        d: 'sm9-1DigitalSignature',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.302.2': {
        d: 'sm9-2KeyExchange',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.302.3': {
        d: 'sm9-3PublicKeyEncryption',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.400': {
        d: 'gmtHashAlgorithm',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.401': { d: 'sm3Hash', c: 'China GM Standards Committee' },
    '1.2.156.10197.1.401.1': {
        d: 'sm3HashWithoutKey',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.401.2': {
        d: 'sm3HashWithKey',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.500': {
        d: 'gmtDigestSigning',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.1.501': { d: 'sm2withSM3', c: 'China GM Standards Committee' },
    '1.2.156.10197.1.504': { d: 'rsaWithSM3', c: 'China GM Standards Committee' },
    '1.2.156.10197.4.3': {
        d: 'gmtCertificateAuthority',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6': {
        d: 'gmtStandardClass',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1': {
        d: 'gmtFoundationClass',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.1': {
        d: 'gmtAlgorithmClass',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.1.1': {
        d: 'zucStandard',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.1.2': {
        d: 'sm4Standard',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.1.3': {
        d: 'sm2Standard',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.1.4': {
        d: 'sm3Standard',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.2': { d: 'gmtIDClass', c: 'China GM Standards Committee' },
    '1.2.156.10197.6.1.2.1': {
        d: 'gmtCryptoID',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.3': {
        d: 'gmtOperationModes',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.4': {
        d: 'gmtSecurityMechanism',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.4.1': {
        d: 'gmtSM2Specification',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.1.4.2': {
        d: 'gmtSM2CryptographicMessageSyntax',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.2': {
        d: 'gmtDeviceClass',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.3': {
        d: 'gmtServiceClass',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.4': {
        d: 'gmtInfrastructure',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.5': {
        d: 'gmtTestingClass',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.5.1': {
        d: 'gmtRandomTestingClass',
        c: 'China GM Standards Committee'
    },
    '1.2.156.10197.6.6': {
        d: 'gmtManagementClass',
        c: 'China GM Standards Committee'
    },
    '1.2.392.200011.61.1.1.1': {
        d: 'mitsubishiSecurityAlgorithm',
        c: 'Mitsubishi security algorithm'
    },
    '1.2.392.200011.61.1.1.1.1': {
        d: 'misty1-cbc',
        c: 'Mitsubishi security algorithm'
    },
    '1.2.410.200004.1': { d: 'kisaAlgorithm', c: 'KISA algorithm' },
    '1.2.410.200004.1.1': { d: 'kcdsa', c: 'Korean DSA' },
    '1.2.410.200004.1.2': { d: 'has160', c: 'Korean hash algorithm' },
    '1.2.410.200004.1.3': { d: 'seedECB', c: 'Korean SEED algorithm, ECB mode' },
    '1.2.410.200004.1.4': { d: 'seedCBC', c: 'Korean SEED algorithm, CBC mode' },
    '1.2.410.200004.1.5': { d: 'seedOFB', c: 'Korean SEED algorithm, OFB mode' },
    '1.2.410.200004.1.6': { d: 'seedCFB', c: 'Korean SEED algorithm, CFB mode' },
    '1.2.410.200004.1.7': { d: 'seedMAC', c: 'Korean SEED algorithm, MAC mode' },
    '1.2.410.200004.1.8': {
        d: 'kcdsaWithHAS160',
        c: 'Korean signature algorithm'
    },
    '1.2.410.200004.1.9': { d: 'kcdsaWithSHA1', c: 'Korean signature algorithm' },
    '1.2.410.200004.1.10': {
        d: 'pbeWithHAS160AndSEED-ECB',
        c: 'Korean SEED algorithm, PBE key derivation'
    },
    '1.2.410.200004.1.11': {
        d: 'pbeWithHAS160AndSEED-CBC',
        c: 'Korean SEED algorithm, PBE key derivation'
    },
    '1.2.410.200004.1.12': {
        d: 'pbeWithHAS160AndSEED-CFB',
        c: 'Korean SEED algorithm, PBE key derivation'
    },
    '1.2.410.200004.1.13': {
        d: 'pbeWithHAS160AndSEED-OFB',
        c: 'Korean SEED algorithm, PBE key derivation'
    },
    '1.2.410.200004.1.14': {
        d: 'pbeWithSHA1AndSEED-ECB',
        c: 'Korean SEED algorithm, PBE key derivation'
    },
    '1.2.410.200004.1.15': {
        d: 'pbeWithSHA1AndSEED-CBC',
        c: 'Korean SEED algorithm, PBE key derivation'
    },
    '1.2.410.200004.1.16': {
        d: 'pbeWithSHA1AndSEED-CFB',
        c: 'Korean SEED algorithm, PBE key derivation'
    },
    '1.2.410.200004.1.17': {
        d: 'pbeWithSHA1AndSEED-OFB',
        c: 'Korean SEED algorithm, PBE key derivation'
    },
    '1.2.410.200004.1.20': {
        d: 'rsaWithHAS160',
        c: 'Korean signature algorithm'
    },
    '1.2.410.200004.1.21': { d: 'kcdsa1', c: 'Korean DSA' },
    '1.2.410.200004.2': { d: 'npkiCP', c: 'KISA NPKI certificate policies' },
    '1.2.410.200004.2.1': {
        d: 'npkiSignaturePolicy',
        c: 'KISA NPKI certificate policies'
    },
    '1.2.410.200004.3': { d: 'npkiKP', c: 'KISA NPKI key usage' },
    '1.2.410.200004.4': { d: 'npkiAT', c: 'KISA NPKI attribute' },
    '1.2.410.200004.5': { d: 'npkiLCA', c: 'KISA NPKI licensed CA' },
    '1.2.410.200004.5.1': { d: 'npkiSignKorea', c: 'KISA NPKI licensed CA' },
    '1.2.410.200004.5.2': { d: 'npkiSignGate', c: 'KISA NPKI licensed CA' },
    '1.2.410.200004.5.3': { d: 'npkiNcaSign', c: 'KISA NPKI licensed CA' },
    '1.2.410.200004.6': { d: 'npkiON', c: 'KISA NPKI otherName' },
    '1.2.410.200004.7': { d: 'npkiAPP', c: 'KISA NPKI application' },
    '1.2.410.200004.7.1': { d: 'npkiSMIME', c: 'KISA NPKI application' },
    '1.2.410.200004.7.1.1': { d: 'npkiSMIMEAlgo', c: 'KISA NPKI application' },
    '1.2.410.200004.7.1.1.1': {
        d: 'npkiCmsSEEDWrap',
        c: 'KISA NPKI application'
    },
    '1.2.410.200004.10': { d: 'npki', c: 'KISA NPKI' },
    '1.2.410.200004.10.1': { d: 'npkiAttribute', c: 'KISA NPKI attribute' },
    '1.2.410.200004.10.1.1': { d: 'npkiIdentifyData', c: 'KISA NPKI attribute' },
    '1.2.410.200004.10.1.1.1': { d: 'npkiVID', c: 'KISA NPKI attribute' },
    '1.2.410.200004.10.1.1.2': {
        d: 'npkiEncryptedVID',
        c: 'KISA NPKI attribute'
    },
    '1.2.410.200004.10.1.1.3': { d: 'npkiRandomNum', c: 'KISA NPKI attribute' },
    '1.2.410.200004.10.1.1.4': { d: 'npkiVID', c: 'KISA NPKI attribute' },
    '1.2.410.200046.1.1': { d: 'aria1AlgorithmModes', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.1': { d: 'aria128-ecb', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.2': { d: 'aria128-cbc', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.3': { d: 'aria128-cfb', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.4': { d: 'aria128-ofb', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.5': { d: 'aria128-ctr', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.6': { d: 'aria192-ecb', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.7': { d: 'aria192-cbc', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.8': { d: 'aria192-cfb', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.9': { d: 'aria192-ofb', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.10': { d: 'aria192-ctr', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.11': { d: 'aria256-ecb', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.12': { d: 'aria256-cbc', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.13': { d: 'aria256-cfb', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.14': { d: 'aria256-ofb', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.15': { d: 'aria256-ctr', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.21': { d: 'aria128-cmac', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.22': { d: 'aria192-cmac', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.23': { d: 'aria256-cmac', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.31': { d: 'aria128-ocb2', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.32': { d: 'aria192-ocb2', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.33': { d: 'aria256-ocb2', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.34': { d: 'aria128-gcm', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.35': { d: 'aria192-gcm', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.36': { d: 'aria256-gcm', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.37': { d: 'aria128-ccm', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.38': { d: 'aria192-ccm', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.39': { d: 'aria256-ccm', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.40': { d: 'aria128-keywrap', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.41': { d: 'aria192-keywrap', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.42': { d: 'aria256-keywrap', c: 'ARIA algorithm modes' },
    '1.2.410.200046.1.1.43': {
        d: 'aria128-keywrapWithPad',
        c: 'ARIA algorithm modes'
    },
    '1.2.410.200046.1.1.44': {
        d: 'aria192-keywrapWithPad',
        c: 'ARIA algorithm modes'
    },
    '1.2.410.200046.1.1.45': {
        d: 'aria256-keywrapWithPad',
        c: 'ARIA algorithm modes'
    },
    '1.2.643.2.2.3': {
        d: 'gostSignature',
        c: 'GOST R 34.10-2001 + GOST R 34.11-94 signature'
    },
    '1.2.643.2.2.4': {
        d: 'gost94Signature',
        c: 'GOST R 34.10-94 + GOST R 34.11-94 signature. Obsoleted by GOST R 34.10-2001',
        w: true
    },
    '1.2.643.2.2.19': {
        d: 'gostPublicKey',
        c: 'GOST R 34.10-2001 (ECC) public key'
    },
    '1.2.643.2.2.20': {
        d: 'gost94PublicKey',
        c: 'GOST R 34.10-94 public key. Obsoleted by GOST R 34.10-2001',
        w: true
    },
    '1.2.643.2.2.21': {
        d: 'gostCipher',
        c: 'GOST 28147-89 (symmetric key block cipher)'
    },
    '1.2.643.2.2.31.0': {
        d: 'testCipherParams',
        c: 'Test params for GOST 28147-89'
    },
    '1.2.643.2.2.31.1': {
        d: 'cryptoProCipherA',
        c: "CryptoPro params A (default, variant 'Verba-O') for GOST 28147-89"
    },
    '1.2.643.2.2.31.2': {
        d: 'cryptoProCipherB',
        c: 'CryptoPro params B (variant 1) for GOST 28147-89'
    },
    '1.2.643.2.2.31.3': {
        d: 'cryptoProCipherC',
        c: 'CryptoPro params C (variant 2) for GOST 28147-89'
    },
    '1.2.643.2.2.31.4': {
        d: 'cryptoProCipherD',
        c: 'CryptoPro params D (variant 3) for GOST 28147-89'
    },
    '1.2.643.2.2.31.5': {
        d: 'oscar11Cipher',
        c: 'Oscar-1.1 params for GOST 28147-89'
    },
    '1.2.643.2.2.31.6': {
        d: 'oscar10Cipher',
        c: 'Oscar-1.0 params for GOST 28147-89'
    },
    '1.2.643.2.2.31.7': { d: 'ric1Cipher', c: 'RIC-1 params for GOST 28147-89' },
    '1.2.643.2.2.31.12': {
        d: 'tc26CipherA',
        c: 'TC26 params 2 for GOST 28147-89'
    },
    '1.2.643.2.2.31.13': {
        d: 'tc26CipherB',
        c: 'TC26 params 1 for GOST 28147-89'
    },
    '1.2.643.2.2.31.14': {
        d: 'tc26CipherC',
        c: 'TC26 params 3 for GOST 28147-89'
    },
    '1.2.643.2.2.31.15': {
        d: 'tc26CipherD',
        c: 'TC26 params 4 for GOST 28147-89'
    },
    '1.2.643.2.2.31.16': {
        d: 'tc26CipherE',
        c: 'TC26 params 5 for GOST 28147-89'
    },
    '1.2.643.2.2.31.17': {
        d: 'tc26CipherF',
        c: 'TC26 params 6 for GOST 28147-89'
    },
    '1.2.643.7.1.2.5.1.1': {
        d: 'tc26CipherZ',
        c: 'TC26 params Z for GOST 28147-89'
    },
    '1.2.643.2.2.9': { d: 'gostDigest', c: 'GOST R 34.11-94 digest' },
    '1.2.643.2.2.30.0': {
        d: 'testDigestParams',
        c: 'Test params for GOST R 34.11-94'
    },
    '1.2.643.2.2.30.1': {
        d: 'cryptoProDigestA',
        c: "CryptoPro digest params A (default, variant 'Verba-O') for GOST R 34.11-94"
    },
    '1.2.643.2.2.30.2': {
        d: 'cryptoProDigestB',
        c: 'CryptoPro digest params B (variant 1) for GOST R 34.11-94'
    },
    '1.2.643.2.2.30.3': {
        d: 'cryptoProDigestC',
        c: 'CryptoPro digest params C (variant 2) for GOST R 34.11-94'
    },
    '1.2.643.2.2.30.4': {
        d: 'cryptoProDigestD',
        c: 'CryptoPro digest params D (variant 3) for GOST R 34.11-94'
    },
    '1.2.643.2.2.32.2': {
        d: 'cryptoPro94SignA',
        c: "CryptoPro sign params A (default, variant 'Verba-O') for GOST R 34.10-94"
    },
    '1.2.643.2.2.32.3': {
        d: 'cryptoPro94SignB',
        c: 'CryptoPro sign params B (variant 1) for GOST R 34.10-94'
    },
    '1.2.643.2.2.32.4': {
        d: 'cryptoPro94SignC',
        c: 'CryptoPro sign params C (variant 2) for GOST R 34.10-94'
    },
    '1.2.643.2.2.32.5': {
        d: 'cryptoPro94SignD',
        c: 'CryptoPro sign params D (variant 3) for GOST R 34.10-94'
    },
    '1.2.643.2.2.33.1': {
        d: 'cryptoPro94SignXA',
        c: 'CryptoPro sign params XA (variant 1) for GOST R 34.10-94'
    },
    '1.2.643.2.2.33.2': {
        d: 'cryptoPro94SignXB',
        c: 'CryptoPro sign params XB (variant 2) for GOST R 34.10-94'
    },
    '1.2.643.2.2.33.3': {
        d: 'cryptoPro94SignXC',
        c: 'CryptoPro sign params XC (variant 3) for GOST R 34.10-94'
    },
    '1.2.643.2.2.35.0': {
        d: 'testSignParams',
        c: 'Test elliptic curve for GOST R 34.10-2001'
    },
    '1.2.643.2.2.35.1': {
        d: 'cryptoProSignA',
        c: 'CryptoPro ell.curve A for GOST R 34.10-2001'
    },
    '1.2.643.2.2.35.2': {
        d: 'cryptoProSignB',
        c: 'CryptoPro ell.curve B for GOST R 34.10-2001'
    },
    '1.2.643.2.2.35.3': {
        d: 'cryptoProSignC',
        c: 'CryptoPro ell.curve C for GOST R 34.10-2001'
    },
    '1.2.643.2.2.36.0': {
        d: 'cryptoProSignXA',
        c: 'CryptoPro ell.curve XA for GOST R 34.10-2001'
    },
    '1.2.643.2.2.36.1': {
        d: 'cryptoProSignXB',
        c: 'CryptoPro ell.curve XB for GOST R 34.10-2001'
    },
    '1.2.643.7.1.2.1.1.1': {
        d: 'cryptoPro2012Sign256A',
        c: 'CryptoPro ell.curve A for GOST R 34.10-2012 256 bit'
    },
    '1.2.643.7.1.2.1.2.1': {
        d: 'cryptoPro2012Sign512A',
        c: 'CryptoPro ell.curve A (default) for GOST R 34.10-2012 512 bit'
    },
    '1.2.643.7.1.2.1.2.2': {
        d: 'cryptoPro2012Sign512B',
        c: 'CryptoPro ell.curve B for GOST R 34.10-2012 512 bit'
    },
    '1.2.643.7.1.2.1.2.3': {
        d: 'cryptoPro2012Sign512C',
        c: 'CryptoPro ell.curve C for GOST R 34.10-2012 512 bit'
    },
    '1.2.643.2.2.14.0': {
        d: 'nullMeshing',
        c: 'Do not mesh state of GOST 28147-89 cipher'
    },
    '1.2.643.2.2.14.1': {
        d: 'cryptoProMeshing',
        c: 'CryptoPro meshing of state of GOST 28147-89 cipher'
    },
    '1.2.643.2.2.10': { d: 'hmacGost', c: 'HMAC with GOST R 34.11-94' },
    '1.2.643.2.2.13.0': { d: 'gostWrap', c: 'Wrap key using GOST 28147-89 key' },
    '1.2.643.2.2.13.1': {
        d: 'cryptoProWrap',
        c: 'Wrap key using diversified GOST 28147-89 key'
    },
    '1.2.643.2.2.96': {
        d: 'cryptoProECDHWrap',
        c: 'Wrap key using ECC DH on GOST R 34.10-2001 keys (VKO)'
    },
    '1.2.643.7.1.1.1.1': {
        d: 'gost2012PublicKey256',
        c: 'GOST R 34.10-2012 256 bit public key'
    },
    '1.2.643.7.1.1.1.2': {
        d: 'gost2012PublicKey512',
        c: 'GOST R 34.10-2012 512 bit public key'
    },
    '1.2.643.7.1.1.2.2': {
        d: 'gost2012Digest256',
        c: 'GOST R 34.11-2012 256 bit digest'
    },
    '1.2.643.7.1.1.2.3': {
        d: 'gost2012Digest512',
        c: 'GOST R 34.11-2012 512 bit digest'
    },
    '1.2.643.7.1.1.3.2': {
        d: 'gost2012Signature256',
        c: 'GOST R 34.10-2012 256 bit signature'
    },
    '1.2.643.7.1.1.3.3': {
        d: 'gost2012Signature512',
        c: 'GOST R 34.10-2012 512 bit signature'
    },
    '1.2.643.7.1.1.6.1': {
        d: 'cryptoProECDH256',
        c: 'CryptoPro ECC DH algorithm for GOST R 34.10-2012 256 bit key'
    },
    '1.2.643.7.1.1.6.2': {
        d: 'cryptoProECDH512',
        c: 'CryptoPro ECC DH algorithm for GOST R 34.10-2012 512 bit key'
    },
    '1.2.752.34.1': { d: 'seis-cp', c: 'SEIS Project' },
    '1.2.752.34.1.1': {
        d: 'SEIS high-assurance policyIdentifier',
        c: 'SEIS Project certificate policies'
    },
    '1.2.752.34.1.2': {
        d: 'SEIS GAK policyIdentifier',
        c: 'SEIS Project certificate policies'
    },
    '1.2.752.34.2': { d: 'SEIS pe', c: 'SEIS Project' },
    '1.2.752.34.3': { d: 'SEIS at', c: 'SEIS Project' },
    '1.2.752.34.3.1': {
        d: 'SEIS at-personalIdentifier',
        c: 'SEIS Project attribute'
    },
    '1.2.840.10040.1': { d: 'module', c: 'ANSI X9.57' },
    '1.2.840.10040.1.1': { d: 'x9f1-cert-mgmt', c: 'ANSI X9.57 module' },
    '1.2.840.10040.2': { d: 'holdinstruction', c: 'ANSI X9.57' },
    '1.2.840.10040.2.1': {
        d: 'holdinstruction-none',
        c: 'ANSI X9.57 hold instruction'
    },
    '1.2.840.10040.2.2': { d: 'callissuer', c: 'ANSI X9.57 hold instruction' },
    '1.2.840.10040.2.3': { d: 'reject', c: 'ANSI X9.57 hold instruction' },
    '1.2.840.10040.2.4': { d: 'pickupToken', c: 'ANSI X9.57 hold instruction' },
    '1.2.840.10040.3': { d: 'attribute', c: 'ANSI X9.57' },
    '1.2.840.10040.3.1': { d: 'countersignature', c: 'ANSI X9.57 attribute' },
    '1.2.840.10040.3.2': { d: 'attribute-cert', c: 'ANSI X9.57 attribute' },
    '1.2.840.10040.4': { d: 'algorithm', c: 'ANSI X9.57' },
    '1.2.840.10040.4.1': { d: 'dsa', c: 'ANSI X9.57 algorithm' },
    '1.2.840.10040.4.2': { d: 'dsa-match', c: 'ANSI X9.57 algorithm' },
    '1.2.840.10040.4.3': { d: 'dsaWithSha1', c: 'ANSI X9.57 algorithm' },
    '1.2.840.10045.1': {
        d: 'fieldType',
        c: 'ANSI X9.62. This OID is also assigned as ecdsa-with-SHA1'
    },
    '1.2.840.10045.1.1': { d: 'prime-field', c: 'ANSI X9.62 field type' },
    '1.2.840.10045.1.2': {
        d: 'characteristic-two-field',
        c: 'ANSI X9.62 field type'
    },
    '1.2.840.10045.1.2.3': {
        d: 'characteristic-two-basis',
        c: 'ANSI X9.62 field type'
    },
    '1.2.840.10045.1.2.3.1': { d: 'onBasis', c: 'ANSI X9.62 field basis' },
    '1.2.840.10045.1.2.3.2': { d: 'tpBasis', c: 'ANSI X9.62 field basis' },
    '1.2.840.10045.1.2.3.3': { d: 'ppBasis', c: 'ANSI X9.62 field basis' },
    '1.2.840.10045.2': { d: 'publicKeyType', c: 'ANSI X9.62' },
    '1.2.840.10045.2.1': { d: 'ecPublicKey', c: 'ANSI X9.62 public key type' },
    '1.2.840.10045.3.0.1': {
        d: 'c2pnb163v1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.2': {
        d: 'c2pnb163v2',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.3': {
        d: 'c2pnb163v3',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.5': {
        d: 'c2tnb191v1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.6': {
        d: 'c2tnb191v2',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.7': {
        d: 'c2tnb191v3',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.10': {
        d: 'c2pnb208w1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.11': {
        d: 'c2tnb239v1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.12': {
        d: 'c2tnb239v2',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.13': {
        d: 'c2tnb239v3',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.16': {
        d: 'c2pnb272w1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.18': {
        d: 'c2tnb359v1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.19': {
        d: 'c2pnb368w1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.0.20': {
        d: 'c2tnb431r1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.1.1': {
        d: 'prime192v1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.1.2': {
        d: 'prime192v2',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.1.3': {
        d: 'prime192v3',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.1.4': {
        d: 'prime239v1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.1.5': {
        d: 'prime239v2',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.1.6': {
        d: 'prime239v3',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.3.1.7': {
        d: 'prime256v1',
        c: 'ANSI X9.62 named elliptic curve'
    },
    '1.2.840.10045.4.1': {
        d: 'ecdsaWithSHA1',
        c: 'ANSI X9.62 ECDSA algorithm with SHA1'
    },
    '1.2.840.10045.4.2': {
        d: 'ecdsaWithRecommended',
        c: 'ANSI X9.62 ECDSA algorithm with Recommended'
    },
    '1.2.840.10045.4.3': {
        d: 'ecdsaWithSpecified',
        c: 'ANSI X9.62 ECDSA algorithm with Specified'
    },
    '1.2.840.10045.4.3.1': {
        d: 'ecdsaWithSHA224',
        c: 'ANSI X9.62 ECDSA algorithm with SHA224'
    },
    '1.2.840.10045.4.3.2': {
        d: 'ecdsaWithSHA256',
        c: 'ANSI X9.62 ECDSA algorithm with SHA256'
    },
    '1.2.840.10045.4.3.3': {
        d: 'ecdsaWithSHA384',
        c: 'ANSI X9.62 ECDSA algorithm with SHA384'
    },
    '1.2.840.10045.4.3.4': {
        d: 'ecdsaWithSHA512',
        c: 'ANSI X9.62 ECDSA algorithm with SHA512'
    },
    '1.2.840.10046.1': { d: 'fieldType', c: 'ANSI X9.42' },
    '1.2.840.10046.1.1': { d: 'gf-prime', c: 'ANSI X9.42 field type' },
    '1.2.840.10046.2': { d: 'numberType', c: 'ANSI X9.42' },
    '1.2.840.10046.2.1': { d: 'dhPublicKey', c: 'ANSI X9.42 number type' },
    '1.2.840.10046.3': { d: 'scheme', c: 'ANSI X9.42' },
    '1.2.840.10046.3.1': { d: 'dhStatic', c: 'ANSI X9.42 scheme' },
    '1.2.840.10046.3.2': { d: 'dhEphem', c: 'ANSI X9.42 scheme' },
    '1.2.840.10046.3.3': { d: 'dhHybrid1', c: 'ANSI X9.42 scheme' },
    '1.2.840.10046.3.4': { d: 'dhHybrid2', c: 'ANSI X9.42 scheme' },
    '1.2.840.10046.3.5': { d: 'mqv2', c: 'ANSI X9.42 scheme' },
    '1.2.840.10046.3.6': { d: 'mqv1', c: 'ANSI X9.42 scheme' },
    '1.2.840.10065.2.2': { d: '?', c: 'ASTM 31.20' },
    '1.2.840.10065.2.3': { d: 'healthcareLicense', c: 'ASTM 31.20' },
    '1.2.840.10065.2.3.1.1': {
        d: 'license?',
        c: 'ASTM 31.20 healthcare license type'
    },
    '1.2.840.10070': { d: 'iec62351', c: 'IEC 62351' },
    '1.2.840.10070.8': { d: 'iec62351_8', c: 'IEC 62351-8' },
    '1.2.840.10070.8.1': { d: 'iecUserRoles', c: 'IEC 62351-8' },
    '1.2.840.113533.7': { d: 'nsn', c: '' },
    '1.2.840.113533.7.65': { d: 'nsn-ce', c: '' },
    '1.2.840.113533.7.65.0': {
        d: 'entrustVersInfo',
        c: 'Nortel Secure Networks ce'
    },
    '1.2.840.113533.7.66': { d: 'nsn-alg', c: '' },
    '1.2.840.113533.7.66.3': { d: 'cast3CBC', c: 'Nortel Secure Networks alg' },
    '1.2.840.113533.7.66.10': { d: 'cast5CBC', c: 'Nortel Secure Networks alg' },
    '1.2.840.113533.7.66.11': { d: 'cast5MAC', c: 'Nortel Secure Networks alg' },
    '1.2.840.113533.7.66.12': {
        d: 'pbeWithMD5AndCAST5-CBC',
        c: 'Nortel Secure Networks alg'
    },
    '1.2.840.113533.7.66.13': {
        d: 'passwordBasedMac',
        c: 'Nortel Secure Networks alg'
    },
    '1.2.840.113533.7.67': { d: 'nsn-oc', c: '' },
    '1.2.840.113533.7.67.0': { d: 'entrustUser', c: 'Nortel Secure Networks oc' },
    '1.2.840.113533.7.68': { d: 'nsn-at', c: '' },
    '1.2.840.113533.7.68.0': {
        d: 'entrustCAInfo',
        c: 'Nortel Secure Networks at'
    },
    '1.2.840.113533.7.68.10': {
        d: 'attributeCertificate',
        c: 'Nortel Secure Networks at'
    },
    '1.2.840.113549.1.1': { d: 'pkcs-1', c: '' },
    '1.2.840.113549.1.1.1': { d: 'rsaEncryption', c: 'PKCS #1' },
    '1.2.840.113549.1.1.2': { d: 'md2WithRSAEncryption', c: 'PKCS #1' },
    '1.2.840.113549.1.1.3': { d: 'md4WithRSAEncryption', c: 'PKCS #1' },
    '1.2.840.113549.1.1.4': { d: 'md5WithRSAEncryption', c: 'PKCS #1' },
    '1.2.840.113549.1.1.5': { d: 'sha1WithRSAEncryption', c: 'PKCS #1' },
    '1.2.840.113549.1.1.7': { d: 'rsaOAEP', c: 'PKCS #1' },
    '1.2.840.113549.1.1.8': { d: 'pkcs1-MGF', c: 'PKCS #1' },
    '1.2.840.113549.1.1.9': { d: 'rsaOAEP-pSpecified', c: 'PKCS #1' },
    '1.2.840.113549.1.1.10': { d: 'rsaPSS', c: 'PKCS #1' },
    '1.2.840.113549.1.1.11': { d: 'sha256WithRSAEncryption', c: 'PKCS #1' },
    '1.2.840.113549.1.1.12': { d: 'sha384WithRSAEncryption', c: 'PKCS #1' },
    '1.2.840.113549.1.1.13': { d: 'sha512WithRSAEncryption', c: 'PKCS #1' },
    '1.2.840.113549.1.1.14': { d: 'sha224WithRSAEncryption', c: 'PKCS #1' },
    '1.2.840.113549.1.1.6': {
        d: 'rsaOAEPEncryptionSET',
        c: 'PKCS #1. This OID may also be assigned as ripemd160WithRSAEncryption'
    },
    '1.2.840.113549.1.2': { d: 'bsafeRsaEncr', c: 'Obsolete BSAFE OID', w: true },
    '1.2.840.113549.1.3': { d: 'pkcs-3', c: '' },
    '1.2.840.113549.1.3.1': { d: 'dhKeyAgreement', c: 'PKCS #3' },
    '1.2.840.113549.1.5': { d: 'pkcs-5', c: '' },
    '1.2.840.113549.1.5.1': { d: 'pbeWithMD2AndDES-CBC', c: 'PKCS #5' },
    '1.2.840.113549.1.5.3': { d: 'pbeWithMD5AndDES-CBC', c: 'PKCS #5' },
    '1.2.840.113549.1.5.4': { d: 'pbeWithMD2AndRC2-CBC', c: 'PKCS #5' },
    '1.2.840.113549.1.5.6': { d: 'pbeWithMD5AndRC2-CBC', c: 'PKCS #5' },
    '1.2.840.113549.1.5.9': {
        d: 'pbeWithMD5AndXOR',
        c: 'PKCS #5, used in BSAFE only',
        w: true
    },
    '1.2.840.113549.1.5.10': { d: 'pbeWithSHAAndDES-CBC', c: 'PKCS #5' },
    '1.2.840.113549.1.5.12': { d: 'pkcs5PBKDF2', c: 'PKCS #5 v2.0' },
    '1.2.840.113549.1.5.13': { d: 'pkcs5PBES2', c: 'PKCS #5 v2.0' },
    '1.2.840.113549.1.5.14': { d: 'pkcs5PBMAC1', c: 'PKCS #5 v2.0' },
    '1.2.840.113549.1.7': { d: 'pkcs-7', c: '' },
    '1.2.840.113549.1.7.1': { d: 'data', c: 'PKCS #7' },
    '1.2.840.113549.1.7.2': { d: 'signedData', c: 'PKCS #7' },
    '1.2.840.113549.1.7.3': { d: 'envelopedData', c: 'PKCS #7' },
    '1.2.840.113549.1.7.4': { d: 'signedAndEnvelopedData', c: 'PKCS #7' },
    '1.2.840.113549.1.7.5': { d: 'digestedData', c: 'PKCS #7' },
    '1.2.840.113549.1.7.6': { d: 'encryptedData', c: 'PKCS #7' },
    '1.2.840.113549.1.7.7': {
        d: 'dataWithAttributes',
        c: 'PKCS #7 experimental',
        w: true
    },
    '1.2.840.113549.1.7.8': {
        d: 'encryptedPrivateKeyInfo',
        c: 'PKCS #7 experimental',
        w: true
    },
    '1.2.840.113549.1.9': { d: 'pkcs-9', c: '' },
    '1.2.840.113549.1.9.1': {
        d: 'emailAddress',
        c: 'PKCS #9. Deprecated, use an altName extension instead'
    },
    '1.2.840.113549.1.9.2': { d: 'unstructuredName', c: 'PKCS #9' },
    '1.2.840.113549.1.9.3': { d: 'contentType', c: 'PKCS #9' },
    '1.2.840.113549.1.9.4': { d: 'messageDigest', c: 'PKCS #9' },
    '1.2.840.113549.1.9.5': { d: 'signingTime', c: 'PKCS #9' },
    '1.2.840.113549.1.9.6': { d: 'countersignature', c: 'PKCS #9' },
    '1.2.840.113549.1.9.7': { d: 'challengePassword', c: 'PKCS #9' },
    '1.2.840.113549.1.9.8': { d: 'unstructuredAddress', c: 'PKCS #9' },
    '1.2.840.113549.1.9.9': { d: 'extendedCertificateAttributes', c: 'PKCS #9' },
    '1.2.840.113549.1.9.10': {
        d: 'issuerAndSerialNumber',
        c: 'PKCS #9 experimental',
        w: true
    },
    '1.2.840.113549.1.9.11': {
        d: 'passwordCheck',
        c: 'PKCS #9 experimental',
        w: true
    },
    '1.2.840.113549.1.9.12': {
        d: 'publicKey',
        c: 'PKCS #9 experimental',
        w: true
    },
    '1.2.840.113549.1.9.13': { d: 'signingDescription', c: 'PKCS #9' },
    '1.2.840.113549.1.9.14': { d: 'extensionRequest', c: 'PKCS #9 via CRMF' },
    '1.2.840.113549.1.9.15': {
        d: 'sMIMECapabilities',
        c: 'PKCS #9. This OID was formerly assigned as symmetricCapabilities, then reassigned as SMIMECapabilities, then renamed to the current name'
    },
    '1.2.840.113549.1.9.15.1': { d: 'preferSignedData', c: 'sMIMECapabilities' },
    '1.2.840.113549.1.9.15.2': { d: 'canNotDecryptAny', c: 'sMIMECapabilities' },
    '1.2.840.113549.1.9.15.3': {
        d: 'receiptRequest',
        c: 'sMIMECapabilities. Deprecated, use (1 2 840 113549 1 9 16 2 1) instead',
        w: true
    },
    '1.2.840.113549.1.9.15.4': {
        d: 'receipt',
        c: 'sMIMECapabilities. Deprecated, use (1 2 840 113549 1 9 16 1 1) instead',
        w: true
    },
    '1.2.840.113549.1.9.15.5': {
        d: 'contentHints',
        c: 'sMIMECapabilities. Deprecated, use (1 2 840 113549 1 9 16 2 4) instead',
        w: true
    },
    '1.2.840.113549.1.9.15.6': {
        d: 'mlExpansionHistory',
        c: 'sMIMECapabilities. Deprecated, use (1 2 840 113549 1 9 16 2 3) instead',
        w: true
    },
    '1.2.840.113549.1.9.16': { d: 'id-sMIME', c: 'PKCS #9' },
    '1.2.840.113549.1.9.16.0': { d: 'id-mod', c: 'id-sMIME' },
    '1.2.840.113549.1.9.16.0.1': { d: 'id-mod-cms', c: 'S/MIME Modules' },
    '1.2.840.113549.1.9.16.0.2': { d: 'id-mod-ess', c: 'S/MIME Modules' },
    '1.2.840.113549.1.9.16.0.3': { d: 'id-mod-oid', c: 'S/MIME Modules' },
    '1.2.840.113549.1.9.16.0.4': { d: 'id-mod-msg-v3', c: 'S/MIME Modules' },
    '1.2.840.113549.1.9.16.0.5': {
        d: 'id-mod-ets-eSignature-88',
        c: 'S/MIME Modules'
    },
    '1.2.840.113549.1.9.16.0.6': {
        d: 'id-mod-ets-eSignature-97',
        c: 'S/MIME Modules'
    },
    '1.2.840.113549.1.9.16.0.7': {
        d: 'id-mod-ets-eSigPolicy-88',
        c: 'S/MIME Modules'
    },
    '1.2.840.113549.1.9.16.0.8': {
        d: 'id-mod-ets-eSigPolicy-88',
        c: 'S/MIME Modules'
    },
    '1.2.840.113549.1.9.16.1': { d: 'contentType', c: 'S/MIME' },
    '1.2.840.113549.1.9.16.1.0': {
        d: 'anyContentType',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.1': { d: 'receipt', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.2': { d: 'authData', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.3': { d: 'publishCert', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.4': { d: 'tSTInfo', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.5': { d: 'tDTInfo', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.6': { d: 'contentInfo', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.7': {
        d: 'dVCSRequestData',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.8': {
        d: 'dVCSResponseData',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.9': {
        d: 'compressedData',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.10': {
        d: 'scvpCertValRequest',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.11': {
        d: 'scvpCertValResponse',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.12': {
        d: 'scvpValPolRequest',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.13': {
        d: 'scvpValPolResponse',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.14': {
        d: 'attrCertEncAttrs',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.15': { d: 'tSReq', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.16': {
        d: 'firmwarePackage',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.17': {
        d: 'firmwareLoadReceipt',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.18': {
        d: 'firmwareLoadError',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.19': {
        d: 'contentCollection',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.20': {
        d: 'contentWithAttrs',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.21': {
        d: 'encKeyWithID',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.22': { d: 'encPEPSI', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.23': {
        d: 'authEnvelopedData',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.24': {
        d: 'routeOriginAttest',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.25': {
        d: 'symmetricKeyPackage',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.26': {
        d: 'rpkiManifest',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.27': {
        d: 'asciiTextWithCRLF',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.28': { d: 'xml', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.29': { d: 'pdf', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.30': { d: 'postscript', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.31': {
        d: 'timestampedData',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.32': {
        d: 'asAdjacencyAttest',
        c: 'S/MIME Content Types',
        w: true
    },
    '1.2.840.113549.1.9.16.1.33': {
        d: 'rpkiTrustAnchor',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.34': {
        d: 'trustAnchorList',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.35': {
        d: 'rpkiGhostbusters',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.36': {
        d: 'resourceTaggedAttest',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.37': {
        d: 'utf8TextWithCRLF',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.38': {
        d: 'htmlWithCRLF',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.39': { d: 'epub', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.40': {
        d: 'animaJSONVoucher',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.41': { d: 'mudType', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.42': {
        d: 'sztpConveyedInfoXML',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.43': {
        d: 'sztpConveyedInfoJSON',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.44': { d: 'cbor', c: 'S/MIME Content Types' },
    '1.2.840.113549.1.9.16.1.45': {
        d: 'cborSequence',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.1.46': {
        d: 'animaCBORVoucher',
        c: 'S/MIME Content Types',
        w: true
    },
    '1.2.840.113549.1.9.16.1.47': {
        d: 'geofeedCSVwithCRLF',
        c: 'S/MIME Content Types'
    },
    '1.2.840.113549.1.9.16.2': { d: 'authenticatedAttributes', c: 'S/MIME' },
    '1.2.840.113549.1.9.16.2.1': {
        d: 'receiptRequest',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.2': {
        d: 'securityLabel',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.3': {
        d: 'mlExpandHistory',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.4': {
        d: 'contentHint',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.5': {
        d: 'msgSigDigest',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.6': {
        d: 'encapContentType',
        c: 'S/MIME Authenticated Attributes.  Obsolete',
        w: true
    },
    '1.2.840.113549.1.9.16.2.7': {
        d: 'contentIdentifier',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.8': {
        d: 'macValue',
        c: 'S/MIME Authenticated Attributes.  Obsolete',
        w: true
    },
    '1.2.840.113549.1.9.16.2.9': {
        d: 'equivalentLabels',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.10': {
        d: 'contentReference',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.11': {
        d: 'encrypKeyPref',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.12': {
        d: 'signingCertificate',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.13': {
        d: 'smimeEncryptCerts',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.14': {
        d: 'timeStampToken',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.15': {
        d: 'sigPolicyId',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.16': {
        d: 'commitmentType',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.17': {
        d: 'signerLocation',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.18': {
        d: 'signerAttr',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.19': {
        d: 'otherSigCert',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.20': {
        d: 'contentTimestamp',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.21': {
        d: 'certificateRefs',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.22': {
        d: 'revocationRefs',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.23': {
        d: 'certValues',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.24': {
        d: 'revocationValues',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.25': {
        d: 'escTimeStamp',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.26': {
        d: 'certCRLTimestamp',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.27': {
        d: 'archiveTimeStamp',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.28': {
        d: 'signatureType',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.29': {
        d: 'dvcsDvc',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.30': {
        d: 'cekReference',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.31': {
        d: 'maxCEKDecrypts',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.32': {
        d: 'kekDerivationAlg',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.33': {
        d: 'intendedRecipients',
        c: 'S/MIME Authenticated Attributes.  Obsolete',
        w: true
    },
    '1.2.840.113549.1.9.16.2.34': {
        d: 'cmcUnsignedData',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.35': {
        d: 'fwPackageID',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.36': {
        d: 'fwTargetHardwareIDs',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.37': {
        d: 'fwDecryptKeyID',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.38': {
        d: 'fwImplCryptAlgs',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.39': {
        d: 'fwWrappedFirmwareKey',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.40': {
        d: 'fwCommunityIdentifiers',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.41': {
        d: 'fwPkgMessageDigest',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.42': {
        d: 'fwPackageInfo',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.43': {
        d: 'fwImplCompressAlgs',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.44': {
        d: 'etsAttrCertificateRefs',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.45': {
        d: 'etsAttrRevocationRefs',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.46': {
        d: 'binarySigningTime',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.47': {
        d: 'signingCertificateV2',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.48': {
        d: 'etsArchiveTimeStampV2',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.49': {
        d: 'erInternal',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.50': {
        d: 'erExternal',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.51': {
        d: 'multipleSignatures',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.52': {
        d: 'cmsAlgorithmProtect',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.53': {
        d: 'setKeyInformation',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.54': {
        d: 'asymmDecryptKeyID',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.55': {
        d: 'secureHeaderFieldsIdentifier',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.56': {
        d: 'otpChallenge',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.57': {
        d: 'revocationChallenge',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.2.58': {
        d: 'estIdentityLinking',
        c: 'S/MIME Authenticated Attributes'
    },
    '1.2.840.113549.1.9.16.3.1': {
        d: 'esDHwith3DES',
        c: 'S/MIME Algorithms. Obsolete',
        w: true
    },
    '1.2.840.113549.1.9.16.3.2': {
        d: 'esDHwithRC2',
        c: 'S/MIME Algorithms. Obsolete',
        w: true
    },
    '1.2.840.113549.1.9.16.3.3': {
        d: '3desWrap',
        c: 'S/MIME Algorithms. Obsolete',
        w: true
    },
    '1.2.840.113549.1.9.16.3.4': {
        d: 'rc2Wrap',
        c: 'S/MIME Algorithms. Obsolete',
        w: true
    },
    '1.2.840.113549.1.9.16.3.5': { d: 'esDH', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.6': { d: 'cms3DESwrap', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.7': { d: 'cmsRC2wrap', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.8': { d: 'zlib', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.9': { d: 'pwriKEK', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.10': { d: 'ssDH', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.11': {
        d: 'hmacWith3DESwrap',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.12': {
        d: 'hmacWithAESwrap',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.13': {
        d: 'md5XorExperiment',
        c: 'S/MIME Algorithms.  Experimental',
        w: true
    },
    '1.2.840.113549.1.9.16.3.14': { d: 'rsaKEM', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.15': { d: 'authEnc128', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.16': { d: 'authEnc256', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.17': { d: 'hssLmsHashSig', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.18': {
        d: 'chaCha20Poly1305',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.19': {
        d: 'ecdhHKDF-SHA256',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.20': {
        d: 'ecdhHKDF-SHA384',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.21': {
        d: 'ecdhHKDF-SHA512',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.22': {
        d: 'aesSIV-CMAC-256',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.23': {
        d: 'aesSIV-CMAC-384',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.24': {
        d: 'aesSIV-CMAC-512',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.25': {
        d: 'aesSIV-CMAC-wrap256',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.26': {
        d: 'aesSIV-CMAC-wrap384',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.27': {
        d: 'aesSIV-CMAC-wrap512',
        c: 'S/MIME Algorithms'
    },
    '1.2.840.113549.1.9.16.3.28': { d: 'hkdfWithSha256', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.29': { d: 'hkdfWithSha384', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.3.30': { d: 'hkdfWithSha512', c: 'S/MIME Algorithms' },
    '1.2.840.113549.1.9.16.4.1': {
        d: 'certDist-ldap',
        c: 'S/MIME Certificate Distribution'
    },
    '1.2.840.113549.1.9.16.5.1': {
        d: 'sigPolicyQualifier-spuri x',
        c: 'S/MIME Signature Policy Qualifiers'
    },
    '1.2.840.113549.1.9.16.5.2': {
        d: 'sigPolicyQualifier-spUserNotice',
        c: 'S/MIME Signature Policy Qualifiers'
    },
    '1.2.840.113549.1.9.16.6.1': {
        d: 'proofOfOrigin',
        c: 'S/MIME Commitment Type Identifiers'
    },
    '1.2.840.113549.1.9.16.6.2': {
        d: 'proofOfReceipt',
        c: 'S/MIME Commitment Type Identifiers'
    },
    '1.2.840.113549.1.9.16.6.3': {
        d: 'proofOfDelivery',
        c: 'S/MIME Commitment Type Identifiers'
    },
    '1.2.840.113549.1.9.16.6.4': {
        d: 'proofOfSender',
        c: 'S/MIME Commitment Type Identifiers'
    },
    '1.2.840.113549.1.9.16.6.5': {
        d: 'proofOfApproval',
        c: 'S/MIME Commitment Type Identifiers'
    },
    '1.2.840.113549.1.9.16.6.6': {
        d: 'proofOfCreation',
        c: 'S/MIME Commitment Type Identifiers'
    },
    '1.2.840.113549.1.9.16.7.1': {
        d: 'testAmoco',
        c: 'S/MIMETest Security Policies'
    },
    '1.2.840.113549.1.9.16.7.2': {
        d: 'testCaterpillar',
        c: 'S/MIMETest Security Policies'
    },
    '1.2.840.113549.1.9.16.7.3': {
        d: 'testWhirlpool',
        c: 'S/MIMETest Security Policies'
    },
    '1.2.840.113549.1.9.16.7.4': {
        d: 'testWhirlpoolCategories',
        c: 'S/MIMETest Security Policies'
    },
    '1.2.840.113549.1.9.16.8.1': {
        d: 'glUseKEK',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.2': {
        d: 'glDelete',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.3': {
        d: 'glAddMember',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.4': {
        d: 'glDeleteMember',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.5': {
        d: 'glRekey',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.6': {
        d: 'glAddOwner',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.7': {
        d: 'glRemoveOwner',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.8': {
        d: 'glkCompromise',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.9': {
        d: 'glkRefresh',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.10': {
        d: 'glFailInfo',
        c: 'S/MIME Symmetric Key Distribution Attributes.  Obsolete',
        w: true
    },
    '1.2.840.113549.1.9.16.8.11': {
        d: 'glaQueryRequest',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.12': {
        d: 'glaQueryResponse',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.13': {
        d: 'glProvideCert',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.14': {
        d: 'glUpdateCert',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.8.15': {
        d: 'glKey',
        c: 'S/MIME Symmetric Key Distribution Attributes'
    },
    '1.2.840.113549.1.9.16.9': { d: 'signatureTypeIdentifier', c: 'S/MIME' },
    '1.2.840.113549.1.9.16.9.1': {
        d: 'originatorSig',
        c: 'S/MIME Signature Type Identifier'
    },
    '1.2.840.113549.1.9.16.9.2': {
        d: 'domainSig',
        c: 'S/MIME Signature Type Identifier'
    },
    '1.2.840.113549.1.9.16.9.3': {
        d: 'additionalAttributesSig',
        c: 'S/MIME Signature Type Identifier'
    },
    '1.2.840.113549.1.9.16.9.4': {
        d: 'reviewSig',
        c: 'S/MIME Signature Type Identifier'
    },
    '1.2.840.113549.1.9.16.10.1': {
        d: 'envelopedData',
        c: 'S/MIME X.400 Encoded Information Types'
    },
    '1.2.840.113549.1.9.16.10.2': {
        d: 'signedData',
        c: 'S/MIME X.400 Encoded Information Types'
    },
    '1.2.840.113549.1.9.16.10.3': {
        d: 'certsOnly',
        c: 'S/MIME X.400 Encoded Information Types'
    },
    '1.2.840.113549.1.9.16.10.4': {
        d: 'signedReceipt',
        c: 'S/MIME X.400 Encoded Information Types'
    },
    '1.2.840.113549.1.9.16.10.5': {
        d: 'envelopedX400',
        c: 'S/MIME X.400 Encoded Information Types'
    },
    '1.2.840.113549.1.9.16.10.6': {
        d: 'signedX400',
        c: 'S/MIME X.400 Encoded Information Types'
    },
    '1.2.840.113549.1.9.16.10.7': {
        d: 'compressedData',
        c: 'S/MIME X.400 Encoded Information Types'
    },
    '1.2.840.113549.1.9.16.11': { d: 'capabilities', c: 'S/MIME' },
    '1.2.840.113549.1.9.16.11.1': {
        d: 'preferBinaryInside',
        c: 'S/MIME Capability'
    },
    '1.2.840.113549.1.9.16.12': {
        d: 'pskcAttributes',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.1': {
        d: 'pskcManufacturer',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.2': {
        d: 'pskcSerialNo',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.3': {
        d: 'pskcModel',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.4': {
        d: 'pskcIssueno',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.5': {
        d: 'pskcDevicebinding',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.6': {
        d: 'pskcDevicestartdate',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.7': {
        d: 'pskcDeviceexpirydate',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.8': {
        d: 'pskcModuleid',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.9': {
        d: 'pskcKeyid',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.10': {
        d: 'pskcAlgorithm',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.11': {
        d: 'pskcIssuer',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.12': {
        d: 'pskcKeyprofileid',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.13': {
        d: 'pskcKeyreference',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.14': {
        d: 'pskcFriendlyname',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.15': {
        d: 'pskcAlgorithmparams',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.16': {
        d: 'pskcCounter',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.17': {
        d: 'pskcTime',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.18': {
        d: 'pskcTimeinterval',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.19': {
        d: 'pskcTimedrift',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.20': {
        d: 'pskcValuemac',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.21': {
        d: 'pskcKeystartdate',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.22': {
        d: 'pskcKeyexpirydate',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.23': {
        d: 'pskcNooftransactions',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.24': {
        d: 'pskcKeyusages',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.25': {
        d: 'pskcPinpolicy',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.26': {
        d: 'pskcDeviceuserid',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.12.27': {
        d: 'pskcKeyuserid',
        c: 'S/MIME Portable Symmetric Key Container Attributes'
    },
    '1.2.840.113549.1.9.16.13': {
        d: 'otherRecipientInfoIds',
        c: 'S/MIME Other Recipient Info Identifiers'
    },
    '1.2.840.113549.1.9.16.13.1': {
        d: 'keyTransPSK',
        c: 'S/MIME Other Recipient Info Identifiers'
    },
    '1.2.840.113549.1.9.16.13.2': {
        d: 'keyAgreePSK',
        c: 'S/MIME Other Recipient Info Identifiers'
    },
    '1.2.840.113549.1.9.20': {
        d: 'friendlyName (for PKCS #12)',
        c: 'PKCS #9 via PKCS #12'
    },
    '1.2.840.113549.1.9.21': {
        d: 'localKeyID (for PKCS #12)',
        c: 'PKCS #9 via PKCS #12'
    },
    '1.2.840.113549.1.9.22': {
        d: 'certTypes (for PKCS #12)',
        c: 'PKCS #9 via PKCS #12'
    },
    '1.2.840.113549.1.9.22.1': {
        d: 'x509Certificate (for PKCS #12)',
        c: 'PKCS #9 via PKCS #12'
    },
    '1.2.840.113549.1.9.22.2': {
        d: 'sdsiCertificate (for PKCS #12)',
        c: 'PKCS #9 via PKCS #12'
    },
    '1.2.840.113549.1.9.23': {
        d: 'crlTypes (for PKCS #12)',
        c: 'PKCS #9 via PKCS #12'
    },
    '1.2.840.113549.1.9.23.1': {
        d: 'x509Crl (for PKCS #12)',
        c: 'PKCS #9 via PKCS #12'
    },
    '1.2.840.113549.1.9.24': { d: 'pkcs9objectClass', c: 'PKCS #9/RFC 2985' },
    '1.2.840.113549.1.9.25': { d: 'pkcs9attributes', c: 'PKCS #9/RFC 2985' },
    '1.2.840.113549.1.9.25.1': {
        d: 'pkcs15Token',
        c: 'PKCS #9/RFC 2985 attribute'
    },
    '1.2.840.113549.1.9.25.2': {
        d: 'encryptedPrivateKeyInfo',
        c: 'PKCS #9/RFC 2985 attribute'
    },
    '1.2.840.113549.1.9.25.3': {
        d: 'randomNonce',
        c: 'PKCS #9/RFC 2985 attribute'
    },
    '1.2.840.113549.1.9.25.4': {
        d: 'sequenceNumber',
        c: 'PKCS #9/RFC 2985 attribute'
    },
    '1.2.840.113549.1.9.25.5': { d: 'pkcs7PDU', c: 'PKCS #9/RFC 2985 attribute' },
    '1.2.840.113549.1.9.26': { d: 'pkcs9syntax', c: 'PKCS #9/RFC 2985' },
    '1.2.840.113549.1.9.27': { d: 'pkcs9matchingRules', c: 'PKCS #9/RFC 2985' },
    '1.2.840.113549.1.9.52': { d: 'cmsAlgorithmProtection', c: 'RFC 6211' },
    '1.2.840.113549.1.12': { d: 'pkcs-12', c: '' },
    '1.2.840.113549.1.12.1': {
        d: 'pkcs-12-PbeIds',
        c: 'This OID was formerly assigned as PKCS #12 modeID'
    },
    '1.2.840.113549.1.12.1.1': {
        d: 'pbeWithSHAAnd128BitRC4',
        c: 'PKCS #12 PbeIds. This OID was formerly assigned as pkcs-12-OfflineTransportMode'
    },
    '1.2.840.113549.1.12.1.2': {
        d: 'pbeWithSHAAnd40BitRC4',
        c: 'PKCS #12 PbeIds. This OID was formerly assigned as pkcs-12-OnlineTransportMode'
    },
    '1.2.840.113549.1.12.1.3': {
        d: 'pbeWithSHAAnd3-KeyTripleDES-CBC',
        c: 'PKCS #12 PbeIds'
    },
    '1.2.840.113549.1.12.1.4': {
        d: 'pbeWithSHAAnd2-KeyTripleDES-CBC',
        c: 'PKCS #12 PbeIds'
    },
    '1.2.840.113549.1.12.1.5': {
        d: 'pbeWithSHAAnd128BitRC2-CBC',
        c: 'PKCS #12 PbeIds'
    },
    '1.2.840.113549.1.12.1.6': {
        d: 'pbeWithSHAAnd40BitRC2-CBC',
        c: 'PKCS #12 PbeIds'
    },
    '1.2.840.113549.1.12.2': { d: 'pkcs-12-ESPVKID', c: 'Deprecated', w: true },
    '1.2.840.113549.1.12.2.1': {
        d: 'pkcs-12-PKCS8KeyShrouding',
        c: 'PKCS #12 ESPVKID. Deprecated, use (1 2 840 113549 1 12 3 5) instead',
        w: true
    },
    '1.2.840.113549.1.12.3': { d: 'pkcs-12-BagIds', c: '' },
    '1.2.840.113549.1.12.3.1': { d: 'pkcs-12-keyBagId', c: 'PKCS #12 BagIds' },
    '1.2.840.113549.1.12.3.2': {
        d: 'pkcs-12-certAndCRLBagId',
        c: 'PKCS #12 BagIds'
    },
    '1.2.840.113549.1.12.3.3': { d: 'pkcs-12-secretBagId', c: 'PKCS #12 BagIds' },
    '1.2.840.113549.1.12.3.4': {
        d: 'pkcs-12-safeContentsId',
        c: 'PKCS #12 BagIds'
    },
    '1.2.840.113549.1.12.3.5': {
        d: 'pkcs-12-pkcs-8ShroudedKeyBagId',
        c: 'PKCS #12 BagIds'
    },
    '1.2.840.113549.1.12.4': { d: 'pkcs-12-CertBagID', c: 'Deprecated', w: true },
    '1.2.840.113549.1.12.4.1': {
        d: 'pkcs-12-X509CertCRLBagID',
        c: 'PKCS #12 CertBagID. This OID was formerly assigned as pkcs-12-X509CertCRLBag'
    },
    '1.2.840.113549.1.12.4.2': {
        d: 'pkcs-12-SDSICertBagID',
        c: 'PKCS #12 CertBagID. This OID was formerly assigned as pkcs-12-SDSICertBag'
    },
    '1.2.840.113549.1.12.5': { d: 'pkcs-12-OID', c: '', w: true },
    '1.2.840.113549.1.12.5.1': {
        d: 'pkcs-12-PBEID',
        c: 'PKCS #12 OID. Deprecated, use the partially compatible (1 2 840 113549 1 12 1) OIDs instead',
        w: true
    },
    '1.2.840.113549.1.12.5.1.1': {
        d: 'pkcs-12-PBEWithSha1And128BitRC4',
        c: 'PKCS #12 OID PBEID. Deprecated, use (1 2 840 113549 1 12 1 1) instead',
        w: true
    },
    '1.2.840.113549.1.12.5.1.2': {
        d: 'pkcs-12-PBEWithSha1And40BitRC4',
        c: 'PKCS #12 OID PBEID. Deprecated, use (1 2 840 113549 1 12 1 2) instead',
        w: true
    },
    '1.2.840.113549.1.12.5.1.3': {
        d: 'pkcs-12-PBEWithSha1AndTripleDESCBC',
        c: 'PKCS #12 OID PBEID. Deprecated, use the incompatible but similar (1 2 840 113549 1 12 1 3) or (1 2 840 113549 1 12 1 4) instead',
        w: true
    },
    '1.2.840.113549.1.12.5.1.4': {
        d: 'pkcs-12-PBEWithSha1And128BitRC2CBC',
        c: 'PKCS #12 OID PBEID. Deprecated, use (1 2 840 113549 1 12 1 5) instead',
        w: true
    },
    '1.2.840.113549.1.12.5.1.5': {
        d: 'pkcs-12-PBEWithSha1And40BitRC2CBC',
        c: 'PKCS #12 OID PBEID. Deprecated, use (1 2 840 113549 1 12 1 6) instead',
        w: true
    },
    '1.2.840.113549.1.12.5.1.6': {
        d: 'pkcs-12-PBEWithSha1AndRC4',
        c: 'PKCS #12 OID PBEID. Deprecated, use the incompatible but similar (1 2 840 113549 1 12 1 1) or (1 2 840 113549 1 12 1 2) instead',
        w: true
    },
    '1.2.840.113549.1.12.5.1.7': {
        d: 'pkcs-12-PBEWithSha1AndRC2CBC',
        c: 'PKCS #12 OID PBEID. Deprecated, use the incompatible but similar (1 2 840 113549 1 12 1 5) or (1 2 840 113549 1 12 1 6) instead',
        w: true
    },
    '1.2.840.113549.1.12.5.2': {
        d: 'pkcs-12-EnvelopingID',
        c: 'PKCS #12 OID. Deprecated, use the conventional PKCS #1 OIDs instead'
    },
    '1.2.840.113549.1.12.5.2.1': {
        d: 'pkcs-12-RSAEncryptionWith128BitRC4',
        c: 'PKCS #12 OID EnvelopingID. Deprecated, use the conventional PKCS #1 OIDs instead',
        w: true
    },
    '1.2.840.113549.1.12.5.2.2': {
        d: 'pkcs-12-RSAEncryptionWith40BitRC4',
        c: 'PKCS #12 OID EnvelopingID. Deprecated, use the conventional PKCS #1 OIDs instead',
        w: true
    },
    '1.2.840.113549.1.12.5.2.3': {
        d: 'pkcs-12-RSAEncryptionWithTripleDES',
        c: 'PKCS #12 OID EnvelopingID. Deprecated, use the conventional PKCS #1 OIDs instead',
        w: true
    },
    '1.2.840.113549.1.12.5.3': {
        d: 'pkcs-12-SignatureID',
        c: 'PKCS #12 OID EnvelopingID. Deprecated, use the conventional PKCS #1 OIDs instead',
        w: true
    },
    '1.2.840.113549.1.12.5.3.1': {
        d: 'pkcs-12-RSASignatureWithSHA1Digest',
        c: 'PKCS #12 OID SignatureID. Deprecated, use the conventional PKCS #1 OIDs instead',
        w: true
    },
    '1.2.840.113549.1.12.10': { d: 'pkcs-12Version1', c: '' },
    '1.2.840.113549.1.12.10.1': { d: 'pkcs-12BadIds', c: '' },
    '1.2.840.113549.1.12.10.1.1': { d: 'pkcs-12-keyBag', c: 'PKCS #12 BagIds' },
    '1.2.840.113549.1.12.10.1.2': {
        d: 'pkcs-12-pkcs-8ShroudedKeyBag',
        c: 'PKCS #12 BagIds'
    },
    '1.2.840.113549.1.12.10.1.3': { d: 'pkcs-12-certBag', c: 'PKCS #12 BagIds' },
    '1.2.840.113549.1.12.10.1.4': { d: 'pkcs-12-crlBag', c: 'PKCS #12 BagIds' },
    '1.2.840.113549.1.12.10.1.5': {
        d: 'pkcs-12-secretBag',
        c: 'PKCS #12 BagIds'
    },
    '1.2.840.113549.1.12.10.1.6': {
        d: 'pkcs-12-safeContentsBag',
        c: 'PKCS #12 BagIds'
    },
    '1.2.840.113549.1.15.1': { d: 'pkcs15modules', c: 'PKCS #15' },
    '1.2.840.113549.1.15.2': { d: 'pkcs15attributes', c: 'PKCS #15' },
    '1.2.840.113549.1.15.3': { d: 'pkcs15contentType', c: 'PKCS #15' },
    '1.2.840.113549.1.15.3.1': { d: 'pkcs15content', c: 'PKCS #15 content type' },
    '1.2.840.113549.2': { d: 'digestAlgorithm', c: '' },
    '1.2.840.113549.2.2': { d: 'md2', c: 'RSADSI digestAlgorithm' },
    '1.2.840.113549.2.4': { d: 'md4', c: 'RSADSI digestAlgorithm' },
    '1.2.840.113549.2.5': { d: 'md5', c: 'RSADSI digestAlgorithm' },
    '1.2.840.113549.2.7': { d: 'hmacWithSHA1', c: 'RSADSI digestAlgorithm' },
    '1.2.840.113549.2.8': { d: 'hmacWithSHA224', c: 'RSADSI digestAlgorithm' },
    '1.2.840.113549.2.9': { d: 'hmacWithSHA256', c: 'RSADSI digestAlgorithm' },
    '1.2.840.113549.2.10': { d: 'hmacWithSHA384', c: 'RSADSI digestAlgorithm' },
    '1.2.840.113549.2.11': { d: 'hmacWithSHA512', c: 'RSADSI digestAlgorithm' },
    '1.2.840.113549.3': { d: 'encryptionAlgorithm', c: '' },
    '1.2.840.113549.3.2': { d: 'rc2CBC', c: 'RSADSI encryptionAlgorithm' },
    '1.2.840.113549.3.3': { d: 'rc2ECB', c: 'RSADSI encryptionAlgorithm' },
    '1.2.840.113549.3.4': { d: 'rc4', c: 'RSADSI encryptionAlgorithm' },
    '1.2.840.113549.3.5': { d: 'rc4WithMAC', c: 'RSADSI encryptionAlgorithm' },
    '1.2.840.113549.3.6': { d: 'desx-CBC', c: 'RSADSI encryptionAlgorithm' },
    '1.2.840.113549.3.7': { d: 'des-EDE3-CBC', c: 'RSADSI encryptionAlgorithm' },
    '1.2.840.113549.3.8': { d: 'rc5CBC', c: 'RSADSI encryptionAlgorithm' },
    '1.2.840.113549.3.9': { d: 'rc5-CBCPad', c: 'RSADSI encryptionAlgorithm' },
    '1.2.840.113549.3.10': {
        d: 'desCDMF',
        c: 'RSADSI encryptionAlgorithm. Formerly called CDMFCBCPad'
    },
    '1.2.840.114021.1.6.1': {
        d: 'Identrus unknown policyIdentifier',
        c: 'Identrus'
    },
    '1.2.840.114021.4.1': { d: 'identrusOCSP', c: 'Identrus' },
    '1.2.840.113556.1.2.241': {
        d: 'deliveryMechanism',
        c: 'Microsoft Exchange Server - attribute'
    },
    '1.2.840.113556.1.2.281': {
        d: 'ntSecurityDescriptor',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.3.0': {
        d: 'site-Addressing',
        c: 'Microsoft Exchange Server - object class'
    },
    '1.2.840.113556.1.3.13': {
        d: 'classSchema',
        c: 'Microsoft Exchange Server - object class'
    },
    '1.2.840.113556.1.3.14': {
        d: 'attributeSchema',
        c: 'Microsoft Exchange Server - object class'
    },
    '1.2.840.113556.1.3.17': {
        d: 'mailbox-Agent',
        c: 'Microsoft Exchange Server - object class'
    },
    '1.2.840.113556.1.3.22': {
        d: 'mailbox',
        c: 'Microsoft Exchange Server - object class'
    },
    '1.2.840.113556.1.3.23': {
        d: 'container',
        c: 'Microsoft Exchange Server - object class'
    },
    '1.2.840.113556.1.3.46': {
        d: 'mailRecipient',
        c: 'Microsoft Exchange Server - object class'
    },
    '1.2.840.113556.1.4.145': {
        d: 'revision',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1327': {
        d: 'pKIDefaultKeySpec',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1328': {
        d: 'pKIKeyUsage',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1329': {
        d: 'pKIMaxIssuingDepth',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1330': {
        d: 'pKICriticalExtensions',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1331': {
        d: 'pKIExpirationPeriod',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1332': {
        d: 'pKIOverlapPeriod',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1333': {
        d: 'pKIExtendedKeyUsage',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1334': {
        d: 'pKIDefaultCSPs',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1335': {
        d: 'pKIEnrollmentAccess',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1429': {
        d: 'msPKI-RA-Signature',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1430': {
        d: 'msPKI-Enrollment-Flag',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1431': {
        d: 'msPKI-Private-Key-Flag',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1432': {
        d: 'msPKI-Certificate-Name-Flag',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1433': {
        d: 'msPKI-Minimal-Key-Size',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1434': {
        d: 'msPKI-Template-Schema-Version',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1435': {
        d: 'msPKI-Template-Minor-Revision',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1436': {
        d: 'msPKI-Cert-Template-OID',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1437': {
        d: 'msPKI-Supersede-Templates',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1438': {
        d: 'msPKI-RA-Policies',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1439': {
        d: 'msPKI-Certificate-Policy',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1674': {
        d: 'msPKI-Certificate-Application-Policy',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.1.4.1675': {
        d: 'msPKI-RA-Application-Policies',
        c: 'Microsoft Cert Template - attribute'
    },
    '1.2.840.113556.4.3': { d: 'microsoftExcel', c: 'Microsoft' },
    '1.2.840.113556.4.4': { d: 'titledWithOID', c: 'Microsoft' },
    '1.2.840.113556.4.5': { d: 'microsoftPowerPoint', c: 'Microsoft' },
    '1.2.840.113583.1': { d: 'adobeAcrobat', c: 'Adobe Acrobat' },
    '1.2.840.113583.1.1': { d: 'acrobatSecurity', c: 'Adobe Acrobat security' },
    '1.2.840.113583.1.1.1': { d: 'pdfPassword', c: 'Adobe Acrobat security' },
    '1.2.840.113583.1.1.2': {
        d: 'pdfDefaultSigningCredential',
        c: 'Adobe Acrobat security'
    },
    '1.2.840.113583.1.1.3': {
        d: 'pdfDefaultEncryptionCredential',
        c: 'Adobe Acrobat security'
    },
    '1.2.840.113583.1.1.4': {
        d: 'pdfPasswordTimeout',
        c: 'Adobe Acrobat security'
    },
    '1.2.840.113583.1.1.5': {
        d: 'pdfAuthenticDocumentsTrust',
        c: 'Adobe Acrobat security'
    },
    '1.2.840.113583.1.1.6': {
        d: 'pdfDynamicContentTrust',
        c: 'Adobe Acrobat security',
        w: true
    },
    '1.2.840.113583.1.1.7': {
        d: 'pdfUbiquityTrust',
        c: 'Adobe Acrobat security'
    },
    '1.2.840.113583.1.1.8': {
        d: 'pdfRevocationInfoArchival',
        c: 'Adobe Acrobat security'
    },
    '1.2.840.113583.1.1.9': {
        d: 'pdfX509Extension',
        c: 'Adobe Acrobat security'
    },
    '1.2.840.113583.1.1.9.1': { d: 'pdfTimeStamp', c: 'Adobe Acrobat security' },
    '1.2.840.113583.1.1.9.2': {
        d: 'pdfArchiveRevInfo',
        c: 'Adobe Acrobat security'
    },
    '1.2.840.113583.1.1.10': {
        d: 'pdfPPLKLiteCredential',
        c: 'Adobe Acrobat security'
    },
    '1.2.840.113583.1.2': { d: 'acrobatCPS', c: 'Adobe Acrobat CPS' },
    '1.2.840.113583.1.2.1': {
        d: 'pdfAuthenticDocumentsCPS',
        c: 'Adobe Acrobat CPS'
    },
    '1.2.840.113583.1.2.2': { d: 'pdfTestCPS', c: 'Adobe Acrobat CPS' },
    '1.2.840.113583.1.2.3': { d: 'pdfUbiquityCPS', c: 'Adobe Acrobat CPS' },
    '1.2.840.113583.1.2.4': { d: 'pdfAdhocCPS', c: 'Adobe Acrobat CPS' },
    '1.2.840.113583.1.7': { d: 'acrobatUbiquity', c: 'Adobe Acrobat ubiquity' },
    '1.2.840.113583.1.7.1': {
        d: 'pdfUbiquitySubRights',
        c: 'Adobe Acrobat ubiquity'
    },
    '1.2.840.113583.1.9': {
        d: 'acrobatExtension',
        c: 'Adobe Acrobat X.509 extension'
    },
    '1.2.840.113628.114.1.7': { d: 'adobePKCS7', c: 'Adobe' },
    '1.2.840.113635.100': { d: 'appleDataSecurity', c: 'Apple' },
    '1.2.840.113635.100.1': { d: 'appleTrustPolicy', c: 'Apple' },
    '1.2.840.113635.100.1.1': { d: 'appleISignTP', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.2': { d: 'appleX509Basic', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.3': { d: 'appleSSLPolicy', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.4': {
        d: 'appleLocalCertGenPolicy',
        c: 'Apple trust policy'
    },
    '1.2.840.113635.100.1.5': { d: 'appleCSRGenPolicy', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.6': { d: 'appleCRLPolicy', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.7': { d: 'appleOCSPPolicy', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.8': { d: 'appleSMIMEPolicy', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.9': { d: 'appleEAPPolicy', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.10': {
        d: 'appleSWUpdateSigningPolicy',
        c: 'Apple trust policy'
    },
    '1.2.840.113635.100.1.11': { d: 'appleIPSecPolicy', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.12': { d: 'appleIChatPolicy', c: 'Apple trust policy' },
    '1.2.840.113635.100.1.13': {
        d: 'appleResourceSignPolicy',
        c: 'Apple trust policy'
    },
    '1.2.840.113635.100.1.14': {
        d: 'applePKINITClientPolicy',
        c: 'Apple trust policy'
    },
    '1.2.840.113635.100.1.15': {
        d: 'applePKINITServerPolicy',
        c: 'Apple trust policy'
    },
    '1.2.840.113635.100.1.16': {
        d: 'appleCodeSigningPolicy',
        c: 'Apple trust policy'
    },
    '1.2.840.113635.100.1.17': {
        d: 'applePackageSigningPolicy',
        c: 'Apple trust policy'
    },
    '1.2.840.113635.100.2': { d: 'appleSecurityAlgorithm', c: 'Apple' },
    '1.2.840.113635.100.2.1': { d: 'appleFEE', c: 'Apple security algorithm' },
    '1.2.840.113635.100.2.2': { d: 'appleASC', c: 'Apple security algorithm' },
    '1.2.840.113635.100.2.3': {
        d: 'appleFEE_MD5',
        c: 'Apple security algorithm'
    },
    '1.2.840.113635.100.2.4': {
        d: 'appleFEE_SHA1',
        c: 'Apple security algorithm'
    },
    '1.2.840.113635.100.2.5': { d: 'appleFEED', c: 'Apple security algorithm' },
    '1.2.840.113635.100.2.6': {
        d: 'appleFEEDEXP',
        c: 'Apple security algorithm'
    },
    '1.2.840.113635.100.2.7': { d: 'appleECDSA', c: 'Apple security algorithm' },
    '1.2.840.113635.100.3': { d: 'appleDotMacCertificate', c: 'Apple' },
    '1.2.840.113635.100.3.1': {
        d: 'appleDotMacCertificateRequest',
        c: 'Apple dotMac certificate'
    },
    '1.2.840.113635.100.3.2': {
        d: 'appleDotMacCertificateExtension',
        c: 'Apple dotMac certificate'
    },
    '1.2.840.113635.100.3.3': {
        d: 'appleDotMacCertificateRequestValues',
        c: 'Apple dotMac certificate'
    },
    '1.2.840.113635.100.4': { d: 'appleExtendedKeyUsage', c: 'Apple' },
    '1.2.840.113635.100.4.1': {
        d: 'appleCodeSigning',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.1.1': {
        d: 'appleCodeSigningDevelopment',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.1.2': {
        d: 'appleSoftwareUpdateSigning',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.1.3': {
        d: 'appleCodeSigningThirdParty',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.1.4': {
        d: 'appleResourceSigning',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.2': {
        d: 'appleIChatSigning',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.3': {
        d: 'appleIChatEncryption',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.4': {
        d: 'appleSystemIdentity',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.5': {
        d: 'appleCryptoEnv',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.5.1': {
        d: 'appleCryptoProductionEnv',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.5.2': {
        d: 'appleCryptoMaintenanceEnv',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.5.3': {
        d: 'appleCryptoTestEnv',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.5.4': {
        d: 'appleCryptoDevelopmentEnv',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.6': {
        d: 'appleCryptoQoS',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.6.1': {
        d: 'appleCryptoTier0QoS',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.6.2': {
        d: 'appleCryptoTier1QoS',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.6.3': {
        d: 'appleCryptoTier2QoS',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.4.6.4': {
        d: 'appleCryptoTier3QoS',
        c: 'Apple extended key usage'
    },
    '1.2.840.113635.100.5': { d: 'appleCertificatePolicies', c: 'Apple' },
    '1.2.840.113635.100.5.1': { d: 'appleCertificatePolicyID', c: 'Apple' },
    '1.2.840.113635.100.5.2': { d: 'appleDotMacCertificatePolicyID', c: 'Apple' },
    '1.2.840.113635.100.5.3': { d: 'appleADCCertificatePolicyID', c: 'Apple' },
    '1.2.840.113635.100.6': { d: 'appleCertificateExtensions', c: 'Apple' },
    '1.2.840.113635.100.6.1': {
        d: 'appleCertificateExtensionCodeSigning',
        c: 'Apple certificate extension'
    },
    '1.2.840.113635.100.6.1.1': {
        d: 'appleCertificateExtensionAppleSigning',
        c: 'Apple certificate extension'
    },
    '1.2.840.113635.100.6.1.2': {
        d: 'appleCertificateExtensionADCDeveloperSigning',
        c: 'Apple certificate extension'
    },
    '1.2.840.113635.100.6.1.3': {
        d: 'appleCertificateExtensionADCAppleSigning',
        c: 'Apple certificate extension'
    },
    '1.2.840.113635.100.15.1': {
        d: 'appleCustomCertificateExtension1',
        c: 'Apple custom certificate extension'
    },
    '1.2.840.113635.100.15.2': {
        d: 'appleCustomCertificateExtension2',
        c: 'Apple custom certificate extension'
    },
    '1.2.840.113635.100.15.3': {
        d: 'appleCustomCertificateExtension3',
        c: 'Apple custom certificate extension'
    },
    '1.3.6.1.4.1.311.2.1.4': {
        d: 'spcIndirectDataContext',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.2.1.10': {
        d: 'spcAgencyInfo',
        c: 'Microsoft code signing. Also known as policyLink'
    },
    '1.3.6.1.4.1.311.2.1.11': {
        d: 'spcStatementType',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.2.1.12': { d: 'spcSpOpusInfo', c: 'Microsoft code signing' },
    '1.3.6.1.4.1.311.2.1.14': { d: 'certReqExtensions', c: 'Microsoft' },
    '1.3.6.1.4.1.311.2.1.15': {
        d: 'spcPEImageData',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.2.1.18': {
        d: 'spcRawFileData',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.2.1.19': {
        d: 'spcStructuredStorageData',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.2.1.20': {
        d: 'spcJavaClassData (type 1)',
        c: 'Microsoft code signing. Formerly "link extension" aka "glue extension"'
    },
    '1.3.6.1.4.1.311.2.1.21': { d: 'individualCodeSigning', c: 'Microsoft' },
    '1.3.6.1.4.1.311.2.1.22': { d: 'commercialCodeSigning', c: 'Microsoft' },
    '1.3.6.1.4.1.311.2.1.25': {
        d: 'spcLink (type 2)',
        c: 'Microsoft code signing. Also known as "glue extension"'
    },
    '1.3.6.1.4.1.311.2.1.26': {
        d: 'spcMinimalCriteriaInfo',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.2.1.27': {
        d: 'spcFinancialCriteriaInfo',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.2.1.28': {
        d: 'spcLink (type 3)',
        c: 'Microsoft code signing.  Also known as "glue extension"'
    },
    '1.3.6.1.4.1.311.2.1.29': {
        d: 'spcHashInfoObjID',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.2.1.30': {
        d: 'spcSipInfoObjID',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.2.2': { d: 'ctl', c: 'Microsoft CTL' },
    '1.3.6.1.4.1.311.2.2.1': {
        d: 'ctlTrustedCodesigningCAList',
        c: 'Microsoft CTL'
    },
    '1.3.6.1.4.1.311.2.2.2': {
        d: 'ctlTrustedClientAuthCAList',
        c: 'Microsoft CTL'
    },
    '1.3.6.1.4.1.311.2.2.3': {
        d: 'ctlTrustedServerAuthCAList',
        c: 'Microsoft CTL'
    },
    '1.3.6.1.4.1.311.3.2.1': {
        d: 'timestampRequest',
        c: 'Microsoft code signing'
    },
    '1.3.6.1.4.1.311.10.1': { d: 'certTrustList', c: 'Microsoft contentType' },
    '1.3.6.1.4.1.311.10.1.1': { d: 'sortedCtl', c: 'Microsoft contentType' },
    '1.3.6.1.4.1.311.10.2': { d: 'nextUpdateLocation', c: 'Microsoft' },
    '1.3.6.1.4.1.311.10.3.1': {
        d: 'certTrustListSigning',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.2': {
        d: 'timeStampSigning',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.3': {
        d: 'serverGatedCrypto',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.3.1': { d: 'serialized', c: 'Microsoft' },
    '1.3.6.1.4.1.311.10.3.4': {
        d: 'encryptedFileSystem',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.5': {
        d: 'whqlCrypto',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.6': {
        d: 'nt5Crypto',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.7': {
        d: 'oemWHQLCrypto',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.8': {
        d: 'embeddedNTCrypto',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.9': {
        d: 'rootListSigner',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.10': {
        d: 'qualifiedSubordination',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.11': {
        d: 'keyRecovery',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.12': {
        d: 'documentSigning',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.13': {
        d: 'lifetimeSigning',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.14': {
        d: 'mobileDeviceSoftware',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.15': {
        d: 'smartDisplay',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.16': {
        d: 'cspSignature',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.3.4.1': {
        d: 'efsRecovery',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.4.1': { d: 'yesnoTrustAttr', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.10.5.1': { d: 'drm', c: 'Microsoft enhanced key usage' },
    '1.3.6.1.4.1.311.10.5.2': {
        d: 'drmIndividualization',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.6.1': {
        d: 'licenses',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.6.2': {
        d: 'licenseServer',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.10.7.1': { d: 'keyidRdn', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.10.8.1': {
        d: 'removeCertificate',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.10.9.1': {
        d: 'crossCertDistPoints',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.10.10.1': { d: 'cmcAddAttributes', c: 'Microsoft' },
    '1.3.6.1.4.1.311.10.11': { d: 'certPropIdPrefix', c: 'Microsoft' },
    '1.3.6.1.4.1.311.10.11.4': { d: 'certMd5HashPropId', c: 'Microsoft' },
    '1.3.6.1.4.1.311.10.11.20': { d: 'certKeyIdentifierPropId', c: 'Microsoft' },
    '1.3.6.1.4.1.311.10.11.28': {
        d: 'certIssuerSerialNumberMd5HashPropId',
        c: 'Microsoft'
    },
    '1.3.6.1.4.1.311.10.11.29': {
        d: 'certSubjectNameMd5HashPropId',
        c: 'Microsoft'
    },
    '1.3.6.1.4.1.311.10.12.1': {
        d: 'anyApplicationPolicy',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.12': { d: 'catalog', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.12.1.1': { d: 'catalogList', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.12.1.2': {
        d: 'catalogListMember',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.12.2.1': {
        d: 'catalogNameValueObjID',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.12.2.2': {
        d: 'catalogMemberInfoObjID',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.13.1': { d: 'renewalCertificate', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.13.2.1': {
        d: 'enrolmentNameValuePair',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.13.2.2': { d: 'enrolmentCSP', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.13.2.3': { d: 'osVersion', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.16.4': {
        d: 'microsoftRecipientInfo',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.17.1': {
        d: 'pkcs12KeyProviderNameAttr',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.17.2': { d: 'localMachineKeyset', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.17.3': {
        d: 'pkcs12ExtendedAttributes',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.20.1': { d: 'autoEnrollCtlUsage', c: 'Microsoft' },
    '1.3.6.1.4.1.311.20.2': {
        d: 'enrollCerttypeExtension',
        c: 'Microsoft CAPICOM certificate template, V1'
    },
    '1.3.6.1.4.1.311.20.2.1': {
        d: 'enrollmentAgent',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.20.2.2': {
        d: 'smartcardLogon',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.20.2.3': { d: 'universalPrincipalName', c: 'Microsoft UPN' },
    '1.3.6.1.4.1.311.20.3': { d: 'certManifold', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.1': {
        d: 'cAKeyCertIndexPair',
        c: 'Microsoft attribute.  Also known as certsrvCaVersion'
    },
    '1.3.6.1.4.1.311.21.2': { d: 'certSrvPreviousCertHash', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.3': { d: 'crlVirtualBase', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.4': { d: 'crlNextPublish', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.5': {
        d: 'caExchange',
        c: 'Microsoft extended key usage',
        w: true
    },
    '1.3.6.1.4.1.311.21.6': {
        d: 'keyRecovery',
        c: 'Microsoft extended key usage',
        w: true
    },
    '1.3.6.1.4.1.311.21.7': {
        d: 'certificateTemplate',
        c: 'Microsoft CAPICOM certificate template, V2'
    },
    '1.3.6.1.4.1.311.21.9': { d: 'rdnDummySigner', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.10': { d: 'applicationCertPolicies', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.11': { d: 'applicationPolicyMappings', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.12': {
        d: 'applicationPolicyConstraints',
        c: 'Microsoft'
    },
    '1.3.6.1.4.1.311.21.13': { d: 'archivedKey', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.21.14': { d: 'crlSelfCDP', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.15': { d: 'requireCertChainPolicy', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.16': { d: 'archivedKeyCertHash', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.17': { d: 'issuedCertHash', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.19': { d: 'dsEmailReplication', c: 'Microsoft' },
    '1.3.6.1.4.1.311.21.20': { d: 'requestClientInfo', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.21.21': { d: 'encryptedKeyHash', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.21.22': { d: 'certsrvCrossCaVersion', c: 'Microsoft' },
    '1.3.6.1.4.1.311.25.1': { d: 'ntdsReplication', c: 'Microsoft' },
    '1.3.6.1.4.1.311.31.1': { d: 'productUpdate', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.47.1.1': {
        d: 'systemHealth',
        c: 'Microsoft extended key usage'
    },
    '1.3.6.1.4.1.311.47.1.3': {
        d: 'systemHealthLoophole',
        c: 'Microsoft extended key usage'
    },
    '1.3.6.1.4.1.311.60.1.1': {
        d: 'rootProgramFlags',
        c: 'Microsoft policy attribute'
    },
    '1.3.6.1.4.1.311.61.1.1': {
        d: 'kernelModeCodeSigning',
        c: 'Microsoft enhanced key usage'
    },
    '1.3.6.1.4.1.311.60.2.1.1': {
        d: 'jurisdictionOfIncorporationL',
        c: 'Microsoft (???)'
    },
    '1.3.6.1.4.1.311.60.2.1.2': {
        d: 'jurisdictionOfIncorporationSP',
        c: 'Microsoft (???)'
    },
    '1.3.6.1.4.1.311.60.2.1.3': {
        d: 'jurisdictionOfIncorporationC',
        c: 'Microsoft (???)'
    },
    '1.3.6.1.4.1.311.76.509.1.1': {
        d: 'microsoftCPS',
        c: 'Microsoft PKI services'
    },
    '1.3.6.1.4.1.311.88': { d: 'capiCom', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.88.1': { d: 'capiComVersion', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.88.2': { d: 'capiComAttribute', c: 'Microsoft attribute' },
    '1.3.6.1.4.1.311.88.2.1': {
        d: 'capiComDocumentName',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.88.2.2': {
        d: 'capiComDocumentDescription',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.88.3': {
        d: 'capiComEncryptedData',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.311.88.3.1': {
        d: 'capiComEncryptedContent',
        c: 'Microsoft attribute'
    },
    '1.3.6.1.4.1.188.7.1.1': { d: 'ascom', c: 'Ascom Systech' },
    '1.3.6.1.4.1.188.7.1.1.1': { d: 'ideaECB', c: 'Ascom Systech' },
    '1.3.6.1.4.1.188.7.1.1.2': { d: 'ideaCBC', c: 'Ascom Systech' },
    '1.3.6.1.4.1.188.7.1.1.3': { d: 'ideaCFB', c: 'Ascom Systech' },
    '1.3.6.1.4.1.188.7.1.1.4': { d: 'ideaOFB', c: 'Ascom Systech' },
    '1.3.6.1.4.1.2428.10.1.1': {
        d: 'UNINETT policyIdentifier',
        c: 'UNINETT PCA'
    },
    '1.3.6.1.4.1.2712.10': { d: 'ICE-TEL policyIdentifier', c: 'ICE-TEL CA' },
    '1.3.6.1.4.1.2786.1.1.1': {
        d: 'ICE-TEL Italian policyIdentifier',
        c: 'ICE-TEL CA policy'
    },
    '1.3.6.1.4.1.3029.1.1.1': {
        d: 'blowfishECB',
        c: 'cryptlib encryption algorithm'
    },
    '1.3.6.1.4.1.3029.1.1.2': {
        d: 'blowfishCBC',
        c: 'cryptlib encryption algorithm'
    },
    '1.3.6.1.4.1.3029.1.1.3': {
        d: 'blowfishCFB',
        c: 'cryptlib encryption algorithm'
    },
    '1.3.6.1.4.1.3029.1.1.4': {
        d: 'blowfishOFB',
        c: 'cryptlib encryption algorithm'
    },
    '1.3.6.1.4.1.3029.1.2.1': {
        d: 'elgamal',
        c: 'cryptlib public-key algorithm'
    },
    '1.3.6.1.4.1.3029.1.2.1.1': {
        d: 'elgamalWithSHA-1',
        c: 'cryptlib public-key algorithm'
    },
    '1.3.6.1.4.1.3029.1.2.1.2': {
        d: 'elgamalWithRIPEMD-160',
        c: 'cryptlib public-key algorithm'
    },
    '1.3.6.1.4.1.3029.3.1.1': {
        d: 'cryptlibPresenceCheck',
        c: 'cryptlib attribute type'
    },
    '1.3.6.1.4.1.3029.3.1.2': { d: 'pkiBoot', c: 'cryptlib attribute type' },
    '1.3.6.1.4.1.3029.3.1.4': { d: 'crlExtReason', c: 'cryptlib attribute type' },
    '1.3.6.1.4.1.3029.3.1.5': { d: 'keyFeatures', c: 'cryptlib attribute type' },
    '1.3.6.1.4.1.3029.4.1': { d: 'cryptlibContent', c: 'cryptlib' },
    '1.3.6.1.4.1.3029.4.1.1': {
        d: 'cryptlibConfigData',
        c: 'cryptlib content type'
    },
    '1.3.6.1.4.1.3029.4.1.2': {
        d: 'cryptlibUserIndex',
        c: 'cryptlib content type'
    },
    '1.3.6.1.4.1.3029.4.1.3': {
        d: 'cryptlibUserInfo',
        c: 'cryptlib content type'
    },
    '1.3.6.1.4.1.3029.4.1.4': { d: 'rtcsRequest', c: 'cryptlib content type' },
    '1.3.6.1.4.1.3029.4.1.5': { d: 'rtcsResponse', c: 'cryptlib content type' },
    '1.3.6.1.4.1.3029.4.1.6': {
        d: 'rtcsResponseExt',
        c: 'cryptlib content type'
    },
    '1.3.6.1.4.1.3029.42.11172.1': {
        d: 'mpeg-1',
        c: 'cryptlib special MPEG-of-cat OID'
    },
    '1.3.6.1.4.1.3029.54.11940.54': {
        d: 'TSA policy "Anything that arrives, we sign"',
        c: 'cryptlib TSA policy'
    },
    '1.3.6.1.4.1.3029.88.89.90.90.89': {
        d: 'xYZZY policyIdentifier',
        c: 'cryptlib certificate policy'
    },
    '1.3.6.1.4.1.3401.8.1.1': { d: 'pgpExtension', c: 'PGP key information' },
    '1.3.6.1.4.1.3576.7': {
        d: 'eciaAscX12Edi',
        c: 'TMN EDI for Interactive Agents'
    },
    '1.3.6.1.4.1.3576.7.1': {
        d: 'plainEDImessage',
        c: 'TMN EDI for Interactive Agents'
    },
    '1.3.6.1.4.1.3576.7.2': {
        d: 'signedEDImessage',
        c: 'TMN EDI for Interactive Agents'
    },
    '1.3.6.1.4.1.3576.7.5': {
        d: 'integrityEDImessage',
        c: 'TMN EDI for Interactive Agents'
    },
    '1.3.6.1.4.1.3576.7.65': {
        d: 'iaReceiptMessage',
        c: 'TMN EDI for Interactive Agents'
    },
    '1.3.6.1.4.1.3576.7.97': {
        d: 'iaStatusMessage',
        c: 'TMN EDI for Interactive Agents'
    },
    '1.3.6.1.4.1.3576.8': {
        d: 'eciaEdifact',
        c: 'TMN EDI for Interactive Agents'
    },
    '1.3.6.1.4.1.3576.9': {
        d: 'eciaNonEdi',
        c: 'TMN EDI for Interactive Agents'
    },
    '1.3.6.1.4.1.4146': { d: 'Globalsign', c: 'Globalsign' },
    '1.3.6.1.4.1.4146.1': { d: 'globalsignPolicy', c: 'Globalsign' },
    '1.3.6.1.4.1.4146.1.10': { d: 'globalsignDVPolicy', c: 'Globalsign policy' },
    '1.3.6.1.4.1.4146.1.20': { d: 'globalsignOVPolicy', c: 'Globalsign policy' },
    '1.3.6.1.4.1.4146.1.30': { d: 'globalsignTSAPolicy', c: 'Globalsign policy' },
    '1.3.6.1.4.1.4146.1.40': {
        d: 'globalsignClientCertPolicy',
        c: 'Globalsign policy'
    },
    '1.3.6.1.4.1.4146.1.50': {
        d: 'globalsignCodeSignPolicy',
        c: 'Globalsign policy'
    },
    '1.3.6.1.4.1.4146.1.60': {
        d: 'globalsignRootSignPolicy',
        c: 'Globalsign policy'
    },
    '1.3.6.1.4.1.4146.1.70': {
        d: 'globalsignTrustedRootPolicy',
        c: 'Globalsign policy'
    },
    '1.3.6.1.4.1.4146.1.80': {
        d: 'globalsignEDIClientPolicy',
        c: 'Globalsign policy'
    },
    '1.3.6.1.4.1.4146.1.81': {
        d: 'globalsignEDIServerPolicy',
        c: 'Globalsign policy'
    },
    '1.3.6.1.4.1.4146.1.90': {
        d: 'globalsignTPMRootPolicy',
        c: 'Globalsign policy'
    },
    '1.3.6.1.4.1.4146.1.95': {
        d: 'globalsignOCSPPolicy',
        c: 'Globalsign policy'
    },
    '1.3.6.1.4.1.5309.1': { d: 'edelWebPolicy', c: 'EdelWeb policy' },
    '1.3.6.1.4.1.5309.1.2': { d: 'edelWebCustomerPolicy', c: 'EdelWeb policy' },
    '1.3.6.1.4.1.5309.1.2.1': {
        d: 'edelWebClepsydrePolicy',
        c: 'EdelWeb policy'
    },
    '1.3.6.1.4.1.5309.1.2.2': {
        d: 'edelWebExperimentalTSAPolicy',
        c: 'EdelWeb policy'
    },
    '1.3.6.1.4.1.5309.1.2.3': {
        d: 'edelWebOpenEvidenceTSAPolicy',
        c: 'EdelWeb policy'
    },
    '1.3.6.1.4.1.5472': { d: 'timeproof', c: 'enterprise' },
    '1.3.6.1.4.1.5472.1': { d: 'tss', c: 'timeproof' },
    '1.3.6.1.4.1.5472.1.1': { d: 'tss80', c: 'timeproof TSS' },
    '1.3.6.1.4.1.5472.1.2': { d: 'tss380', c: 'timeproof TSS' },
    '1.3.6.1.4.1.5472.1.3': { d: 'tss400', c: 'timeproof TSS' },
    '1.3.6.1.4.1.5770.0.3': { d: 'secondaryPractices', c: 'MEDePass' },
    '1.3.6.1.4.1.5770.0.4': { d: 'physicianIdentifiers', c: 'MEDePass' },
    '1.3.6.1.4.1.6449.1.2.1.3.1': { d: 'comodoPolicy', c: 'Comodo CA' },
    '1.3.6.1.4.1.6449.1.2.2.15': { d: 'wotrustPolicy', c: 'WoTrust (Comodo) CA' },
    '1.3.6.1.4.1.6449.1.3.5.2': {
        d: 'comodoCertifiedDeliveryService',
        c: 'Comodo CA'
    },
    '1.3.6.1.4.1.6449.2.1.1': { d: 'comodoTimestampingPolicy', c: 'Comodo CA' },
    '1.3.6.1.4.1.8301.3.5.1': {
        d: 'validityModelChain',
        c: 'TU Darmstadt ValidityModel'
    },
    '1.3.6.1.4.1.8301.3.5.2': { d: 'validityModelShell', c: 'ValidityModel' },
    '1.3.6.1.4.1.8231.1': {
        d: 'rolUnicoNacional',
        c: 'Chilean Government national unique roll number'
    },
    '1.3.6.1.4.1.11591': {
        d: 'gnu',
        c: 'GNU Project (see https://www.gnupg.org/oids.html)'
    },
    '1.3.6.1.4.1.11591.1': { d: 'gnuRadius', c: 'GNU Radius' },
    '1.3.6.1.4.1.11591.3': { d: 'gnuRadar', c: 'GNU Radar' },
    '1.3.6.1.4.1.11591.4.11': { d: 'scrypt', c: 'GNU Generic Security Service' },
    '1.3.6.1.4.1.11591.12': {
        d: 'gnuDigestAlgorithm',
        c: 'GNU digest algorithm'
    },
    '1.3.6.1.4.1.11591.12.2': { d: 'tiger', c: 'GNU digest algorithm' },
    '1.3.6.1.4.1.11591.13': {
        d: 'gnuEncryptionAlgorithm',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2': { d: 'serpent', c: 'GNU encryption algorithm' },
    '1.3.6.1.4.1.11591.13.2.1': {
        d: 'serpent128_ECB',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.2': {
        d: 'serpent128_CBC',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.3': {
        d: 'serpent128_OFB',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.4': {
        d: 'serpent128_CFB',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.21': {
        d: 'serpent192_ECB',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.22': {
        d: 'serpent192_CBC',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.23': {
        d: 'serpent192_OFB',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.24': {
        d: 'serpent192_CFB',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.41': {
        d: 'serpent256_ECB',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.42': {
        d: 'serpent256_CBC',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.43': {
        d: 'serpent256_OFB',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.13.2.44': {
        d: 'serpent256_CFB',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.15.1': { d: 'curve25519', c: 'GNU encryption algorithm' },
    '1.3.6.1.4.1.11591.15.2': { d: 'curve448', c: 'GNU encryption algorithm' },
    '1.3.6.1.4.1.11591.15.3': {
        d: 'curve25519ph',
        c: 'GNU encryption algorithm'
    },
    '1.3.6.1.4.1.11591.15.4': { d: 'curve448ph', c: 'GNU encryption algorithm' },
    '1.3.6.1.4.1.16334.509.1.1': {
        d: 'Northrop Grumman extKeyUsage?',
        c: 'Northrop Grumman extended key usage'
    },
    '1.3.6.1.4.1.16334.509.2.1': { d: 'ngcClass1', c: 'Northrop Grumman policy' },
    '1.3.6.1.4.1.16334.509.2.2': { d: 'ngcClass2', c: 'Northrop Grumman policy' },
    '1.3.6.1.4.1.16334.509.2.3': { d: 'ngcClass3', c: 'Northrop Grumman policy' },
    '1.3.6.1.4.1.23629.1.4.2.1.1': { d: 'safenetUsageLimit', c: 'SafeNet' },
    '1.3.6.1.4.1.23629.1.4.2.1.2': { d: 'safenetEndDate', c: 'SafeNet' },
    '1.3.6.1.4.1.23629.1.4.2.1.3': { d: 'safenetStartDate', c: 'SafeNet' },
    '1.3.6.1.4.1.23629.1.4.2.1.4': { d: 'safenetAdminCert', c: 'SafeNet' },
    '1.3.6.1.4.1.23629.1.4.2.2.1': { d: 'safenetKeyDigest', c: 'SafeNet' },
    '1.3.6.1.4.1.51483.2.1': { d: 'hashOfRootKey', c: 'CTIA' },
    '1.3.6.1.5.2.3.1': { d: 'authData', c: 'Kerberos' },
    '1.3.6.1.5.2.3.2': { d: 'dHKeyData', c: 'Kerberos' },
    '1.3.6.1.5.2.3.3': { d: 'rkeyData', c: 'Kerberos' },
    '1.3.6.1.5.2.3.4': { d: 'keyPurposeClientAuth', c: 'Kerberos' },
    '1.3.6.1.5.2.3.5': { d: 'keyPurposeKdc', c: 'Kerberos' },
    '1.3.6.1.5.2.3.6': { d: 'kdf', c: 'Kerberos' },
    '1.3.6.1.5.5.7': { d: 'pkix', c: '' },
    '1.3.6.1.5.5.7.0.12': { d: 'attributeCert', c: 'PKIX' },
    '1.3.6.1.5.5.7.1': { d: 'privateExtension', c: 'PKIX' },
    '1.3.6.1.5.5.7.1.1': {
        d: 'authorityInfoAccess',
        c: 'PKIX private extension'
    },
    '1.3.6.1.5.5.7.1.2': { d: 'biometricInfo', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.3': { d: 'qcStatements', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.4': { d: 'acAuditIdentity', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.5': { d: 'acTargeting', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.6': { d: 'acAaControls', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.7': { d: 'ipAddrBlocks', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.8': { d: 'autonomousSysIds', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.9': { d: 'routerIdentifier', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.10': { d: 'acProxying', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.11': { d: 'subjectInfoAccess', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.12': { d: 'logoType', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.13': { d: 'wlanSSID', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.14': { d: 'proxyCertInfo', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.15': { d: 'acPolicies', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.16': {
        d: 'certificateWarranty',
        c: 'PKIX private extension'
    },
    '1.3.6.1.5.5.7.1.18': {
        d: 'cmsContentConstraints',
        c: 'PKIX private extension'
    },
    '1.3.6.1.5.5.7.1.19': { d: 'otherCerts', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.20': {
        d: 'wrappedApexContinKey',
        c: 'PKIX private extension'
    },
    '1.3.6.1.5.5.7.1.21': {
        d: 'clearanceConstraints',
        c: 'PKIX private extension'
    },
    '1.3.6.1.5.5.7.1.22': { d: 'skiSemantics', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.23': { d: 'noSecrecyAfforded', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.24': { d: 'tlsFeature', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.25': {
        d: 'manufacturerUsageDescription',
        c: 'PKIX private extension'
    },
    '1.3.6.1.5.5.7.1.26': { d: 'tnAuthList', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.27': {
        d: 'jwtClaimConstraints',
        c: 'PKIX private extension'
    },
    '1.3.6.1.5.5.7.1.28': { d: 'ipAddrBlocksV2', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.29': {
        d: 'autonomousSysIdsV2',
        c: 'PKIX private extension'
    },
    '1.3.6.1.5.5.7.1.30': {
        d: 'manufacturerUsageDescriptionSigner',
        c: 'PKIX private extension'
    },
    '1.3.6.1.5.5.7.1.31': { d: 'acmeIdentifier', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.1.32': { d: 'masaURL', c: 'PKIX private extension' },
    '1.3.6.1.5.5.7.2': { d: 'policyQualifierIds', c: 'PKIX' },
    '1.3.6.1.5.5.7.2.1': { d: 'cps', c: 'PKIX policy qualifier' },
    '1.3.6.1.5.5.7.2.2': { d: 'unotice', c: 'PKIX policy qualifier' },
    '1.3.6.1.5.5.7.2.3': { d: 'textNotice', c: 'PKIX policy qualifier' },
    '1.3.6.1.5.5.7.2.4': { d: 'acps', c: 'PKIX policy qualifier' },
    '1.3.6.1.5.5.7.2.5': { d: 'acunotice', c: 'PKIX policy qualifier' },
    '1.3.6.1.5.5.7.3': { d: 'keyPurpose', c: 'PKIX' },
    '1.3.6.1.5.5.7.3.1': { d: 'serverAuth', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.2': { d: 'clientAuth', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.3': { d: 'codeSigning', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.4': { d: 'emailProtection', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.5': { d: 'ipsecEndSystem', c: 'PKIX key purpose', w: true },
    '1.3.6.1.5.5.7.3.6': { d: 'ipsecTunnel', c: 'PKIX key purpose', w: true },
    '1.3.6.1.5.5.7.3.7': { d: 'ipsecUser', c: 'PKIX key purpose', w: true },
    '1.3.6.1.5.5.7.3.8': { d: 'timeStamping', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.9': { d: 'ocspSigning', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.10': { d: 'dvcs', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.11': {
        d: 'sbgpCertAAServerAuth',
        c: 'PKIX key purpose',
        w: true
    },
    '1.3.6.1.5.5.7.3.12': { d: 'scvpResponder', c: 'PKIX key purpose', w: true },
    '1.3.6.1.5.5.7.3.13': { d: 'eapOverPPP', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.14': { d: 'eapOverLAN', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.15': { d: 'scvpServer', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.16': { d: 'scvpClient', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.17': { d: 'ipsecIKE', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.18': { d: 'capwapAC', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.19': { d: 'capwapWTP', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.20': { d: 'sipDomain', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.21': { d: 'secureShellClient', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.22': { d: 'secureShellServer', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.23': { d: 'sendRouter', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.24': { d: 'sendProxiedRouter', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.25': { d: 'sendOwner', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.26': { d: 'sendProxiedOwner', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.27': { d: 'cmcCA', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.28': { d: 'cmcRA', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.29': { d: 'cmcArchive', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.30': { d: 'bgpsecRouter', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.31': { d: 'bimi', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.32': { d: 'cmKGA', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.33': { d: 'rpcTLSClient', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.3.34': { d: 'rpcTLSServer', c: 'PKIX key purpose' },
    '1.3.6.1.5.5.7.4': { d: 'cmpInformationTypes', c: 'PKIX' },
    '1.3.6.1.5.5.7.4.1': { d: 'caProtEncCert', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.2': { d: 'signKeyPairTypes', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.3': { d: 'encKeyPairTypes', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.4': { d: 'preferredSymmAlg', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.5': { d: 'caKeyUpdateInfo', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.6': { d: 'currentCRL', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.7': { d: 'unsupportedOIDs', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.10': { d: 'keyPairParamReq', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.11': { d: 'keyPairParamRep', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.12': { d: 'revPassphrase', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.13': { d: 'implicitConfirm', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.14': { d: 'confirmWaitTime', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.15': { d: 'origPKIMessage', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.4.16': { d: 'suppLangTags', c: 'PKIX CMP information' },
    '1.3.6.1.5.5.7.5': { d: 'crmfRegistration', c: 'PKIX' },
    '1.3.6.1.5.5.7.5.1': { d: 'regCtrl', c: 'PKIX CRMF registration' },
    '1.3.6.1.5.5.7.5.1.1': { d: 'regToken', c: 'PKIX CRMF registration control' },
    '1.3.6.1.5.5.7.5.1.2': {
        d: 'authenticator',
        c: 'PKIX CRMF registration control'
    },
    '1.3.6.1.5.5.7.5.1.3': {
        d: 'pkiPublicationInfo',
        c: 'PKIX CRMF registration control'
    },
    '1.3.6.1.5.5.7.5.1.4': {
        d: 'pkiArchiveOptions',
        c: 'PKIX CRMF registration control'
    },
    '1.3.6.1.5.5.7.5.1.5': {
        d: 'oldCertID',
        c: 'PKIX CRMF registration control'
    },
    '1.3.6.1.5.5.7.5.1.6': {
        d: 'protocolEncrKey',
        c: 'PKIX CRMF registration control'
    },
    '1.3.6.1.5.5.7.5.1.7': {
        d: 'altCertTemplate',
        c: 'PKIX CRMF registration control'
    },
    '1.3.6.1.5.5.7.5.1.8': {
        d: 'wtlsTemplate',
        c: 'PKIX CRMF registration control'
    },
    '1.3.6.1.5.5.7.5.2': { d: 'utf8Pairs', c: 'PKIX CRMF registration' },
    '1.3.6.1.5.5.7.5.2.1': {
        d: 'utf8Pairs',
        c: 'PKIX CRMF registration control'
    },
    '1.3.6.1.5.5.7.5.2.2': { d: 'certReq', c: 'PKIX CRMF registration control' },
    '1.3.6.1.5.5.7.6': { d: 'algorithms', c: 'PKIX' },
    '1.3.6.1.5.5.7.6.1': { d: 'des40', c: 'PKIX algorithm' },
    '1.3.6.1.5.5.7.6.2': { d: 'noSignature', c: 'PKIX algorithm' },
    '1.3.6.1.5.5.7.6.3': { d: 'dhSigHmacSha1', c: 'PKIX algorithm' },
    '1.3.6.1.5.5.7.6.4': { d: 'dhPop', c: 'PKIX algorithm' },
    '1.3.6.1.5.5.7.6.5': { d: 'dhPopSha224', c: 'PKIX algorithm' },
    '1.3.6.1.5.5.7.6.6': { d: 'dhPopSha256', c: 'PKIX algorithm' },
    '1.3.6.1.5.5.7.6.7': { d: 'dhPopSha384', c: 'PKIX algorithm' },
    '1.3.6.1.5.5.7.6.8': { d: 'dhPopSha512', c: 'PKIX algorithm' },
    '1.3.6.1.5.5.7.6.15': {
        d: 'dhPopStaticSha224HmacSha224',
        c: 'PKIX algorithm'
    },
    '1.3.6.1.5.5.7.6.16': {
        d: 'dhPopStaticSha256HmacSha256',
        c: 'PKIX algorithm'
    },
    '1.3.6.1.5.5.7.6.17': {
        d: 'dhPopStaticSha384HmacSha384',
        c: 'PKIX algorithm'
    },
    '1.3.6.1.5.5.7.6.18': {
        d: 'dhPopStaticSha512HmacSha512',
        c: 'PKIX algorithm'
    },
    '1.3.6.1.5.5.7.6.25': {
        d: 'ecdhPopStaticSha224HmacSha224',
        c: 'PKIX algorithm'
    },
    '1.3.6.1.5.5.7.6.26': {
        d: 'ecdhPopStaticSha256HmacSha256',
        c: 'PKIX algorithm'
    },
    '1.3.6.1.5.5.7.6.27': {
        d: 'ecdhPopStaticSha384HmacSha384',
        c: 'PKIX algorithm'
    },
    '1.3.6.1.5.5.7.6.28': {
        d: 'ecdhPopStaticSha512HmacSha512',
        c: 'PKIX algorithm'
    },
    '1.3.6.1.5.5.7.7': { d: 'cmcControls', c: 'PKIX' },
    '1.3.6.1.5.5.7.8': { d: 'otherNames', c: 'PKIX' },
    '1.3.6.1.5.5.7.8.1': { d: 'personalData', c: 'PKIX other name' },
    '1.3.6.1.5.5.7.8.2': { d: 'userGroup', c: 'PKIX other name' },
    '1.3.6.1.5.5.7.8.3': { d: 'permanentIdentifier', c: 'PKIX other name' },
    '1.3.6.1.5.5.7.8.5': { d: 'xmppAddr', c: 'PKIX other name' },
    '1.3.6.1.5.5.7.8.6': { d: 'SIM', c: 'PKIX other name' },
    '1.3.6.1.5.5.7.9': { d: 'personalData', c: 'PKIX qualified certificates' },
    '1.3.6.1.5.5.7.9.1': { d: 'dateOfBirth', c: 'PKIX personal data' },
    '1.3.6.1.5.5.7.9.2': { d: 'placeOfBirth', c: 'PKIX personal data' },
    '1.3.6.1.5.5.7.9.3': { d: 'gender', c: 'PKIX personal data' },
    '1.3.6.1.5.5.7.9.4': { d: 'countryOfCitizenship', c: 'PKIX personal data' },
    '1.3.6.1.5.5.7.9.5': { d: 'countryOfResidence', c: 'PKIX personal data' },
    '1.3.6.1.5.5.7.10': { d: 'attributeCertificate', c: 'PKIX' },
    '1.3.6.1.5.5.7.10.1': {
        d: 'authenticationInfo',
        c: 'PKIX attribute certificate extension'
    },
    '1.3.6.1.5.5.7.10.2': {
        d: 'accessIdentity',
        c: 'PKIX attribute certificate extension'
    },
    '1.3.6.1.5.5.7.10.3': {
        d: 'chargingIdentity',
        c: 'PKIX attribute certificate extension'
    },
    '1.3.6.1.5.5.7.10.4': {
        d: 'group',
        c: 'PKIX attribute certificate extension'
    },
    '1.3.6.1.5.5.7.10.5': {
        d: 'role',
        c: 'PKIX attribute certificate extension'
    },
    '1.3.6.1.5.5.7.10.6': {
        d: 'wlanSSID',
        c: 'PKIX attribute-certificate extension'
    },
    '1.3.6.1.5.5.7.11': { d: 'personalData', c: 'PKIX qualified certificates' },
    '1.3.6.1.5.5.7.11.1': {
        d: 'pkixQCSyntax-v1',
        c: 'PKIX qualified certificates'
    },
    '1.3.6.1.5.5.7.11.2': {
        d: 'pkixQCSyntax-v2',
        c: 'PKIX qualified certificates'
    },
    '1.3.6.1.5.5.7.12': { d: 'pkixCCT', c: 'PKIX CMC Content Types' },
    '1.3.6.1.5.5.7.12.2': { d: 'pkiData', c: 'PKIX CMC Content Types' },
    '1.3.6.1.5.5.7.12.3': { d: 'pkiResponse', c: 'PKIX CMC Content Types' },
    '1.3.6.1.5.5.7.14.2': { d: 'resourceCertificatePolicy', c: 'PKIX policies' },
    '1.3.6.1.5.5.7.20': { d: 'logo', c: 'PKIX qualified certificates' },
    '1.3.6.1.5.5.7.20.1': { d: 'logoLoyalty', c: 'PKIX' },
    '1.3.6.1.5.5.7.20.2': { d: 'logoBackground', c: 'PKIX' },
    '1.3.6.1.5.5.7.48.1': { d: 'ocsp', c: 'PKIX' },
    '1.3.6.1.5.5.7.48.1.1': { d: 'ocspBasic', c: 'OCSP' },
    '1.3.6.1.5.5.7.48.1.2': { d: 'ocspNonce', c: 'OCSP' },
    '1.3.6.1.5.5.7.48.1.3': { d: 'ocspCRL', c: 'OCSP' },
    '1.3.6.1.5.5.7.48.1.4': { d: 'ocspResponse', c: 'OCSP' },
    '1.3.6.1.5.5.7.48.1.5': { d: 'ocspNoCheck', c: 'OCSP' },
    '1.3.6.1.5.5.7.48.1.6': { d: 'ocspArchiveCutoff', c: 'OCSP' },
    '1.3.6.1.5.5.7.48.1.7': { d: 'ocspServiceLocator', c: 'OCSP' },
    '1.3.6.1.5.5.7.48.2': {
        d: 'caIssuers',
        c: 'PKIX subject/authority info access descriptor'
    },
    '1.3.6.1.5.5.7.48.3': {
        d: 'timeStamping',
        c: 'PKIX subject/authority info access descriptor'
    },
    '1.3.6.1.5.5.7.48.4': {
        d: 'dvcs',
        c: 'PKIX subject/authority info access descriptor'
    },
    '1.3.6.1.5.5.7.48.5': {
        d: 'caRepository',
        c: 'PKIX subject/authority info access descriptor'
    },
    '1.3.6.1.5.5.7.48.7': {
        d: 'signedObjectRepository',
        c: 'PKIX subject/authority info access descriptor'
    },
    '1.3.6.1.5.5.7.48.10': {
        d: 'rpkiManifest',
        c: 'PKIX subject/authority info access descriptor'
    },
    '1.3.6.1.5.5.7.48.11': {
        d: 'signedObject',
        c: 'PKIX subject/authority info access descriptor'
    },
    '1.3.6.1.5.5.8.1.1': { d: 'hmacMD5', c: 'ISAKMP HMAC algorithm' },
    '1.3.6.1.5.5.8.1.2': { d: 'hmacSHA', c: 'ISAKMP HMAC algorithm' },
    '1.3.6.1.5.5.8.1.3': { d: 'hmacTiger', c: 'ISAKMP HMAC algorithm' },
    '1.3.6.1.5.5.8.2.2': { d: 'iKEIntermediate', c: 'IKE ???' },
    '1.3.12.2.1011.7.1': { d: 'decEncryptionAlgorithm', c: 'DASS algorithm' },
    '1.3.12.2.1011.7.1.2': { d: 'decDEA', c: 'DASS encryption algorithm' },
    '1.3.12.2.1011.7.2': { d: 'decHashAlgorithm', c: 'DASS algorithm' },
    '1.3.12.2.1011.7.2.1': { d: 'decMD2', c: 'DASS hash algorithm' },
    '1.3.12.2.1011.7.2.2': { d: 'decMD4', c: 'DASS hash algorithm' },
    '1.3.12.2.1011.7.3': { d: 'decSignatureAlgorithm', c: 'DASS algorithm' },
    '1.3.12.2.1011.7.3.1': { d: 'decMD2withRSA', c: 'DASS signature algorithm' },
    '1.3.12.2.1011.7.3.2': { d: 'decMD4withRSA', c: 'DASS signature algorithm' },
    '1.3.12.2.1011.7.3.3': { d: 'decDEAMAC', c: 'DASS signature algorithm' },
    '1.3.14.2.26.5': { d: 'sha', c: 'Unsure about this OID' },
    '1.3.14.3.2.1.1': { d: 'rsa', c: 'X.509. Unsure about this OID' },
    '1.3.14.3.2.2': { d: 'md4WitRSA', c: 'Oddball OIW OID' },
    '1.3.14.3.2.3': { d: 'md5WithRSA', c: 'Oddball OIW OID' },
    '1.3.14.3.2.4': { d: 'md4WithRSAEncryption', c: 'Oddball OIW OID' },
    '1.3.14.3.2.2.1': { d: 'sqmod-N', c: 'X.509. Deprecated', w: true },
    '1.3.14.3.2.3.1': { d: 'sqmod-NwithRSA', c: 'X.509. Deprecated', w: true },
    '1.3.14.3.2.6': { d: 'desECB', c: '' },
    '1.3.14.3.2.7': { d: 'desCBC', c: '' },
    '1.3.14.3.2.8': { d: 'desOFB', c: '' },
    '1.3.14.3.2.9': { d: 'desCFB', c: '' },
    '1.3.14.3.2.10': { d: 'desMAC', c: '' },
    '1.3.14.3.2.11': { d: 'rsaSignature', c: 'ISO 9796-2, also X9.31 Part 1' },
    '1.3.14.3.2.12': {
        d: 'dsa',
        c: "OIW?, supposedly from an incomplete version of SDN.701 (doesn't match final SDN.701)",
        w: true
    },
    '1.3.14.3.2.13': {
        d: 'dsaWithSHA',
        c: 'Oddball OIW OID.  Incorrectly used by JDK 1.1 in place of (1 3 14 3 2 27)',
        w: true
    },
    '1.3.14.3.2.14': {
        d: 'mdc2WithRSASignature',
        c: 'Oddball OIW OID using 9796-2 padding rules'
    },
    '1.3.14.3.2.15': {
        d: 'shaWithRSASignature',
        c: 'Oddball OIW OID using 9796-2 padding rules'
    },
    '1.3.14.3.2.16': {
        d: 'dhWithCommonModulus',
        c: 'Oddball OIW OID. Deprecated, use a plain DH OID instead',
        w: true
    },
    '1.3.14.3.2.17': { d: 'desEDE', c: 'Oddball OIW OID. Mode is ECB' },
    '1.3.14.3.2.18': { d: 'sha', c: 'Oddball OIW OID' },
    '1.3.14.3.2.19': {
        d: 'mdc-2',
        c: 'Oddball OIW OID, DES-based hash, planned for X9.31 Part 2'
    },
    '1.3.14.3.2.20': {
        d: 'dsaCommon',
        c: 'Oddball OIW OID.  Deprecated, use a plain DSA OID instead',
        w: true
    },
    '1.3.14.3.2.21': {
        d: 'dsaCommonWithSHA',
        c: 'Oddball OIW OID.  Deprecated, use a plain dsaWithSHA OID instead',
        w: true
    },
    '1.3.14.3.2.22': { d: 'rsaKeyTransport', c: 'Oddball OIW OID' },
    '1.3.14.3.2.23': { d: 'keyed-hash-seal', c: 'Oddball OIW OID' },
    '1.3.14.3.2.24': {
        d: 'md2WithRSASignature',
        c: 'Oddball OIW OID using 9796-2 padding rules'
    },
    '1.3.14.3.2.25': {
        d: 'md5WithRSASignature',
        c: 'Oddball OIW OID using 9796-2 padding rules'
    },
    '1.3.14.3.2.26': { d: 'sha1', c: 'OIW' },
    '1.3.14.3.2.27': {
        d: 'dsaWithSHA1',
        c: 'OIW. This OID may also be assigned as ripemd-160'
    },
    '1.3.14.3.2.28': { d: 'dsaWithCommonSHA1', c: 'OIW' },
    '1.3.14.3.2.29': { d: 'sha-1WithRSAEncryption', c: 'Oddball OIW OID' },
    '1.3.14.3.3.1': { d: 'simple-strong-auth-mechanism', c: 'Oddball OIW OID' },
    '1.3.14.7.2.1.1': { d: 'ElGamal', c: 'Unsure about this OID' },
    '1.3.14.7.2.3.1': { d: 'md2WithRSA', c: 'Unsure about this OID' },
    '1.3.14.7.2.3.2': { d: 'md2WithElGamal', c: 'Unsure about this OID' },
    '1.3.36.1': { d: 'document', c: 'Teletrust document' },
    '1.3.36.1.1': { d: 'finalVersion', c: 'Teletrust document' },
    '1.3.36.1.2': { d: 'draft', c: 'Teletrust document' },
    '1.3.36.2': { d: 'sio', c: 'Teletrust sio' },
    '1.3.36.2.1': { d: 'sedu', c: 'Teletrust sio' },
    '1.3.36.3': { d: 'algorithm', c: 'Teletrust algorithm' },
    '1.3.36.3.1': { d: 'encryptionAlgorithm', c: 'Teletrust algorithm' },
    '1.3.36.3.1.1': { d: 'des', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.1.1': { d: 'desECB_pad', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.1.1.1': {
        d: 'desECB_ISOpad',
        c: 'Teletrust encryption algorithm'
    },
    '1.3.36.3.1.1.2.1': { d: 'desCBC_pad', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.1.2.1.1': {
        d: 'desCBC_ISOpad',
        c: 'Teletrust encryption algorithm'
    },
    '1.3.36.3.1.3': { d: 'des_3', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.3.1.1': {
        d: 'des_3ECB_pad',
        c: 'Teletrust encryption algorithm. EDE triple DES'
    },
    '1.3.36.3.1.3.1.1.1': {
        d: 'des_3ECB_ISOpad',
        c: 'Teletrust encryption algorithm. EDE triple DES'
    },
    '1.3.36.3.1.3.2.1': {
        d: 'des_3CBC_pad',
        c: 'Teletrust encryption algorithm. EDE triple DES'
    },
    '1.3.36.3.1.3.2.1.1': {
        d: 'des_3CBC_ISOpad',
        c: 'Teletrust encryption algorithm. EDE triple DES'
    },
    '1.3.36.3.1.2': { d: 'idea', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.2.1': { d: 'ideaECB', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.2.1.1': { d: 'ideaECB_pad', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.2.1.1.1': {
        d: 'ideaECB_ISOpad',
        c: 'Teletrust encryption algorithm'
    },
    '1.3.36.3.1.2.2': { d: 'ideaCBC', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.2.2.1': { d: 'ideaCBC_pad', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.2.2.1.1': {
        d: 'ideaCBC_ISOpad',
        c: 'Teletrust encryption algorithm'
    },
    '1.3.36.3.1.2.3': { d: 'ideaOFB', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.2.4': { d: 'ideaCFB', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.4': { d: 'rsaEncryption', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.4.512.17': {
        d: 'rsaEncryptionWithlmod512expe17',
        c: 'Teletrust encryption algorithm'
    },
    '1.3.36.3.1.5': { d: 'bsi-1', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.5.1': { d: 'bsi_1ECB_pad', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.5.2': { d: 'bsi_1CBC_pad', c: 'Teletrust encryption algorithm' },
    '1.3.36.3.1.5.2.1': {
        d: 'bsi_1CBC_PEMpad',
        c: 'Teletrust encryption algorithm'
    },
    '1.3.36.3.2': { d: 'hashAlgorithm', c: 'Teletrust algorithm' },
    '1.3.36.3.2.1': { d: 'ripemd160', c: 'Teletrust hash algorithm' },
    '1.3.36.3.2.2': { d: 'ripemd128', c: 'Teletrust hash algorithm' },
    '1.3.36.3.2.3': { d: 'ripemd256', c: 'Teletrust hash algorithm' },
    '1.3.36.3.2.4': { d: 'mdc2singleLength', c: 'Teletrust hash algorithm' },
    '1.3.36.3.2.5': { d: 'mdc2doubleLength', c: 'Teletrust hash algorithm' },
    '1.3.36.3.3': { d: 'signatureAlgorithm', c: 'Teletrust algorithm' },
    '1.3.36.3.3.1': { d: 'rsaSignature', c: 'Teletrust signature algorithm' },
    '1.3.36.3.3.1.1': {
        d: 'rsaSignatureWithsha1',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.1.1.1024.11': {
        d: 'rsaSignatureWithsha1_l1024_l11',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.1.2': {
        d: 'rsaSignatureWithripemd160',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.1.2.1024.11': {
        d: 'rsaSignatureWithripemd160_l1024_l11',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.1.3': {
        d: 'rsaSignatureWithrimpemd128',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.1.4': {
        d: 'rsaSignatureWithrimpemd256',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.2': { d: 'ecsieSign', c: 'Teletrust signature algorithm' },
    '1.3.36.3.3.2.1': {
        d: 'ecsieSignWithsha1',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.2.2': {
        d: 'ecsieSignWithripemd160',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.2.3': {
        d: 'ecsieSignWithmd2',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.2.4': {
        d: 'ecsieSignWithmd5',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.3.3.2.8.1.1.1': {
        d: 'brainpoolP160r1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.2': {
        d: 'brainpoolP160t1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.3': {
        d: 'brainpoolP192r1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.4': {
        d: 'brainpoolP192t1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.5': {
        d: 'brainpoolP224r1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.6': {
        d: 'brainpoolP224t1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.7': {
        d: 'brainpoolP256r1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.8': {
        d: 'brainpoolP256t1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.9': {
        d: 'brainpoolP320r1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.10': {
        d: 'brainpoolP320t1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.11': {
        d: 'brainpoolP384r1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.12': {
        d: 'brainpoolP384t1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.13': {
        d: 'brainpoolP512r1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.3.2.8.1.1.14': {
        d: 'brainpoolP512t1',
        c: 'ECC Brainpool Standard Curves and Curve Generation'
    },
    '1.3.36.3.4': { d: 'signatureScheme', c: 'Teletrust algorithm' },
    '1.3.36.3.4.1': { d: 'sigS_ISO9796-1', c: 'Teletrust signature scheme' },
    '1.3.36.3.4.2': { d: 'sigS_ISO9796-2', c: 'Teletrust signature scheme' },
    '1.3.36.3.4.2.1': {
        d: 'sigS_ISO9796-2Withred',
        c: 'Teletrust signature scheme. Unsure what this is supposed to be'
    },
    '1.3.36.3.4.2.2': {
        d: 'sigS_ISO9796-2Withrsa',
        c: 'Teletrust signature scheme. Unsure what this is supposed to be'
    },
    '1.3.36.3.4.2.3': {
        d: 'sigS_ISO9796-2Withrnd',
        c: 'Teletrust signature scheme. 9796-2 with random number in padding field'
    },
    '1.3.36.4': { d: 'attribute', c: 'Teletrust attribute' },
    '1.3.36.5': { d: 'policy', c: 'Teletrust policy' },
    '1.3.36.6': { d: 'api', c: 'Teletrust API' },
    '1.3.36.6.1': { d: 'manufacturer-specific_api', c: 'Teletrust API' },
    '1.3.36.6.1.1': { d: 'utimaco-api', c: 'Teletrust API' },
    '1.3.36.6.2': { d: 'functionality-specific_api', c: 'Teletrust API' },
    '1.3.36.7': { d: 'keymgmnt', c: 'Teletrust key management' },
    '1.3.36.7.1': { d: 'keyagree', c: 'Teletrust key management' },
    '1.3.36.7.1.1': { d: 'bsiPKE', c: 'Teletrust key management' },
    '1.3.36.7.2': { d: 'keytrans', c: 'Teletrust key management' },
    '1.3.36.7.2.1': {
        d: 'encISO9796-2Withrsa',
        c: 'Teletrust key management. 9796-2 with key stored in hash field'
    },
    '1.3.36.8.1.1': {
        d: 'Teletrust SigGConform policyIdentifier',
        c: 'Teletrust policy'
    },
    '1.3.36.8.2.1': { d: 'directoryService', c: 'Teletrust extended key usage' },
    '1.3.36.8.3.1': { d: 'dateOfCertGen', c: 'Teletrust attribute' },
    '1.3.36.8.3.2': { d: 'procuration', c: 'Teletrust attribute' },
    '1.3.36.8.3.3': { d: 'admission', c: 'Teletrust attribute' },
    '1.3.36.8.3.4': { d: 'monetaryLimit', c: 'Teletrust attribute' },
    '1.3.36.8.3.5': { d: 'declarationOfMajority', c: 'Teletrust attribute' },
    '1.3.36.8.3.6': {
        d: 'integratedCircuitCardSerialNumber',
        c: 'Teletrust attribute'
    },
    '1.3.36.8.3.7': { d: 'pKReference', c: 'Teletrust attribute' },
    '1.3.36.8.3.8': { d: 'restriction', c: 'Teletrust attribute' },
    '1.3.36.8.3.9': { d: 'retrieveIfAllowed', c: 'Teletrust attribute' },
    '1.3.36.8.3.10': { d: 'requestedCertificate', c: 'Teletrust attribute' },
    '1.3.36.8.3.11': { d: 'namingAuthorities', c: 'Teletrust attribute' },
    '1.3.36.8.3.11.1': {
        d: 'rechtWirtschaftSteuern',
        c: 'Teletrust naming authorities'
    },
    '1.3.36.8.3.11.1.1': { d: 'rechtsanwaeltin', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.11.1.2': { d: 'rechtsanwalt', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.11.1.3': { d: 'rechtsBeistand', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.11.1.4': { d: 'steuerBeraterin', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.11.1.5': { d: 'steuerBerater', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.11.1.6': {
        d: 'steuerBevollmaechtigte',
        c: 'Teletrust ProfessionInfo'
    },
    '1.3.36.8.3.11.1.7': {
        d: 'steuerBevollmaechtigter',
        c: 'Teletrust ProfessionInfo'
    },
    '1.3.36.8.3.11.1.8': { d: 'notarin', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.11.1.9': { d: 'notar', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.11.1.10': {
        d: 'notarVertreterin',
        c: 'Teletrust ProfessionInfo'
    },
    '1.3.36.8.3.11.1.11': { d: 'notarVertreter', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.11.1.12': {
        d: 'notariatsVerwalterin',
        c: 'Teletrust ProfessionInfo'
    },
    '1.3.36.8.3.11.1.13': {
        d: 'notariatsVerwalter',
        c: 'Teletrust ProfessionInfo'
    },
    '1.3.36.8.3.11.1.14': {
        d: 'wirtschaftsPrueferin',
        c: 'Teletrust ProfessionInfo'
    },
    '1.3.36.8.3.11.1.15': {
        d: 'wirtschaftsPruefer',
        c: 'Teletrust ProfessionInfo'
    },
    '1.3.36.8.3.11.1.16': {
        d: 'vereidigteBuchprueferin',
        c: 'Teletrust ProfessionInfo'
    },
    '1.3.36.8.3.11.1.17': {
        d: 'vereidigterBuchpruefer',
        c: 'Teletrust ProfessionInfo'
    },
    '1.3.36.8.3.11.1.18': { d: 'patentAnwaeltin', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.11.1.19': { d: 'patentAnwalt', c: 'Teletrust ProfessionInfo' },
    '1.3.36.8.3.12': {
        d: 'certInDirSince',
        c: 'Teletrust OCSP attribute (obsolete)',
        w: true
    },
    '1.3.36.8.3.13': { d: 'certHash', c: 'Teletrust OCSP attribute' },
    '1.3.36.8.3.14': { d: 'nameAtBirth', c: 'Teletrust attribute' },
    '1.3.36.8.3.15': { d: 'additionalInformation', c: 'Teletrust attribute' },
    '1.3.36.8.4.1': { d: 'personalData', c: 'Teletrust OtherName attribute' },
    '1.3.36.8.4.8': {
        d: 'restriction',
        c: 'Teletrust attribute certificate attribute'
    },
    '1.3.36.8.5.1.1.1': {
        d: 'rsaIndicateSHA1',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.8.5.1.1.2': {
        d: 'rsaIndicateRIPEMD160',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.8.5.1.1.3': { d: 'rsaWithSHA1', c: 'Teletrust signature algorithm' },
    '1.3.36.8.5.1.1.4': {
        d: 'rsaWithRIPEMD160',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.8.5.1.2.1': { d: 'dsaExtended', c: 'Teletrust signature algorithm' },
    '1.3.36.8.5.1.2.2': {
        d: 'dsaWithRIPEMD160',
        c: 'Teletrust signature algorithm'
    },
    '1.3.36.8.6.1': { d: 'cert', c: 'Teletrust signature attributes' },
    '1.3.36.8.6.2': { d: 'certRef', c: 'Teletrust signature attributes' },
    '1.3.36.8.6.3': { d: 'attrCert', c: 'Teletrust signature attributes' },
    '1.3.36.8.6.4': { d: 'attrRef', c: 'Teletrust signature attributes' },
    '1.3.36.8.6.5': { d: 'fileName', c: 'Teletrust signature attributes' },
    '1.3.36.8.6.6': { d: 'storageTime', c: 'Teletrust signature attributes' },
    '1.3.36.8.6.7': { d: 'fileSize', c: 'Teletrust signature attributes' },
    '1.3.36.8.6.8': { d: 'location', c: 'Teletrust signature attributes' },
    '1.3.36.8.6.9': { d: 'sigNumber', c: 'Teletrust signature attributes' },
    '1.3.36.8.6.10': { d: 'autoGen', c: 'Teletrust signature attributes' },
    '1.3.36.8.7.1.1': { d: 'ptAdobeILL', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.2': { d: 'ptAmiPro', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.3': { d: 'ptAutoCAD', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.4': { d: 'ptBinary', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.5': { d: 'ptBMP', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.6': { d: 'ptCGM', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.7': { d: 'ptCorelCRT', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.8': { d: 'ptCorelDRW', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.9': { d: 'ptCorelEXC', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.10': { d: 'ptCorelPHT', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.11': { d: 'ptDraw', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.12': { d: 'ptDVI', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.13': { d: 'ptEPS', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.14': { d: 'ptExcel', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.15': { d: 'ptGEM', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.16': { d: 'ptGIF', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.17': { d: 'ptHPGL', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.18': { d: 'ptJPEG', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.19': { d: 'ptKodak', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.20': { d: 'ptLaTeX', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.21': { d: 'ptLotus', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.22': { d: 'ptLotusPIC', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.23': { d: 'ptMacPICT', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.24': { d: 'ptMacWord', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.25': { d: 'ptMSWfD', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.26': { d: 'ptMSWord', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.27': { d: 'ptMSWord2', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.28': { d: 'ptMSWord6', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.29': { d: 'ptMSWord8', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.30': { d: 'ptPDF', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.31': { d: 'ptPIF', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.32': { d: 'ptPostscript', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.33': { d: 'ptRTF', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.34': { d: 'ptSCITEX', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.35': { d: 'ptTAR', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.36': { d: 'ptTarga', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.37': { d: 'ptTeX', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.38': { d: 'ptText', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.39': { d: 'ptTIFF', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.40': { d: 'ptTIFF-FC', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.41': { d: 'ptUID', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.42': { d: 'ptUUEncode', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.43': { d: 'ptWMF', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.44': { d: 'ptWordPerfect', c: 'Teletrust presentation types' },
    '1.3.36.8.7.1.45': { d: 'ptWPGrph', c: 'Teletrust presentation types' },
    '1.3.101.1.4': { d: 'thawte-ce', c: 'Thawte' },
    '1.3.101.1.4.1': { d: 'strongExtranet', c: 'Thawte certificate extension' },
    '1.3.101.110': { d: 'curveX25519', c: 'ECDH 25519 key agreement algorithm' },
    '1.3.101.111': { d: 'curveX448', c: 'ECDH 448 key agreement algorithm' },
    '1.3.101.112': { d: 'curveEd25519', c: 'EdDSA 25519 signature algorithm' },
    '1.3.101.113': { d: 'curveEd448', c: 'EdDSA 448 signature algorithm' },
    '1.3.101.114': {
        d: 'curveEd25519ph',
        c: 'EdDSA 25519 pre-hash signature algorithm'
    },
    '1.3.101.115': {
        d: 'curveEd448ph',
        c: 'EdDSA 448 pre-hash signature algorithm'
    },
    '1.3.132.0.1': { d: 'sect163k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.2': { d: 'sect163r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.3': { d: 'sect239k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.4': { d: 'sect113r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.5': { d: 'sect113r2', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.6': { d: 'secp112r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.7': { d: 'secp112r2', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.8': { d: 'secp160r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.9': { d: 'secp160k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.10': { d: 'secp256k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.15': { d: 'sect163r2', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.16': { d: 'sect283k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.17': { d: 'sect283r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.22': { d: 'sect131r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.23': { d: 'sect131r2', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.24': { d: 'sect193r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.25': { d: 'sect193r2', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.26': { d: 'sect233k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.27': { d: 'sect233r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.28': { d: 'secp128r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.29': { d: 'secp128r2', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.30': { d: 'secp160r2', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.31': { d: 'secp192k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.32': { d: 'secp224k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.33': { d: 'secp224r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.34': { d: 'secp384r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.35': { d: 'secp521r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.36': { d: 'sect409k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.37': { d: 'sect409r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.38': { d: 'sect571k1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.0.39': { d: 'sect571r1', c: 'SECG (Certicom) named elliptic curve' },
    '1.3.132.1.11.1': {
        d: 'ecdhX963KDF-SHA256',
        c: 'SECG (Certicom) elliptic curve key agreement'
    },
    '1.3.132.1.11.2': {
        d: 'ecdhX963KDF-SHA384',
        c: 'SECG (Certicom) elliptic curve key agreement'
    },
    '1.3.132.1.11.3': {
        d: 'ecdhX963KDF-SHA512',
        c: 'SECG (Certicom) elliptic curve key agreement'
    },
    '1.3.133.16.840.9.44': { d: 'x944', c: 'X9.44' },
    '1.3.133.16.840.9.44.1': { d: 'x944Components', c: 'X9.44' },
    '1.3.133.16.840.9.44.1.1': { d: 'x944Kdf2', c: 'X9.44' },
    '1.3.133.16.840.9.44.1.2': { d: 'x944Kdf3', c: 'X9.44' },
    '1.3.133.16.840.9.84': { d: 'x984', c: 'X9.84' },
    '1.3.133.16.840.9.84.0': { d: 'x984Module', c: 'X9.84' },
    '1.3.133.16.840.9.84.0.1': { d: 'x984Biometrics', c: 'X9.84 Module' },
    '1.3.133.16.840.9.84.0.2': { d: 'x984CMS', c: 'X9.84 Module' },
    '1.3.133.16.840.9.84.0.3': { d: 'x984Identifiers', c: 'X9.84 Module' },
    '1.3.133.16.840.9.84.1': { d: 'x984Biometric', c: 'X9.84' },
    '1.3.133.16.840.9.84.1.0': {
        d: 'biometricUnknownType',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.1': { d: 'biometricBodyOdor', c: 'X9.84 Biometric' },
    '1.3.133.16.840.9.84.1.2': { d: 'biometricDNA', c: 'X9.84 Biometric' },
    '1.3.133.16.840.9.84.1.3': { d: 'biometricEarShape', c: 'X9.84 Biometric' },
    '1.3.133.16.840.9.84.1.4': {
        d: 'biometricFacialFeatures',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.5': {
        d: 'biometricFingerImage',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.6': {
        d: 'biometricFingerGeometry',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.7': {
        d: 'biometricHandGeometry',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.8': {
        d: 'biometricIrisFeatures',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.9': {
        d: 'biometricKeystrokeDynamics',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.10': { d: 'biometricPalm', c: 'X9.84 Biometric' },
    '1.3.133.16.840.9.84.1.11': { d: 'biometricRetina', c: 'X9.84 Biometric' },
    '1.3.133.16.840.9.84.1.12': { d: 'biometricSignature', c: 'X9.84 Biometric' },
    '1.3.133.16.840.9.84.1.13': {
        d: 'biometricSpeechPattern',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.14': {
        d: 'biometricThermalImage',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.15': {
        d: 'biometricVeinPattern',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.16': {
        d: 'biometricThermalFaceImage',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.17': {
        d: 'biometricThermalHandImage',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.18': {
        d: 'biometricLipMovement',
        c: 'X9.84 Biometric'
    },
    '1.3.133.16.840.9.84.1.19': { d: 'biometricGait', c: 'X9.84 Biometric' },
    '1.3.133.16.840.9.84.3': { d: 'x984MatchingMethod', c: 'X9.84' },
    '1.3.133.16.840.9.84.4': { d: 'x984FormatOwner', c: 'X9.84' },
    '1.3.133.16.840.9.84.4.0': { d: 'x984CbeffOwner', c: 'X9.84 Format Owner' },
    '1.3.133.16.840.9.84.4.1': { d: 'x984IbiaOwner', c: 'X9.84 Format Owner' },
    '1.3.133.16.840.9.84.4.1.1': {
        d: 'ibiaOwnerSAFLINK',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.2': {
        d: 'ibiaOwnerBioscrypt',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.3': {
        d: 'ibiaOwnerVisionics',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.4': {
        d: 'ibiaOwnerInfineonTechnologiesAG',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.5': {
        d: 'ibiaOwnerIridianTechnologies',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.6': {
        d: 'ibiaOwnerVeridicom',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.7': {
        d: 'ibiaOwnerCyberSIGN',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.8': {
        d: 'ibiaOwnereCryp',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.9': {
        d: 'ibiaOwnerFingerprintCardsAB',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.10': {
        d: 'ibiaOwnerSecuGen',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.11': {
        d: 'ibiaOwnerPreciseBiometric',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.12': {
        d: 'ibiaOwnerIdentix',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.13': {
        d: 'ibiaOwnerDERMALOG',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.14': {
        d: 'ibiaOwnerLOGICO',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.15': {
        d: 'ibiaOwnerNIST',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.16': {
        d: 'ibiaOwnerA3Vision',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.17': {
        d: 'ibiaOwnerNEC',
        c: 'X9.84 IBIA Format Owner'
    },
    '1.3.133.16.840.9.84.4.1.18': {
        d: 'ibiaOwnerSTMicroelectronics',
        c: 'X9.84 IBIA Format Owner'
    },
    '2.5.4.0': { d: 'objectClass', c: 'X.520 DN component' },
    '2.5.4.1': { d: 'aliasedEntryName', c: 'X.520 DN component' },
    '2.5.4.2': { d: 'knowledgeInformation', c: 'X.520 DN component' },
    '2.5.4.3': { d: 'commonName', c: 'X.520 DN component' },
    '2.5.4.4': { d: 'surname', c: 'X.520 DN component' },
    '2.5.4.5': { d: 'serialNumber', c: 'X.520 DN component' },
    '2.5.4.6': { d: 'countryName', c: 'X.520 DN component' },
    '2.5.4.7': { d: 'localityName', c: 'X.520 DN component' },
    '2.5.4.7.1': { d: 'collectiveLocalityName', c: 'X.520 DN component' },
    '2.5.4.8': { d: 'stateOrProvinceName', c: 'X.520 DN component' },
    '2.5.4.8.1': { d: 'collectiveStateOrProvinceName', c: 'X.520 DN component' },
    '2.5.4.9': { d: 'streetAddress', c: 'X.520 DN component' },
    '2.5.4.9.1': { d: 'collectiveStreetAddress', c: 'X.520 DN component' },
    '2.5.4.10': { d: 'organizationName', c: 'X.520 DN component' },
    '2.5.4.10.1': { d: 'collectiveOrganizationName', c: 'X.520 DN component' },
    '2.5.4.11': { d: 'organizationalUnitName', c: 'X.520 DN component' },
    '2.5.4.11.1': {
        d: 'collectiveOrganizationalUnitName',
        c: 'X.520 DN component'
    },
    '2.5.4.12': { d: 'title', c: 'X.520 DN component' },
    '2.5.4.13': { d: 'description', c: 'X.520 DN component' },
    '2.5.4.14': { d: 'searchGuide', c: 'X.520 DN component' },
    '2.5.4.15': { d: 'businessCategory', c: 'X.520 DN component' },
    '2.5.4.16': { d: 'postalAddress', c: 'X.520 DN component' },
    '2.5.4.16.1': { d: 'collectivePostalAddress', c: 'X.520 DN component' },
    '2.5.4.17': { d: 'postalCode', c: 'X.520 DN component' },
    '2.5.4.17.1': { d: 'collectivePostalCode', c: 'X.520 DN component' },
    '2.5.4.18': { d: 'postOfficeBox', c: 'X.520 DN component' },
    '2.5.4.18.1': { d: 'collectivePostOfficeBox', c: 'X.520 DN component' },
    '2.5.4.19': { d: 'physicalDeliveryOfficeName', c: 'X.520 DN component' },
    '2.5.4.19.1': {
        d: 'collectivePhysicalDeliveryOfficeName',
        c: 'X.520 DN component'
    },
    '2.5.4.20': { d: 'telephoneNumber', c: 'X.520 DN component' },
    '2.5.4.20.1': { d: 'collectiveTelephoneNumber', c: 'X.520 DN component' },
    '2.5.4.21': { d: 'telexNumber', c: 'X.520 DN component' },
    '2.5.4.21.1': { d: 'collectiveTelexNumber', c: 'X.520 DN component' },
    '2.5.4.22': { d: 'teletexTerminalIdentifier', c: 'X.520 DN component' },
    '2.5.4.22.1': {
        d: 'collectiveTeletexTerminalIdentifier',
        c: 'X.520 DN component'
    },
    '2.5.4.23': { d: 'facsimileTelephoneNumber', c: 'X.520 DN component' },
    '2.5.4.23.1': {
        d: 'collectiveFacsimileTelephoneNumber',
        c: 'X.520 DN component'
    },
    '2.5.4.24': { d: 'x121Address', c: 'X.520 DN component' },
    '2.5.4.25': { d: 'internationalISDNNumber', c: 'X.520 DN component' },
    '2.5.4.25.1': {
        d: 'collectiveInternationalISDNNumber',
        c: 'X.520 DN component'
    },
    '2.5.4.26': { d: 'registeredAddress', c: 'X.520 DN component' },
    '2.5.4.27': { d: 'destinationIndicator', c: 'X.520 DN component' },
    '2.5.4.28': { d: 'preferredDeliveryMehtod', c: 'X.520 DN component' },
    '2.5.4.29': { d: 'presentationAddress', c: 'X.520 DN component' },
    '2.5.4.30': { d: 'supportedApplicationContext', c: 'X.520 DN component' },
    '2.5.4.31': { d: 'member', c: 'X.520 DN component' },
    '2.5.4.32': { d: 'owner', c: 'X.520 DN component' },
    '2.5.4.33': { d: 'roleOccupant', c: 'X.520 DN component' },
    '2.5.4.34': { d: 'seeAlso', c: 'X.520 DN component' },
    '2.5.4.35': { d: 'userPassword', c: 'X.520 DN component' },
    '2.5.4.36': { d: 'userCertificate', c: 'X.520 DN component' },
    '2.5.4.37': { d: 'caCertificate', c: 'X.520 DN component' },
    '2.5.4.38': { d: 'authorityRevocationList', c: 'X.520 DN component' },
    '2.5.4.39': { d: 'certificateRevocationList', c: 'X.520 DN component' },
    '2.5.4.40': { d: 'crossCertificatePair', c: 'X.520 DN component' },
    '2.5.4.41': { d: 'name', c: 'X.520 DN component' },
    '2.5.4.42': { d: 'givenName', c: 'X.520 DN component' },
    '2.5.4.43': { d: 'initials', c: 'X.520 DN component' },
    '2.5.4.44': { d: 'generationQualifier', c: 'X.520 DN component' },
    '2.5.4.45': { d: 'uniqueIdentifier', c: 'X.520 DN component' },
    '2.5.4.46': { d: 'dnQualifier', c: 'X.520 DN component' },
    '2.5.4.47': { d: 'enhancedSearchGuide', c: 'X.520 DN component' },
    '2.5.4.48': { d: 'protocolInformation', c: 'X.520 DN component' },
    '2.5.4.49': { d: 'distinguishedName', c: 'X.520 DN component' },
    '2.5.4.50': { d: 'uniqueMember', c: 'X.520 DN component' },
    '2.5.4.51': { d: 'houseIdentifier', c: 'X.520 DN component' },
    '2.5.4.52': { d: 'supportedAlgorithms', c: 'X.520 DN component' },
    '2.5.4.53': { d: 'deltaRevocationList', c: 'X.520 DN component' },
    '2.5.4.54': { d: 'dmdName', c: 'X.520 DN component' },
    '2.5.4.55': { d: 'clearance', c: 'X.520 DN component' },
    '2.5.4.56': { d: 'defaultDirQop', c: 'X.520 DN component' },
    '2.5.4.57': { d: 'attributeIntegrityInfo', c: 'X.520 DN component' },
    '2.5.4.58': { d: 'attributeCertificate', c: 'X.520 DN component' },
    '2.5.4.59': {
        d: 'attributeCertificateRevocationList',
        c: 'X.520 DN component'
    },
    '2.5.4.60': { d: 'confKeyInfo', c: 'X.520 DN component' },
    '2.5.4.61': { d: 'aACertificate', c: 'X.520 DN component' },
    '2.5.4.62': { d: 'attributeDescriptorCertificate', c: 'X.520 DN component' },
    '2.5.4.63': {
        d: 'attributeAuthorityRevocationList',
        c: 'X.520 DN component'
    },
    '2.5.4.64': { d: 'familyInformation', c: 'X.520 DN component' },
    '2.5.4.65': { d: 'pseudonym', c: 'X.520 DN component' },
    '2.5.4.66': { d: 'communicationsService', c: 'X.520 DN component' },
    '2.5.4.67': { d: 'communicationsNetwork', c: 'X.520 DN component' },
    '2.5.4.68': { d: 'certificationPracticeStmt', c: 'X.520 DN component' },
    '2.5.4.69': { d: 'certificatePolicy', c: 'X.520 DN component' },
    '2.5.4.70': { d: 'pkiPath', c: 'X.520 DN component' },
    '2.5.4.71': { d: 'privPolicy', c: 'X.520 DN component' },
    '2.5.4.72': { d: 'role', c: 'X.520 DN component' },
    '2.5.4.73': { d: 'delegationPath', c: 'X.520 DN component' },
    '2.5.4.74': { d: 'protPrivPolicy', c: 'X.520 DN component' },
    '2.5.4.75': { d: 'xMLPrivilegeInfo', c: 'X.520 DN component' },
    '2.5.4.76': { d: 'xmlPrivPolicy', c: 'X.520 DN component' },
    '2.5.4.77': { d: 'uuidpair', c: 'X.520 DN component' },
    '2.5.4.78': { d: 'tagOid', c: 'X.520 DN component' },
    '2.5.4.79': { d: 'uiiFormat', c: 'X.520 DN component' },
    '2.5.4.80': { d: 'uiiInUrh', c: 'X.520 DN component' },
    '2.5.4.81': { d: 'contentUrl', c: 'X.520 DN component' },
    '2.5.4.82': { d: 'permission', c: 'X.520 DN component' },
    '2.5.4.83': { d: 'uri', c: 'X.520 DN component' },
    '2.5.4.84': { d: 'pwdAttribute', c: 'X.520 DN component' },
    '2.5.4.85': { d: 'userPwd', c: 'X.520 DN component' },
    '2.5.4.86': { d: 'urn', c: 'X.520 DN component' },
    '2.5.4.87': { d: 'url', c: 'X.520 DN component' },
    '2.5.4.88': { d: 'utmCoordinates', c: 'X.520 DN component' },
    '2.5.4.89': { d: 'urnC', c: 'X.520 DN component' },
    '2.5.4.90': { d: 'uii', c: 'X.520 DN component' },
    '2.5.4.91': { d: 'epc', c: 'X.520 DN component' },
    '2.5.4.92': { d: 'tagAfi', c: 'X.520 DN component' },
    '2.5.4.93': { d: 'epcFormat', c: 'X.520 DN component' },
    '2.5.4.94': { d: 'epcInUrn', c: 'X.520 DN component' },
    '2.5.4.95': { d: 'ldapUrl', c: 'X.520 DN component' },
    '2.5.4.96': { d: 'tagLocation', c: 'X.520 DN component' },
    '2.5.4.97': { d: 'organizationIdentifier', c: 'X.520 DN component' },
    '2.5.4.98': { d: 'countryCode3c', c: 'X.520 DN component' },
    '2.5.4.99': { d: 'countryCode3n', c: 'X.520 DN component' },
    '2.5.4.100': { d: 'dnsName', c: 'X.520 DN component' },
    '2.5.4.101': { d: 'eepkCertificateRevocationList', c: 'X.520 DN component' },
    '2.5.4.102': {
        d: 'eeAttrCertificateRevocationList',
        c: 'X.520 DN component'
    },
    '2.5.4.103': { d: 'supportedPublicKeyAlgorithms', c: 'X.520 DN component' },
    '2.5.4.104': { d: 'intEmail', c: 'X.520 DN component' },
    '2.5.4.105': { d: 'jid', c: 'X.520 DN component' },
    '2.5.4.106': { d: 'objectIdentifier', c: 'X.520 DN component' },
    '2.5.6.0': { d: 'top', c: 'X.520 objectClass' },
    '2.5.6.1': { d: 'alias', c: 'X.520 objectClass' },
    '2.5.6.2': { d: 'country', c: 'X.520 objectClass' },
    '2.5.6.3': { d: 'locality', c: 'X.520 objectClass' },
    '2.5.6.4': { d: 'organization', c: 'X.520 objectClass' },
    '2.5.6.5': { d: 'organizationalUnit', c: 'X.520 objectClass' },
    '2.5.6.6': { d: 'person', c: 'X.520 objectClass' },
    '2.5.6.7': { d: 'organizationalPerson', c: 'X.520 objectClass' },
    '2.5.6.8': { d: 'organizationalRole', c: 'X.520 objectClass' },
    '2.5.6.9': { d: 'groupOfNames', c: 'X.520 objectClass' },
    '2.5.6.10': { d: 'residentialPerson', c: 'X.520 objectClass' },
    '2.5.6.11': { d: 'applicationProcess', c: 'X.520 objectClass' },
    '2.5.6.12': { d: 'applicationEntity', c: 'X.520 objectClass' },
    '2.5.6.13': { d: 'dSA', c: 'X.520 objectClass' },
    '2.5.6.14': { d: 'device', c: 'X.520 objectClass' },
    '2.5.6.15': { d: 'strongAuthenticationUser', c: 'X.520 objectClass' },
    '2.5.6.16': { d: 'certificateAuthority', c: 'X.520 objectClass' },
    '2.5.6.17': { d: 'groupOfUniqueNames', c: 'X.520 objectClass' },
    '2.5.6.21': { d: 'pkiUser', c: 'X.520 objectClass' },
    '2.5.6.22': { d: 'pkiCA', c: 'X.520 objectClass' },
    '2.5.8.1.1': {
        d: 'rsa',
        c: 'X.500 algorithms.  Ambiguous, since no padding rules specified',
        w: true
    },
    '2.5.29.1': {
        d: 'authorityKeyIdentifier',
        c: 'X.509 extension.  Deprecated, use 2 5 29 35 instead',
        w: true
    },
    '2.5.29.2': {
        d: 'keyAttributes',
        c: 'X.509 extension.  Obsolete, use keyUsage/extKeyUsage instead',
        w: true
    },
    '2.5.29.3': {
        d: 'certificatePolicies',
        c: 'X.509 extension.  Deprecated, use 2 5 29 32 instead',
        w: true
    },
    '2.5.29.4': {
        d: 'keyUsageRestriction',
        c: 'X.509 extension.  Obsolete, use keyUsage/extKeyUsage instead',
        w: true
    },
    '2.5.29.5': {
        d: 'policyMapping',
        c: 'X.509 extension.  Deprecated, use 2 5 29 33 instead',
        w: true
    },
    '2.5.29.6': {
        d: 'subtreesConstraint',
        c: 'X.509 extension.  Obsolete, use nameConstraints instead',
        w: true
    },
    '2.5.29.7': {
        d: 'subjectAltName',
        c: 'X.509 extension.  Deprecated, use 2 5 29 17 instead',
        w: true
    },
    '2.5.29.8': {
        d: 'issuerAltName',
        c: 'X.509 extension.  Deprecated, use 2 5 29 18 instead',
        w: true
    },
    '2.5.29.9': { d: 'subjectDirectoryAttributes', c: 'X.509 extension' },
    '2.5.29.10': {
        d: 'basicConstraints',
        c: 'X.509 extension.  Deprecated, use 2 5 29 19 instead',
        w: true
    },
    '2.5.29.11': {
        d: 'nameConstraints',
        c: 'X.509 extension.  Deprecated, use 2 5 29 30 instead',
        w: true
    },
    '2.5.29.12': {
        d: 'policyConstraints',
        c: 'X.509 extension.  Deprecated, use 2 5 29 36 instead',
        w: true
    },
    '2.5.29.13': {
        d: 'basicConstraints',
        c: 'X.509 extension.  Deprecated, use 2 5 29 19 instead',
        w: true
    },
    '2.5.29.14': { d: 'subjectKeyIdentifier', c: 'X.509 extension' },
    '2.5.29.15': { d: 'keyUsage', c: 'X.509 extension' },
    '2.5.29.16': { d: 'privateKeyUsagePeriod', c: 'X.509 extension' },
    '2.5.29.17': { d: 'subjectAltName', c: 'X.509 extension' },
    '2.5.29.18': { d: 'issuerAltName', c: 'X.509 extension' },
    '2.5.29.19': { d: 'basicConstraints', c: 'X.509 extension' },
    '2.5.29.20': { d: 'cRLNumber', c: 'X.509 extension' },
    '2.5.29.21': { d: 'cRLReason', c: 'X.509 extension' },
    '2.5.29.22': {
        d: 'expirationDate',
        c: 'X.509 extension.  Deprecated, alternative OID uncertain',
        w: true
    },
    '2.5.29.23': { d: 'instructionCode', c: 'X.509 extension' },
    '2.5.29.24': { d: 'invalidityDate', c: 'X.509 extension' },
    '2.5.29.25': {
        d: 'cRLDistributionPoints',
        c: 'X.509 extension.  Deprecated, use 2 5 29 31 instead',
        w: true
    },
    '2.5.29.26': {
        d: 'issuingDistributionPoint',
        c: 'X.509 extension.  Deprecated, use 2 5 29 28 instead',
        w: true
    },
    '2.5.29.27': { d: 'deltaCRLIndicator', c: 'X.509 extension' },
    '2.5.29.28': { d: 'issuingDistributionPoint', c: 'X.509 extension' },
    '2.5.29.29': { d: 'certificateIssuer', c: 'X.509 extension' },
    '2.5.29.30': { d: 'nameConstraints', c: 'X.509 extension' },
    '2.5.29.31': { d: 'cRLDistributionPoints', c: 'X.509 extension' },
    '2.5.29.32': { d: 'certificatePolicies', c: 'X.509 extension' },
    '2.5.29.32.0': { d: 'anyPolicy', c: 'X.509 certificate policy' },
    '2.5.29.33': { d: 'policyMappings', c: 'X.509 extension' },
    '2.5.29.34': {
        d: 'policyConstraints',
        c: 'X.509 extension.  Deprecated, use 2 5 29 36 instead',
        w: true
    },
    '2.5.29.35': { d: 'authorityKeyIdentifier', c: 'X.509 extension' },
    '2.5.29.36': { d: 'policyConstraints', c: 'X.509 extension' },
    '2.5.29.37': { d: 'extKeyUsage', c: 'X.509 extension' },
    '2.5.29.37.0': { d: 'anyExtendedKeyUsage', c: 'X.509 extended key usage' },
    '2.5.29.38': { d: 'authorityAttributeIdentifier', c: 'X.509 extension' },
    '2.5.29.39': { d: 'roleSpecCertIdentifier', c: 'X.509 extension' },
    '2.5.29.40': { d: 'cRLStreamIdentifier', c: 'X.509 extension' },
    '2.5.29.41': { d: 'basicAttConstraints', c: 'X.509 extension' },
    '2.5.29.42': { d: 'delegatedNameConstraints', c: 'X.509 extension' },
    '2.5.29.43': { d: 'timeSpecification', c: 'X.509 extension' },
    '2.5.29.44': { d: 'cRLScope', c: 'X.509 extension' },
    '2.5.29.45': { d: 'statusReferrals', c: 'X.509 extension' },
    '2.5.29.46': { d: 'freshestCRL', c: 'X.509 extension' },
    '2.5.29.47': { d: 'orderedList', c: 'X.509 extension' },
    '2.5.29.48': { d: 'attributeDescriptor', c: 'X.509 extension' },
    '2.5.29.49': { d: 'userNotice', c: 'X.509 extension' },
    '2.5.29.50': { d: 'sOAIdentifier', c: 'X.509 extension' },
    '2.5.29.51': { d: 'baseUpdateTime', c: 'X.509 extension' },
    '2.5.29.52': { d: 'acceptableCertPolicies', c: 'X.509 extension' },
    '2.5.29.53': { d: 'deltaInfo', c: 'X.509 extension' },
    '2.5.29.54': { d: 'inhibitAnyPolicy', c: 'X.509 extension' },
    '2.5.29.55': { d: 'targetInformation', c: 'X.509 extension' },
    '2.5.29.56': { d: 'noRevAvail', c: 'X.509 extension' },
    '2.5.29.57': { d: 'acceptablePrivilegePolicies', c: 'X.509 extension' },
    '2.5.29.58': { d: 'toBeRevoked', c: 'X.509 extension' },
    '2.5.29.59': { d: 'revokedGroups', c: 'X.509 extension' },
    '2.5.29.60': { d: 'expiredCertsOnCRL', c: 'X.509 extension' },
    '2.5.29.61': { d: 'indirectIssuer', c: 'X.509 extension' },
    '2.5.29.62': { d: 'noAssertion', c: 'X.509 extension' },
    '2.5.29.63': { d: 'aAissuingDistributionPoint', c: 'X.509 extension' },
    '2.5.29.64': { d: 'issuedOnBehalfOf', c: 'X.509 extension' },
    '2.5.29.65': { d: 'singleUse', c: 'X.509 extension' },
    '2.5.29.66': { d: 'groupAC', c: 'X.509 extension' },
    '2.5.29.67': { d: 'allowedAttAss', c: 'X.509 extension' },
    '2.5.29.68': { d: 'attributeMappings', c: 'X.509 extension' },
    '2.5.29.69': { d: 'holderNameConstraints', c: 'X.509 extension' },
    '2.16.724.1.2.2.4.1': { d: 'personalDataInfo', c: 'Spanish Government PKI?' },
    '2.16.840.1.101.2.1.1.1': {
        d: 'sdnsSignatureAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.2': {
        d: 'fortezzaSignatureAlgorithm',
        c: 'SDN.700 INFOSEC algorithms.  Formerly known as mosaicSignatureAlgorithm, this OID is better known as dsaWithSHA-1.'
    },
    '2.16.840.1.101.2.1.1.3': {
        d: 'sdnsConfidentialityAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.4': {
        d: 'fortezzaConfidentialityAlgorithm',
        c: 'SDN.700 INFOSEC algorithms.  Formerly known as mosaicConfidentialityAlgorithm'
    },
    '2.16.840.1.101.2.1.1.5': {
        d: 'sdnsIntegrityAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.6': {
        d: 'fortezzaIntegrityAlgorithm',
        c: 'SDN.700 INFOSEC algorithms.  Formerly known as mosaicIntegrityAlgorithm'
    },
    '2.16.840.1.101.2.1.1.7': {
        d: 'sdnsTokenProtectionAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.8': {
        d: 'fortezzaTokenProtectionAlgorithm',
        c: 'SDN.700 INFOSEC algorithms.  Formerly know as mosaicTokenProtectionAlgorithm'
    },
    '2.16.840.1.101.2.1.1.9': {
        d: 'sdnsKeyManagementAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.10': {
        d: 'fortezzaKeyManagementAlgorithm',
        c: 'SDN.700 INFOSEC algorithms.  Formerly known as mosaicKeyManagementAlgorithm'
    },
    '2.16.840.1.101.2.1.1.11': {
        d: 'sdnsKMandSigAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.12': {
        d: 'fortezzaKMandSigAlgorithm',
        c: 'SDN.700 INFOSEC algorithms.  Formerly known as mosaicKMandSigAlgorithm'
    },
    '2.16.840.1.101.2.1.1.13': {
        d: 'suiteASignatureAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.14': {
        d: 'suiteAConfidentialityAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.15': {
        d: 'suiteAIntegrityAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.16': {
        d: 'suiteATokenProtectionAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.17': {
        d: 'suiteAKeyManagementAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.18': {
        d: 'suiteAKMandSigAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.19': {
        d: 'fortezzaUpdatedSigAlgorithm',
        c: 'SDN.700 INFOSEC algorithms.  Formerly known as mosaicUpdatedSigAlgorithm'
    },
    '2.16.840.1.101.2.1.1.20': {
        d: 'fortezzaKMandUpdSigAlgorithms',
        c: 'SDN.700 INFOSEC algorithms.  Formerly known as mosaicKMandUpdSigAlgorithms'
    },
    '2.16.840.1.101.2.1.1.21': {
        d: 'fortezzaUpdatedIntegAlgorithm',
        c: 'SDN.700 INFOSEC algorithms.  Formerly known as mosaicUpdatedIntegAlgorithm'
    },
    '2.16.840.1.101.2.1.1.22': {
        d: 'keyExchangeAlgorithm',
        c: 'SDN.700 INFOSEC algorithms.  Formerly known as mosaicKeyEncryptionAlgorithm'
    },
    '2.16.840.1.101.2.1.1.23': {
        d: 'fortezzaWrap80Algorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.1.24': {
        d: 'kEAKeyEncryptionAlgorithm',
        c: 'SDN.700 INFOSEC algorithms'
    },
    '2.16.840.1.101.2.1.2.1': {
        d: 'rfc822MessageFormat',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.2': { d: 'emptyContent', c: 'SDN.700 INFOSEC format' },
    '2.16.840.1.101.2.1.2.3': {
        d: 'cspContentType',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.42': {
        d: 'mspRev3ContentType',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.48': {
        d: 'mspContentType',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.49': {
        d: 'mspRekeyAgentProtocol',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.50': { d: 'mspMMP', c: 'SDN.700 INFOSEC format' },
    '2.16.840.1.101.2.1.2.66': {
        d: 'mspRev3-1ContentType',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.72': {
        d: 'forwardedMSPMessageBodyPart',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.73': {
        d: 'mspForwardedMessageParameters',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.74': {
        d: 'forwardedCSPMsgBodyPart',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.75': {
        d: 'cspForwardedMessageParameters',
        c: 'SDN.700 INFOSEC format'
    },
    '2.16.840.1.101.2.1.2.76': { d: 'mspMMP2', c: 'SDN.700 INFOSEC format' },
    '2.16.840.1.101.2.1.2.78.2': {
        d: 'encryptedKeyPackage',
        c: 'SDN.700 INFOSEC format and RFC 6032'
    },
    '2.16.840.1.101.2.1.2.78.3': {
        d: 'keyPackageReceipt',
        c: 'SDN.700 INFOSEC format and RFC 7191'
    },
    '2.16.840.1.101.2.1.2.78.6': {
        d: 'keyPackageError',
        c: 'SDN.700 INFOSEC format and RFC 7191'
    },
    '2.16.840.1.101.2.1.3.1': {
        d: 'sdnsSecurityPolicy',
        c: 'SDN.700 INFOSEC policy'
    },
    '2.16.840.1.101.2.1.3.2': { d: 'sdnsPRBAC', c: 'SDN.700 INFOSEC policy' },
    '2.16.840.1.101.2.1.3.3': { d: 'mosaicPRBAC', c: 'SDN.700 INFOSEC policy' },
    '2.16.840.1.101.2.1.3.10': {
        d: 'siSecurityPolicy',
        c: 'SDN.700 INFOSEC policy'
    },
    '2.16.840.1.101.2.1.3.10.0': {
        d: 'siNASP',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.1': {
        d: 'siELCO',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.2': {
        d: 'siTK',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.3': {
        d: 'siDSAP',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.4': {
        d: 'siSSSS',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.5': {
        d: 'siDNASP',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.6': {
        d: 'siBYEMAN',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.7': {
        d: 'siREL-US',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.8': {
        d: 'siREL-AUS',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.9': {
        d: 'siREL-CAN',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.10': {
        d: 'siREL_UK',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.11': {
        d: 'siREL-NZ',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.10.12': {
        d: 'siGeneric',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.11': { d: 'genser', c: 'SDN.700 INFOSEC policy' },
    '2.16.840.1.101.2.1.3.11.0': {
        d: 'genserNations',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.11.1': {
        d: 'genserComsec',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.11.2': {
        d: 'genserAcquisition',
        c: 'SDN.700 INFOSEC policy (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.3.11.3': {
        d: 'genserSecurityCategories',
        c: 'SDN.700 INFOSEC policy'
    },
    '2.16.840.1.101.2.1.3.11.3.0': {
        d: 'genserTagSetName',
        c: 'SDN.700 INFOSEC GENSER policy'
    },
    '2.16.840.1.101.2.1.3.12': {
        d: 'defaultSecurityPolicy',
        c: 'SDN.700 INFOSEC policy'
    },
    '2.16.840.1.101.2.1.3.13': {
        d: 'capcoMarkings',
        c: 'SDN.700 INFOSEC policy'
    },
    '2.16.840.1.101.2.1.3.13.0': {
        d: 'capcoSecurityCategories',
        c: 'SDN.700 INFOSEC policy CAPCO markings'
    },
    '2.16.840.1.101.2.1.3.13.0.1': {
        d: 'capcoTagSetName1',
        c: 'SDN.700 INFOSEC policy CAPCO markings'
    },
    '2.16.840.1.101.2.1.3.13.0.2': {
        d: 'capcoTagSetName2',
        c: 'SDN.700 INFOSEC policy CAPCO markings'
    },
    '2.16.840.1.101.2.1.3.13.0.3': {
        d: 'capcoTagSetName3',
        c: 'SDN.700 INFOSEC policy CAPCO markings'
    },
    '2.16.840.1.101.2.1.3.13.0.4': {
        d: 'capcoTagSetName4',
        c: 'SDN.700 INFOSEC policy CAPCO markings'
    },
    '2.16.840.1.101.2.1.5.1': {
        d: 'sdnsKeyManagementCertificate',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.2': {
        d: 'sdnsUserSignatureCertificate',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.3': {
        d: 'sdnsKMandSigCertificate',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.4': {
        d: 'fortezzaKeyManagementCertificate',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.5': {
        d: 'fortezzaKMandSigCertificate',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.6': {
        d: 'fortezzaUserSignatureCertificate',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.7': {
        d: 'fortezzaCASignatureCertificate',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.8': {
        d: 'sdnsCASignatureCertificate',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.10': {
        d: 'auxiliaryVector',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.11': {
        d: 'mlReceiptPolicy',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.12': {
        d: 'mlMembership',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.13': {
        d: 'mlAdministrators',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.14': { d: 'alid', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.20': { d: 'janUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.21': { d: 'febUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.22': { d: 'marUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.23': { d: 'aprUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.24': { d: 'mayUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.25': { d: 'junUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.26': { d: 'julUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.27': { d: 'augUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.28': { d: 'sepUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.29': { d: 'octUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.30': { d: 'novUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.31': { d: 'decUKMs', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.40': {
        d: 'metaSDNSckl',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.41': { d: 'sdnsCKL', c: 'SDN.700 INFOSEC attributes' },
    '2.16.840.1.101.2.1.5.42': {
        d: 'metaSDNSsignatureCKL',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.43': {
        d: 'sdnsSignatureCKL',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.44': {
        d: 'sdnsCertificateRevocationList',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.45': {
        d: 'fortezzaCertificateRevocationList',
        c: 'SDN.700 INFOSEC attributes (superseded)',
        w: true
    },
    '2.16.840.1.101.2.1.5.46': {
        d: 'fortezzaCKL',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.47': {
        d: 'alExemptedAddressProcessor',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.48': {
        d: 'guard',
        c: 'SDN.700 INFOSEC attributes (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.5.49': {
        d: 'algorithmsSupported',
        c: 'SDN.700 INFOSEC attributes (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.5.50': {
        d: 'suiteAKeyManagementCertificate',
        c: 'SDN.700 INFOSEC attributes (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.5.51': {
        d: 'suiteAKMandSigCertificate',
        c: 'SDN.700 INFOSEC attributes (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.5.52': {
        d: 'suiteAUserSignatureCertificate',
        c: 'SDN.700 INFOSEC attributes (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.5.53': {
        d: 'prbacInfo',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.54': {
        d: 'prbacCAConstraints',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.55': {
        d: 'sigOrKMPrivileges',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.56': {
        d: 'commPrivileges',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.57': {
        d: 'labeledAttribute',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.58': {
        d: 'policyInformationFile',
        c: 'SDN.700 INFOSEC attributes (obsolete)',
        w: true
    },
    '2.16.840.1.101.2.1.5.59': {
        d: 'secPolicyInformationFile',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.60': {
        d: 'cAClearanceConstraint',
        c: 'SDN.700 INFOSEC attributes'
    },
    '2.16.840.1.101.2.1.5.65': {
        d: 'keyPkgIdAndReceiptReq',
        c: 'SDN.700 INFOSEC attributes and RFC 7191'
    },
    '2.16.840.1.101.2.1.5.66': {
        d: 'contentDecryptKeyID',
        c: 'SDN.700 INFOSEC attributes and RFC 6032'
    },
    '2.16.840.1.101.2.1.5.70': {
        d: 'kpCrlPointers',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.5.71': {
        d: 'kpKeyProvinceV2',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.5.72': {
        d: 'kpManifest',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.7.1': { d: 'cspExtns', c: 'SDN.700 INFOSEC extensions' },
    '2.16.840.1.101.2.1.7.1.0': {
        d: 'cspCsExtn',
        c: 'SDN.700 INFOSEC extensions'
    },
    '2.16.840.1.101.2.1.8.1': {
        d: 'mISSISecurityCategories',
        c: 'SDN.700 INFOSEC security category'
    },
    '2.16.840.1.101.2.1.8.2': {
        d: 'standardSecurityLabelPrivileges',
        c: 'SDN.700 INFOSEC security category'
    },
    '2.16.840.1.101.2.1.8.3.1': {
        d: 'enumeratedPermissiveAttrs',
        c: 'SDN.700 INFOSEC security category from RFC 7906'
    },
    '2.16.840.1.101.2.1.8.3.3': {
        d: 'informativeAttrs',
        c: 'SDN.700 INFOSEC security category from RFC 7906'
    },
    '2.16.840.1.101.2.1.8.3.4': {
        d: 'enumeratedRestrictiveAttrs',
        c: 'SDN.700 INFOSEC security category from RFC 7906'
    },
    '2.16.840.1.101.2.1.10.1': {
        d: 'sigPrivileges',
        c: 'SDN.700 INFOSEC privileges'
    },
    '2.16.840.1.101.2.1.10.2': {
        d: 'kmPrivileges',
        c: 'SDN.700 INFOSEC privileges'
    },
    '2.16.840.1.101.2.1.10.3': {
        d: 'namedTagSetPrivilege',
        c: 'SDN.700 INFOSEC privileges'
    },
    '2.16.840.1.101.2.1.11.1': {
        d: 'ukDemo',
        c: 'SDN.700 INFOSEC certificate policy'
    },
    '2.16.840.1.101.2.1.11.2': {
        d: 'usDODClass2',
        c: 'SDN.700 INFOSEC certificate policy'
    },
    '2.16.840.1.101.2.1.11.3': {
        d: 'usMediumPilot',
        c: 'SDN.700 INFOSEC certificate policy'
    },
    '2.16.840.1.101.2.1.11.4': {
        d: 'usDODClass4',
        c: 'SDN.700 INFOSEC certificate policy'
    },
    '2.16.840.1.101.2.1.11.5': {
        d: 'usDODClass3',
        c: 'SDN.700 INFOSEC certificate policy'
    },
    '2.16.840.1.101.2.1.11.6': {
        d: 'usDODClass5',
        c: 'SDN.700 INFOSEC certificate policy'
    },
    '2.16.840.1.101.2.1.12.0': {
        d: 'testSecurityPolicy',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.1': { d: 'tsp1', c: 'SDN.700 INFOSEC test objects' },
    '2.16.840.1.101.2.1.12.0.1.0': {
        d: 'tsp1SecurityCategories',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.1.0.0': {
        d: 'tsp1TagSetZero',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.1.0.1': {
        d: 'tsp1TagSetOne',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.1.0.2': {
        d: 'tsp1TagSetTwo',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.2': { d: 'tsp2', c: 'SDN.700 INFOSEC test objects' },
    '2.16.840.1.101.2.1.12.0.2.0': {
        d: 'tsp2SecurityCategories',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.2.0.0': {
        d: 'tsp2TagSetZero',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.2.0.1': {
        d: 'tsp2TagSetOne',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.2.0.2': {
        d: 'tsp2TagSetTwo',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.3': {
        d: 'kafka',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.3.0': {
        d: 'kafkaSecurityCategories',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.3.0.1': {
        d: 'kafkaTagSetName1',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.3.0.2': {
        d: 'kafkaTagSetName2',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.0.3.0.3': {
        d: 'kafkaTagSetName3',
        c: 'SDN.700 INFOSEC test objects'
    },
    '2.16.840.1.101.2.1.12.1.1': { d: 'tcp1', c: 'SDN.700 INFOSEC test objects' },
    '2.16.840.1.101.2.1.13.1': {
        d: 'kmaKeyAlgorithm',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.3': {
        d: 'kmaTSECNomenclature',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.5': {
        d: 'kmaKeyDistPeriod',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.6': {
        d: 'kmaKeyValidityPeriod',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.7': {
        d: 'kmaKeyDuration',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.11': {
        d: 'kmaSplitID',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.12': {
        d: 'kmaKeyPkgType',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.13': {
        d: 'kmaKeyPurpose',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.14': {
        d: 'kmaKeyUse',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.15': {
        d: 'kmaTransportKey',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.16': {
        d: 'kmaKeyPkgReceiversV2',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.19': {
        d: 'kmaOtherCertFormats',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.20': {
        d: 'kmaUsefulCerts',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.21': {
        d: 'kmaKeyWrapAlgorithm',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.13.22': {
        d: 'kmaSigUsageV3',
        c: 'SDN.700 INFOSEC attributes and RFC 7906'
    },
    '2.16.840.1.101.2.1.16.0': {
        d: 'dn',
        c: 'SDN.700 INFOSEC attributes and RFC 7191'
    },
    '2.16.840.1.101.2.1.22': {
        d: 'errorCodes',
        c: 'RFC 7906 key attribute error codes'
    },
    '2.16.840.1.101.2.1.22.1': {
        d: 'missingKeyType',
        c: 'RFC 7906 key attribute error codes'
    },
    '2.16.840.1.101.2.1.22.2': {
        d: 'privacyMarkTooLong',
        c: 'RFC 7906 key attribute error codes'
    },
    '2.16.840.1.101.2.1.22.3': {
        d: 'unrecognizedSecurityPolicy',
        c: 'RFC 7906 key attribute error codes'
    },
    '2.16.840.1.101.3.1': { d: 'slabel', c: 'CSOR GAK', w: true },
    '2.16.840.1.101.3.2': { d: 'pki', c: 'NIST', w: true },
    '2.16.840.1.101.3.2.1': {
        d: 'NIST policyIdentifier',
        c: 'NIST policies',
        w: true
    },
    '2.16.840.1.101.3.2.1.3.1': {
        d: 'fbcaRudimentaryPolicy',
        c: 'Federal Bridge CA Policy'
    },
    '2.16.840.1.101.3.2.1.3.2': {
        d: 'fbcaBasicPolicy',
        c: 'Federal Bridge CA Policy'
    },
    '2.16.840.1.101.3.2.1.3.3': {
        d: 'fbcaMediumPolicy',
        c: 'Federal Bridge CA Policy'
    },
    '2.16.840.1.101.3.2.1.3.4': {
        d: 'fbcaHighPolicy',
        c: 'Federal Bridge CA Policy'
    },
    '2.16.840.1.101.3.2.1.48.1': {
        d: 'nistTestPolicy1',
        c: 'NIST PKITS policies'
    },
    '2.16.840.1.101.3.2.1.48.2': {
        d: 'nistTestPolicy2',
        c: 'NIST PKITS policies'
    },
    '2.16.840.1.101.3.2.1.48.3': {
        d: 'nistTestPolicy3',
        c: 'NIST PKITS policies'
    },
    '2.16.840.1.101.3.2.1.48.4': {
        d: 'nistTestPolicy4',
        c: 'NIST PKITS policies'
    },
    '2.16.840.1.101.3.2.1.48.5': {
        d: 'nistTestPolicy5',
        c: 'NIST PKITS policies'
    },
    '2.16.840.1.101.3.2.1.48.6': {
        d: 'nistTestPolicy6',
        c: 'NIST PKITS policies'
    },
    '2.16.840.1.101.3.2.2': {
        d: 'gak',
        c: 'CSOR GAK extended key usage',
        w: true
    },
    '2.16.840.1.101.3.2.2.1': {
        d: 'kRAKey',
        c: 'CSOR GAK extended key usage',
        w: true
    },
    '2.16.840.1.101.3.2.3': {
        d: 'extensions',
        c: 'CSOR GAK extensions',
        w: true
    },
    '2.16.840.1.101.3.2.3.1': {
        d: 'kRTechnique',
        c: 'CSOR GAK extensions',
        w: true
    },
    '2.16.840.1.101.3.2.3.2': {
        d: 'kRecoveryCapable',
        c: 'CSOR GAK extensions',
        w: true
    },
    '2.16.840.1.101.3.2.3.3': { d: 'kR', c: 'CSOR GAK extensions', w: true },
    '2.16.840.1.101.3.2.4': { d: 'keyRecoverySchemes', c: 'CSOR GAK', w: true },
    '2.16.840.1.101.3.2.5': { d: 'krapola', c: 'CSOR GAK', w: true },
    '2.16.840.1.101.3.3': { d: 'arpa', c: 'CSOR GAK', w: true },
    '2.16.840.1.101.3.4': { d: 'nistAlgorithm', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1': { d: 'aes', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.1': { d: 'aes128-ECB', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.2': { d: 'aes128-CBC', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.3': { d: 'aes128-OFB', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.4': { d: 'aes128-CFB', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.5': { d: 'aes128-wrap', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.6': { d: 'aes128-GCM', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.7': { d: 'aes128-CCM', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.8': { d: 'aes128-wrap-pad', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.9': { d: 'aes128-GMAC', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.21': { d: 'aes192-ECB', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.22': { d: 'aes192-CBC', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.23': { d: 'aes192-OFB', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.24': { d: 'aes192-CFB', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.25': { d: 'aes192-wrap', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.26': { d: 'aes192-GCM', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.27': { d: 'aes192-CCM', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.28': { d: 'aes192-wrap-pad', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.29': { d: 'aes192-GMAC', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.41': { d: 'aes256-ECB', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.42': { d: 'aes256-CBC', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.43': { d: 'aes256-OFB', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.44': { d: 'aes256-CFB', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.45': { d: 'aes256-wrap', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.46': { d: 'aes256-GCM', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.47': { d: 'aes256-CCM', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.48': { d: 'aes256-wrap-pad', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.1.49': { d: 'aes256-GMAC', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2': { d: 'hashAlgos', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.1': { d: 'sha-256', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.2': { d: 'sha-384', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.3': { d: 'sha-512', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.4': { d: 'sha-224', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.7': { d: 'sha3-224', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.8': { d: 'sha3-256', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.9': { d: 'sha3-384', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.10': { d: 'sha3-512', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.11': { d: 'shake128', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.12': { d: 'shake256', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.17': { d: 'shake128len', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.18': { d: 'shake256len', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.19': { d: 'kmacShake128', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.2.20': { d: 'kmacShake256', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.3.1': { d: 'dsaWithSha224', c: 'NIST Algorithm' },
    '2.16.840.1.101.3.4.3.2': { d: 'dsaWithSha256', c: 'NIST Algorithm' },
    '2.16.840.1.113719.1.2.8': { d: 'novellAlgorithm', c: 'Novell' },
    '2.16.840.1.113719.1.2.8.22': {
        d: 'desCbcIV8',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.23': {
        d: 'desCbcPadIV8',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.24': {
        d: 'desEDE2CbcIV8',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.25': {
        d: 'desEDE2CbcPadIV8',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.26': {
        d: 'desEDE3CbcIV8',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.27': {
        d: 'desEDE3CbcPadIV8',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.28': {
        d: 'rc5CbcPad',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.29': {
        d: 'md2WithRSAEncryptionBSafe1',
        c: 'Novell signature algorithm'
    },
    '2.16.840.1.113719.1.2.8.30': {
        d: 'md5WithRSAEncryptionBSafe1',
        c: 'Novell signature algorithm'
    },
    '2.16.840.1.113719.1.2.8.31': {
        d: 'sha1WithRSAEncryptionBSafe1',
        c: 'Novell signature algorithm'
    },
    '2.16.840.1.113719.1.2.8.32': { d: 'lmDigest', c: 'Novell digest algorithm' },
    '2.16.840.1.113719.1.2.8.40': { d: 'md2', c: 'Novell digest algorithm' },
    '2.16.840.1.113719.1.2.8.50': { d: 'md5', c: 'Novell digest algorithm' },
    '2.16.840.1.113719.1.2.8.51': {
        d: 'ikeHmacWithSHA1-RSA',
        c: 'Novell signature algorithm'
    },
    '2.16.840.1.113719.1.2.8.52': {
        d: 'ikeHmacWithMD5-RSA',
        c: 'Novell signature algorithm'
    },
    '2.16.840.1.113719.1.2.8.69': {
        d: 'rc2CbcPad',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.82': { d: 'sha-1', c: 'Novell digest algorithm' },
    '2.16.840.1.113719.1.2.8.92': {
        d: 'rc2BSafe1Cbc',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.95': { d: 'md4', c: 'Novell digest algorithm' },
    '2.16.840.1.113719.1.2.8.130': { d: 'md4Packet', c: 'Novell keyed hash' },
    '2.16.840.1.113719.1.2.8.131': {
        d: 'rsaEncryptionBsafe1',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.132': {
        d: 'nwPassword',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.2.8.133': {
        d: 'novellObfuscate-1',
        c: 'Novell encryption algorithm'
    },
    '2.16.840.1.113719.1.9': { d: 'pki', c: 'Novell' },
    '2.16.840.1.113719.1.9.4': { d: 'pkiAttributeType', c: 'Novell PKI' },
    '2.16.840.1.113719.1.9.4.1': {
        d: 'securityAttributes',
        c: 'Novell PKI attribute type'
    },
    '2.16.840.1.113719.1.9.4.2': {
        d: 'relianceLimit',
        c: 'Novell PKI attribute type'
    },
    '2.16.840.1.113730.1': { d: 'cert-extension', c: 'Netscape' },
    '2.16.840.1.113730.1.1': {
        d: 'netscape-cert-type',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.2': {
        d: 'netscape-base-url',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.3': {
        d: 'netscape-revocation-url',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.4': {
        d: 'netscape-ca-revocation-url',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.7': {
        d: 'netscape-cert-renewal-url',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.8': {
        d: 'netscape-ca-policy-url',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.9': {
        d: 'HomePage-url',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.10': {
        d: 'EntityLogo',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.11': {
        d: 'UserPicture',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.12': {
        d: 'netscape-ssl-server-name',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.1.13': {
        d: 'netscape-comment',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.2': { d: 'data-type', c: 'Netscape' },
    '2.16.840.1.113730.2.1': { d: 'dataGIF', c: 'Netscape data type' },
    '2.16.840.1.113730.2.2': { d: 'dataJPEG', c: 'Netscape data type' },
    '2.16.840.1.113730.2.3': { d: 'dataURL', c: 'Netscape data type' },
    '2.16.840.1.113730.2.4': { d: 'dataHTML', c: 'Netscape data type' },
    '2.16.840.1.113730.2.5': { d: 'certSequence', c: 'Netscape data type' },
    '2.16.840.1.113730.2.6': {
        d: 'certURL',
        c: 'Netscape certificate extension'
    },
    '2.16.840.1.113730.3': { d: 'directory', c: 'Netscape' },
    '2.16.840.1.113730.3.1': { d: 'ldapDefinitions', c: 'Netscape directory' },
    '2.16.840.1.113730.3.1.1': {
        d: 'carLicense',
        c: 'Netscape LDAP definitions'
    },
    '2.16.840.1.113730.3.1.2': {
        d: 'departmentNumber',
        c: 'Netscape LDAP definitions'
    },
    '2.16.840.1.113730.3.1.3': {
        d: 'employeeNumber',
        c: 'Netscape LDAP definitions'
    },
    '2.16.840.1.113730.3.1.4': {
        d: 'employeeType',
        c: 'Netscape LDAP definitions'
    },
    '2.16.840.1.113730.3.1.216': {
        d: 'userPKCS12',
        c: 'Netscape LDAP definitions'
    },
    '2.16.840.1.113730.3.2.2': {
        d: 'inetOrgPerson',
        c: 'Netscape LDAP definitions'
    },
    '2.16.840.1.113730.4.1': { d: 'serverGatedCrypto', c: 'Netscape' },
    '2.16.840.1.113733.1.6.3': { d: 'verisignCZAG', c: 'Verisign extension' },
    '2.16.840.1.113733.1.6.6': { d: 'verisignInBox', c: 'Verisign extension' },
    '2.16.840.1.113733.1.6.11': {
        d: 'verisignOnsiteJurisdictionHash',
        c: 'Verisign extension'
    },
    '2.16.840.1.113733.1.6.13': {
        d: 'Unknown Verisign VPN extension',
        c: 'Verisign extension'
    },
    '2.16.840.1.113733.1.6.15': {
        d: 'verisignServerID',
        c: 'Verisign extension'
    },
    '2.16.840.1.113733.1.7.1.1': {
        d: 'verisignCertPolicies95Qualifier1',
        c: 'Verisign policy'
    },
    '2.16.840.1.113733.1.7.1.1.1': {
        d: 'verisignCPSv1notice',
        c: 'Verisign policy (obsolete)'
    },
    '2.16.840.1.113733.1.7.1.1.2': {
        d: 'verisignCPSv1nsi',
        c: 'Verisign policy (obsolete)'
    },
    '2.16.840.1.113733.1.8.1': { d: 'verisignISSStrongCrypto', c: 'Verisign' },
    '2.16.840.1.113733.1': { d: 'pki', c: 'Verisign extension' },
    '2.16.840.1.113733.1.9': { d: 'pkcs7Attribute', c: 'Verisign PKI extension' },
    '2.16.840.1.113733.1.9.2': {
        d: 'messageType',
        c: 'Verisign PKCS #7 attribute'
    },
    '2.16.840.1.113733.1.9.3': {
        d: 'pkiStatus',
        c: 'Verisign PKCS #7 attribute'
    },
    '2.16.840.1.113733.1.9.4': { d: 'failInfo', c: 'Verisign PKCS #7 attribute' },
    '2.16.840.1.113733.1.9.5': {
        d: 'senderNonce',
        c: 'Verisign PKCS #7 attribute'
    },
    '2.16.840.1.113733.1.9.6': {
        d: 'recipientNonce',
        c: 'Verisign PKCS #7 attribute'
    },
    '2.16.840.1.113733.1.9.7': { d: 'transID', c: 'Verisign PKCS #7 attribute' },
    '2.16.840.1.113733.1.9.8': {
        d: 'extensionReq',
        c: 'Verisign PKCS #7 attribute.  Use PKCS #9 extensionRequest instead',
        w: true
    },
    '2.16.840.1.113741.2': { d: 'intelCDSA', c: 'Intel CDSA' },
    '2.16.840.1.114412.1': { d: 'digiCertNonEVCerts', c: 'Digicert CA policy' },
    '2.16.840.1.114412.1.1': { d: 'digiCertOVCert', c: 'Digicert CA policy' },
    '2.16.840.1.114412.1.2': { d: 'digiCertDVCert', c: 'Digicert CA policy' },
    '2.16.840.1.114412.1.11': {
        d: 'digiCertFederatedDeviceCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.1.3.0.1': {
        d: 'digiCertGlobalCAPolicy',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.1.3.0.2': {
        d: 'digiCertHighAssuranceEVCAPolicy',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.1.3.0.3': {
        d: 'digiCertGlobalRootCAPolicy',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.1.3.0.4': {
        d: 'digiCertAssuredIDRootCAPolicy',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.2': { d: 'digiCertEVCert', c: 'Digicert CA policy' },
    '2.16.840.1.114412.2.3': {
        d: 'digiCertObjectSigningCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.3.1': {
        d: 'digiCertCodeSigningCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.3.2': {
        d: 'digiCertEVCodeSigningCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.3.11': {
        d: 'digiCertKernelCodeSigningCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.3.21': {
        d: 'digiCertDocumentSigningCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4': { d: 'digiCertClientCert', c: 'Digicert CA policy' },
    '2.16.840.1.114412.2.4.1.1': {
        d: 'digiCertLevel1PersonalClientCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4.1.2': {
        d: 'digiCertLevel1EnterpriseClientCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4.2': {
        d: 'digiCertLevel2ClientCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4.3.1': {
        d: 'digiCertLevel3USClientCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4.3.2': {
        d: 'digiCertLevel3CBPClientCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4.4.1': {
        d: 'digiCertLevel4USClientCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4.4.2': {
        d: 'digiCertLevel4CBPClientCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4.5.1': {
        d: 'digiCertPIVHardwareCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4.5.2': {
        d: 'digiCertPIVCardAuthCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.2.4.5.3': {
        d: 'digiCertPIVContentSigningCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.4.31': {
        d: 'digiCertGridClassicCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.4.31.5': {
        d: 'digiCertGridIntegratedCert',
        c: 'Digicert CA policy'
    },
    '2.16.840.1.114412.31.4.31.1': {
        d: 'digiCertGridHostCert',
        c: 'Digicert CA policy'
    },
    '2.23.42.0': { d: 'contentType', c: 'SET' },
    '2.23.42.0.0': { d: 'panData', c: 'SET contentType' },
    '2.23.42.0.1': { d: 'panToken', c: 'SET contentType' },
    '2.23.42.0.2': { d: 'panOnly', c: 'SET contentType' },
    '2.23.42.1': { d: 'msgExt', c: 'SET' },
    '2.23.42.2': { d: 'field', c: 'SET' },
    '2.23.42.2.0': { d: 'fullName', c: 'SET field' },
    '2.23.42.2.1': { d: 'givenName', c: 'SET field' },
    '2.23.42.2.2': { d: 'familyName', c: 'SET field' },
    '2.23.42.2.3': { d: 'birthFamilyName', c: 'SET field' },
    '2.23.42.2.4': { d: 'placeName', c: 'SET field' },
    '2.23.42.2.5': { d: 'identificationNumber', c: 'SET field' },
    '2.23.42.2.6': { d: 'month', c: 'SET field' },
    '2.23.42.2.7': { d: 'date', c: 'SET field' },
    '2.23.42.2.8': { d: 'address', c: 'SET field' },
    '2.23.42.2.9': { d: 'telephone', c: 'SET field' },
    '2.23.42.2.10': { d: 'amount', c: 'SET field' },
    '2.23.42.2.11': { d: 'accountNumber', c: 'SET field' },
    '2.23.42.2.12': { d: 'passPhrase', c: 'SET field' },
    '2.23.42.3': { d: 'attribute', c: 'SET' },
    '2.23.42.3.0': { d: 'cert', c: 'SET attribute' },
    '2.23.42.3.0.0': { d: 'rootKeyThumb', c: 'SET cert attribute' },
    '2.23.42.3.0.1': { d: 'additionalPolicy', c: 'SET cert attribute' },
    '2.23.42.4': { d: 'algorithm', c: 'SET' },
    '2.23.42.5': { d: 'policy', c: 'SET' },
    '2.23.42.5.0': { d: 'root', c: 'SET policy' },
    '2.23.42.6': { d: 'module', c: 'SET' },
    '2.23.42.7': { d: 'certExt', c: 'SET' },
    '2.23.42.7.0': { d: 'hashedRootKey', c: 'SET cert extension' },
    '2.23.42.7.1': { d: 'certificateType', c: 'SET cert extension' },
    '2.23.42.7.2': { d: 'merchantData', c: 'SET cert extension' },
    '2.23.42.7.3': { d: 'cardCertRequired', c: 'SET cert extension' },
    '2.23.42.7.4': { d: 'tunneling', c: 'SET cert extension' },
    '2.23.42.7.5': { d: 'setExtensions', c: 'SET cert extension' },
    '2.23.42.7.6': { d: 'setQualifier', c: 'SET cert extension' },
    '2.23.42.8': { d: 'brand', c: 'SET' },
    '2.23.42.8.1': { d: 'IATA-ATA', c: 'SET brand' },
    '2.23.42.8.4': { d: 'VISA', c: 'SET brand' },
    '2.23.42.8.5': { d: 'MasterCard', c: 'SET brand' },
    '2.23.42.8.30': { d: 'Diners', c: 'SET brand' },
    '2.23.42.8.34': { d: 'AmericanExpress', c: 'SET brand' },
    '2.23.42.8.6011': { d: 'Novus', c: 'SET brand' },
    '2.23.42.9': { d: 'vendor', c: 'SET' },
    '2.23.42.9.0': { d: 'GlobeSet', c: 'SET vendor' },
    '2.23.42.9.1': { d: 'IBM', c: 'SET vendor' },
    '2.23.42.9.2': { d: 'CyberCash', c: 'SET vendor' },
    '2.23.42.9.3': { d: 'Terisa', c: 'SET vendor' },
    '2.23.42.9.4': { d: 'RSADSI', c: 'SET vendor' },
    '2.23.42.9.5': { d: 'VeriFone', c: 'SET vendor' },
    '2.23.42.9.6': { d: 'TrinTech', c: 'SET vendor' },
    '2.23.42.9.7': { d: 'BankGate', c: 'SET vendor' },
    '2.23.42.9.8': { d: 'GTE', c: 'SET vendor' },
    '2.23.42.9.9': { d: 'CompuSource', c: 'SET vendor' },
    '2.23.42.9.10': { d: 'Griffin', c: 'SET vendor' },
    '2.23.42.9.11': { d: 'Certicom', c: 'SET vendor' },
    '2.23.42.9.12': { d: 'OSS', c: 'SET vendor' },
    '2.23.42.9.13': { d: 'TenthMountain', c: 'SET vendor' },
    '2.23.42.9.14': { d: 'Antares', c: 'SET vendor' },
    '2.23.42.9.15': { d: 'ECC', c: 'SET vendor' },
    '2.23.42.9.16': { d: 'Maithean', c: 'SET vendor' },
    '2.23.42.9.17': { d: 'Netscape', c: 'SET vendor' },
    '2.23.42.9.18': { d: 'Verisign', c: 'SET vendor' },
    '2.23.42.9.19': { d: 'BlueMoney', c: 'SET vendor' },
    '2.23.42.9.20': { d: 'Lacerte', c: 'SET vendor' },
    '2.23.42.9.21': { d: 'Fujitsu', c: 'SET vendor' },
    '2.23.42.9.22': { d: 'eLab', c: 'SET vendor' },
    '2.23.42.9.23': { d: 'Entrust', c: 'SET vendor' },
    '2.23.42.9.24': { d: 'VIAnet', c: 'SET vendor' },
    '2.23.42.9.25': { d: 'III', c: 'SET vendor' },
    '2.23.42.9.26': { d: 'OpenMarket', c: 'SET vendor' },
    '2.23.42.9.27': { d: 'Lexem', c: 'SET vendor' },
    '2.23.42.9.28': { d: 'Intertrader', c: 'SET vendor' },
    '2.23.42.9.29': { d: 'Persimmon', c: 'SET vendor' },
    '2.23.42.9.30': { d: 'NABLE', c: 'SET vendor' },
    '2.23.42.9.31': { d: 'espace-net', c: 'SET vendor' },
    '2.23.42.9.32': { d: 'Hitachi', c: 'SET vendor' },
    '2.23.42.9.33': { d: 'Microsoft', c: 'SET vendor' },
    '2.23.42.9.34': { d: 'NEC', c: 'SET vendor' },
    '2.23.42.9.35': { d: 'Mitsubishi', c: 'SET vendor' },
    '2.23.42.9.36': { d: 'NCR', c: 'SET vendor' },
    '2.23.42.9.37': { d: 'e-COMM', c: 'SET vendor' },
    '2.23.42.9.38': { d: 'Gemplus', c: 'SET vendor' },
    '2.23.42.10': { d: 'national', c: 'SET' },
    '2.23.42.10.392': { d: 'Japan', c: 'SET national' },
    '2.23.43.1.4': { d: 'wTLS-ECC', c: 'WAP WTLS' },
    '2.23.43.1.4.1': { d: 'wTLS-ECC-curve1', c: 'WAP WTLS' },
    '2.23.43.1.4.6': { d: 'wTLS-ECC-curve6', c: 'WAP WTLS' },
    '2.23.43.1.4.8': { d: 'wTLS-ECC-curve8', c: 'WAP WTLS' },
    '2.23.43.1.4.9': { d: 'wTLS-ECC-curve9', c: 'WAP WTLS' },
    '2.23.133': { d: 'tCPA', c: 'TCPA' },
    '2.23.133.1': { d: 'tcpaSpecVersion', c: 'TCPA' },
    '2.23.133.2': { d: 'tcpaAttribute', c: 'TCPA' },
    '2.23.133.2.1': { d: 'tcpaTpmManufacturer', c: 'TCPA Attribute' },
    '2.23.133.2.2': { d: 'tcpaTpmModel', c: 'TCPA Attribute' },
    '2.23.133.2.3': { d: 'tcpaTpmVersion', c: 'TCPA Attribute' },
    '2.23.133.2.4': { d: 'tcpaPlatformManufacturer', c: 'TCPA Attribute' },
    '2.23.133.2.5': { d: 'tcpaPlatformModel', c: 'TCPA Attribute' },
    '2.23.133.2.6': { d: 'tcpaPlatformVersion', c: 'TCPA Attribute' },
    '2.23.133.2.7': { d: 'tcpaComponentManufacturer', c: 'TCPA Attribute' },
    '2.23.133.2.8': { d: 'tcpaComponentModel', c: 'TCPA Attribute' },
    '2.23.133.2.9': { d: 'tcpaComponentVersion', c: 'TCPA Attribute' },
    '2.23.133.2.10': { d: 'tcpaSecurityQualities', c: 'TCPA Attribute' },
    '2.23.133.2.11': { d: 'tcpaTpmProtectionProfile', c: 'TCPA Attribute' },
    '2.23.133.2.12': { d: 'tcpaTpmSecurityTarget', c: 'TCPA Attribute' },
    '2.23.133.2.13': {
        d: 'tcpaFoundationProtectionProfile',
        c: 'TCPA Attribute'
    },
    '2.23.133.2.14': { d: 'tcpaFoundationSecurityTarget', c: 'TCPA Attribute' },
    '2.23.133.2.15': { d: 'tcpaTpmIdLabel', c: 'TCPA Attribute' },
    '2.23.133.3': { d: 'tcpaProtocol', c: 'TCPA' },
    '2.23.133.3.1': { d: 'tcpaPrttTpmIdProtocol', c: 'TCPA Protocol' },
    '2.23.134.1.4.2.1': { d: 'postSignumRootQCA', c: 'PostSignum CA' },
    '2.23.134.1.2.2.3': { d: 'postSignumPublicCA', c: 'PostSignum CA' },
    '2.23.134.1.2.1.8.210': {
        d: 'postSignumCommercialServerPolicy',
        c: 'PostSignum CA'
    },
    '2.23.136.1.1.1': { d: 'mRTDSignatureData', c: 'ICAO MRTD' },
    '2.54.1775.2': {
        d: 'hashedRootKey',
        c: 'SET.  Deprecated, use (2 23 42 7 0) instead',
        w: true
    },
    '2.54.1775.3': {
        d: 'certificateType',
        c: 'SET.  Deprecated, use (2 23 42 7 0) instead',
        w: true
    },
    '2.54.1775.4': {
        d: 'merchantData',
        c: 'SET.  Deprecated, use (2 23 42 7 0) instead',
        w: true
    },
    '2.54.1775.5': {
        d: 'cardCertRequired',
        c: 'SET.  Deprecated, use (2 23 42 7 0) instead',
        w: true
    },
    '2.54.1775.6': {
        d: 'tunneling',
        c: 'SET.  Deprecated, use (2 23 42 7 0) instead',
        w: true
    },
    '2.54.1775.7': {
        d: 'setQualifier',
        c: 'SET.  Deprecated, use (2 23 42 7 0) instead',
        w: true
    },
    '2.54.1775.99': {
        d: 'setData',
        c: 'SET.  Deprecated, use (2 23 42 7 0) instead',
        w: true
    },
    '1.2.40.0.17.1.22': { d: 'A-Trust EV policy', c: 'A-Trust CA Root' },
    '1.3.6.1.4.1.34697.2.1': {
        d: 'AffirmTrust EV policy',
        c: 'AffirmTrust Commercial'
    },
    '1.3.6.1.4.1.34697.2.2': {
        d: 'AffirmTrust EV policy',
        c: 'AffirmTrust Networking'
    },
    '1.3.6.1.4.1.34697.2.3': {
        d: 'AffirmTrust EV policy',
        c: 'AffirmTrust Premium'
    },
    '1.3.6.1.4.1.34697.2.4': {
        d: 'AffirmTrust EV policy',
        c: 'AffirmTrust Premium ECC'
    },
    '2.16.578.1.26.1.3.3': { d: 'BuyPass EV policy', c: 'BuyPass Class 3 EV' },
    '1.3.6.1.4.1.17326.10.14.2.1.2': {
        d: 'Camerfirma EV policy',
        c: 'Camerfirma CA Root'
    },
    '1.3.6.1.4.1.17326.10.8.12.1.2': {
        d: 'Camerfirma EV policy',
        c: 'Camerfirma CA Root'
    },
    '1.3.6.1.4.1.22234.2.5.2.3.1': {
        d: 'CertPlus EV policy',
        c: 'CertPlus Class 2 Primary CA (formerly Keynectis)'
    },
    '1.3.6.1.4.1.6449.1.2.1.5.1': {
        d: 'Comodo EV policy',
        c: 'COMODO Certification Authority'
    },
    '1.3.6.1.4.1.6334.1.100.1': {
        d: 'Cybertrust EV policy',
        c: 'Cybertrust Global Root (now Verizon Business)'
    },
    '1.3.6.1.4.1.4788.2.202.1': {
        d: 'D-TRUST EV policy',
        c: 'D-TRUST Root Class 3 CA 2 EV 2009'
    },
    '2.16.840.1.114412.2.1': {
        d: 'DigiCert EV policy',
        c: 'DigiCert High Assurance EV Root CA'
    },
    '2.16.528.1.1001.1.1.1.12.6.1.1.1': {
        d: 'DigiNotar EV policy',
        c: 'DigiNotar Root CA'
    },
    '2.16.840.1.114028.10.1.2': {
        d: 'Entrust EV policy',
        c: 'Entrust Root Certification Authority'
    },
    '1.3.6.1.4.1.14370.1.6': {
        d: 'GeoTrust EV policy',
        c: 'GeoTrust Primary Certification Authority (formerly Equifax)'
    },
    '1.3.6.1.4.1.4146.1.1': { d: 'GlobalSign EV policy', c: 'GlobalSign' },
    '2.16.840.1.114413.1.7.23.3': {
        d: 'GoDaddy EV policy',
        c: 'GoDaddy Class 2 Certification Authority (formerly ValiCert)'
    },
    '1.3.6.1.4.1.14777.6.1.1': {
        d: 'Izenpe EV policy',
        c: 'Certificado de Servidor Seguro SSL EV'
    },
    '1.3.6.1.4.1.14777.6.1.2': {
        d: 'Izenpe EV policy',
        c: 'Certificado de Sede Electronica EV'
    },
    '1.3.6.1.4.1.782.1.2.1.8.1': {
        d: 'Network Solutions EV policy',
        c: 'Network Solutions Certificate Authority'
    },
    '1.3.6.1.4.1.8024.0.2.100.1.2': {
        d: 'QuoVadis EV policy',
        c: 'QuoVadis Root CA 2'
    },
    '1.2.392.200091.100.721.1': {
        d: 'Security Communication (SECOM) EV policy',
        c: 'Security Communication RootCA1'
    },
    '2.16.840.1.114414.1.7.23.3': {
        d: 'Starfield EV policy',
        c: 'Starfield Class 2 Certification Authority'
    },
    '1.3.6.1.4.1.23223.1.1.1': {
        d: 'StartCom EV policy',
        c: 'StartCom Certification Authority'
    },
    '2.16.756.1.89.1.2.1.1': {
        d: 'SwissSign EV policy',
        c: 'SwissSign Gold CA - G2'
    },
    '1.3.6.1.4.1.7879.13.24.1': {
        d: 'T-TeleSec EV policy',
        c: 'T-TeleSec GlobalRoot Class 3'
    },
    '2.16.840.1.113733.1.7.48.1': {
        d: 'Thawte EV policy',
        c: 'Thawte Premium Server CA'
    },
    '2.16.840.1.114404.1.1.2.4.1': {
        d: 'TrustWave EV policy',
        c: 'TrustWave CA, formerly SecureTrust, before that XRamp'
    },
    '1.3.6.1.4.1.40869.1.1.22.3': {
        d: 'TWCA EV policy',
        c: 'TWCA Root Certification Authority'
    },
    '2.16.840.1.113733.1.7.23.6': {
        d: 'VeriSign EV policy',
        c: 'VeriSign Class 3 Public Primary Certification Authority'
    },
    '2.16.840.1.114171.500.9': {
        d: 'Wells Fargo EV policy',
        c: 'Wells Fargo WellsSecure Public Root Certificate Authority'
    },
    END: ''
};

const ellipsis$1 = '\u2026';
function stringCut(str, len) {
    if (str.length > len)
        str = str.substring(0, len) + ellipsis$1;
    return str;
}

const b64Safe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const reTimeS = /^(\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
const reTimeL = /^(\d\d\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
const ellipsis = '\u2026';
function ex(c) {
    // must be 10xxxxxx
    if (c < 0x80 || c >= 0xc0)
        throw new Error('Invalid UTF-8 continuation byte: ' + c);
    return c & 0x3f;
}
function surrogate(cp) {
    if (cp < 0x10000)
        throw new Error('UTF-8 overlong encoding, codepoint encoded in 4 bytes: ' + cp);
    // we could use String.fromCodePoint(cp) but let's be nice to older browsers and use surrogate pairs
    cp -= 0x10000;
    return String.fromCharCode((cp >> 10) + 0xd800, (cp & 0x3ff) + 0xdc00);
}
class Stream {
    enc;
    pos;
    static hexDigits;
    constructor(streams, pos) {
        if (streams instanceof Stream) {
            this.enc = streams.enc;
            this.pos = streams.pos;
        }
        else {
            // enc should be an array or a binary string
            this.enc = streams;
            this.pos = pos;
        }
    }
    hexDigits = '0123456789ABCDEF';
    get(pos) {
        let cPos = pos;
        if (cPos === undefined) {
            cPos = this.pos++;
        }
        if (!this.enc || !this.enc.length) {
            return 0;
        }
        if (this.enc && cPos >= this.enc.length)
            throw ('Requesting byte offset ' +
                pos +
                ' on a stream of length ' +
                this.enc.length);
        return typeof this.enc == 'string'
            ? this.enc.charCodeAt(cPos)
            : this.enc[cPos];
    }
    hexByte(b) {
        return (this.hexDigits.charAt((b >> 4) & 0xf) + this.hexDigits.charAt(b & 0xf));
    }
    hexDump(start, end, raw) {
        let s = '';
        for (let i = start; i < end; ++i) {
            s += this.hexByte(this.get(i));
            if (raw !== true)
                switch (i & 0xf) {
                    case 0x7:
                        s += '  ';
                        break;
                    case 0xf:
                        s += '\n';
                        break;
                    default:
                        s += ' ';
                }
        }
        return s;
    }
    b64Dump(start, end) {
        const extra = (end - start) % 3;
        let s = '';
        let i;
        let c;
        for (i = start; i + 2 < end; i += 3) {
            c = (this.get(i) << 16) | (this.get(i + 1) << 8) | this.get(i + 2);
            s += b64Safe.charAt((c >> 18) & 0x3f);
            s += b64Safe.charAt((c >> 12) & 0x3f);
            s += b64Safe.charAt((c >> 6) & 0x3f);
            s += b64Safe.charAt(c & 0x3f);
        }
        if (extra > 0) {
            c = this.get(i) << 16;
            if (extra > 1)
                c |= this.get(i + 1) << 8;
            s += b64Safe.charAt((c >> 18) & 0x3f);
            s += b64Safe.charAt((c >> 12) & 0x3f);
            if (extra === 2)
                s += b64Safe.charAt((c >> 6) & 0x3f);
        }
        return s;
    }
    isASCII(start, end) {
        for (let i = start; i < end; ++i) {
            var c = this.get(i);
            if (c < 32 || c > 176)
                return false;
        }
        return true;
    }
    parseStringISO(start, end) {
        let s = '';
        for (let i = start; i < end; ++i) {
            s += String.fromCharCode(this.get(i));
        }
        return s;
    }
    parseStringUTF(start, end) {
        let s = '';
        for (let i = start; i < end;) {
            const c = this.get(i++);
            if (c < 0x80)
                // 0xxxxxxx (7 bit)
                s += String.fromCharCode(c);
            else if (c < 0xc0)
                throw new Error('Invalid UTF-8 starting byte: ' + c);
            else if (c < 0xe0)
                // 110xxxxx 10xxxxxx (11 bit)
                s += String.fromCharCode(((c & 0x1f) << 6) | ex(this.get(i++)));
            else if (c < 0xf0)
                // 1110xxxx 10xxxxxx 10xxxxxx (16 bit)
                s += String.fromCharCode(((c & 0x0f) << 12) | (ex(this.get(i++)) << 6) | ex(this.get(i++)));
            else if (c < 0xf8)
                // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx (21 bit)
                s += surrogate(((c & 0x07) << 18) |
                    (ex(this.get(i++)) << 12) |
                    (ex(this.get(i++)) << 6) |
                    ex(this.get(i++)));
            else
                throw new Error('Invalid UTF-8 starting byte (since 2003 it is restricted to 4 bytes): ' +
                    c);
        }
        return s;
    }
    parseStringBMP(start, end) {
        let str = '';
        let hi;
        let lo;
        for (let i = start; i < end;) {
            hi = this.get(i++);
            lo = this.get(i++);
            str += String.fromCharCode((hi << 8) | lo);
        }
        return str;
    }
    parseTime(start, end, shortYear) {
        let s = this.parseStringISO(start, end);
        const t = (shortYear ? reTimeS : reTimeL).exec(s);
        if (!t)
            return 'Unrecognized time: ' + s;
        const m = t;
        if (shortYear) {
            // to avoid querying the timer, use the fixed range [1970, 2069]
            // it will conform with ITU X.400 [-10, +40] sliding window until 2030
            m[1] = +Number(m[1]);
            m[1] += Number(m[1]) < 70 ? 2000 : 1900;
        }
        s = m[1] + '-' + m[2] + '-' + m[3] + ' ' + m[4];
        if (m[5]) {
            s += ':' + m[5];
            if (m[6]) {
                s += ':' + m[6];
                if (m[7])
                    s += '.' + m[7];
            }
        }
        if (m[8]) {
            s += ' UTC';
            if (m[8] != 'Z') {
                s += m[8];
                if (m[9])
                    s += ':' + m[9];
            }
        }
        return s;
    }
    parseInteger(start, end) {
        let v = this.get(start), neg = v > 127, pad = neg ? 255 : 0, len, s = null;
        // skip unuseful bits (not allowed in DER)
        while (v === pad && ++start < end) {
            v = this.get(start);
        }
        len = end - start;
        if (len === 0)
            return neg ? '-1' : '0';
        // show bit length of huge integers
        if (len > 4) {
            s = v;
            len <<= 3;
            while (((s ^ pad) & 0x80) === 0) {
                s <<= 1;
                --len;
            }
            s = '(' + len + ' bit)\n';
        }
        // decode the integer
        if (neg)
            v = v - 256;
        const n = new Int10(v);
        for (let i = start + 1; i < end; ++i) {
            n.mulAdd(256, this.get(i));
        }
        return s ? s + n.toString() : n.toString();
    }
    parseBitString(start, end, maxLength) {
        var unusedBits = this.get(start);
        if (unusedBits > 7)
            throw 'Invalid BitString with unusedBits=' + unusedBits;
        var lenBit = ((end - start - 1) << 3) - unusedBits, s = '';
        for (var i = start + 1; i < end; ++i) {
            var b = this.get(i), skip = i == end - 1 ? unusedBits : 0;
            for (var j = 7; j >= skip; --j)
                s += (b >> j) & 1 ? '1' : '0';
            if (s.length > maxLength)
                s = stringCut(s, maxLength);
        }
        return { size: lenBit, str: s };
    }
    parseOctetString(start, end, maxLength) {
        var len = end - start, s;
        try {
            s = this.parseStringUTF(start, end);
            var v;
            for (i = 0; i < s.length; ++i) {
                v = s.charCodeAt(i);
                if (v < 32 && v != 9 && v != 10 && v != 13)
                    // [\t\r\n] are (kinda) printable
                    throw new Error('Unprintable character at index ' +
                        i +
                        ' (code ' +
                        s.charCodeAt(i) +
                        ')');
            }
            return { size: len, str: s };
        }
        catch (e) {
            // ignore
        }
        maxLength /= 2; // we work in bytes
        if (len > maxLength)
            end = start + maxLength;
        s = '';
        for (var i = start; i < end; ++i)
            s += this.hexByte(this.get(i));
        if (len > maxLength)
            s += ellipsis;
        return { size: len, str: s };
    }
    parseOID(start, end, maxLength) {
        let s = '';
        let n = new Int10();
        let bits = 0;
        for (let i = start; i < end; ++i) {
            var v = this.get(i);
            n.mulAdd(128, v & 0x7f);
            bits += 7;
            if (!(v & 0x80)) {
                // finished
                if (s === '') {
                    n = n.simplify();
                    if (n instanceof Int10) {
                        n.sub(80);
                        s = '2.' + n.toString();
                    }
                    else {
                        const m = n < 80 ? (n < 40 ? 0 : 1) : 2;
                        s = m + '.' + (n - m * 40);
                    }
                }
                else
                    s += '.' + n.toString();
                if (s.length > maxLength)
                    return stringCut(s, maxLength);
                n = new Int10();
                bits = 0;
            }
        }
        if (bits > 0)
            s += '.incomplete';
        if (typeof Oids === 'object') {
            const oid = Oids[s];
            if (oid) {
                if (oid.d)
                    s += '\n' + oid.d;
                if (oid.c)
                    s += '\n' + oid.c;
                if (oid.w)
                    s += '\n(warning!)';
            }
        }
        return s;
    }
}

function recurse(el, parser, maxLength) {
    let avoidRecurse = true;
    if (el.tag.tagConstructed && el.sub) {
        avoidRecurse = false;
        el.sub.forEach(function (e1) {
            if (e1.tag.tagClass != el.tag.tagClass ||
                e1.tag.tagNumber != el.tag.tagNumber)
                avoidRecurse = true;
        });
    }
    if (avoidRecurse) {
        return el.stream[parser](el.posContent(), el.posContent() + Math.abs(el.length), maxLength);
    }
    const d = { size: 0, str: '' };
    el.sub.forEach(function (el) {
        const d1 = recurse(el, parser, maxLength - d.str.length);
        d.size += d1.size;
        d.str += d1.str;
    });
    return d;
}
class ASN1Tag {
    tagClass;
    tagNumber;
    tagConstructed;
    constructor(stream) {
        let buf = stream.get();
        this.tagClass = buf >> 6;
        this.tagConstructed = (buf & 0x20) !== 0;
        this.tagNumber = buf & 0x1f;
        if (this.tagNumber == 0x1f) {
            // long tag
            const int10 = new Int10();
            do {
                buf = stream.get();
                int10.mulAdd(128, buf & 0x7f);
            } while (buf & 0x80);
            this.tagNumber = int10.simplify();
        }
    }
    isUniversal() {
        return this.tagClass === 0x00;
    }
    isEOC() {
        return this.tagClass === 0x00 && this.tagNumber === 0x00;
    }
}
class Asn1 {
    stream;
    header;
    length;
    tag;
    tagLen;
    sub;
    constructor(stream, header, length, tag, tagLen, sub) {
        if (!(tag instanceof ASN1Tag))
            throw 'Invalid tag value.';
        this.stream = stream;
        this.header = header;
        this.length = length;
        this.tag = tag;
        this.tagLen = tagLen;
        this.sub = sub;
    }
    typeName() {
        switch (this.tag.tagClass) {
            case 0: // universal
                switch (this.tag.tagNumber) {
                    case 0x00:
                        return 'EOC';
                    case 0x01:
                        return 'BOOLEAN';
                    case 0x02:
                        return 'INTEGER';
                    case 0x03:
                        return 'BIT_STRING';
                    case 0x04:
                        return 'OCTET_STRING';
                    case 0x05:
                        return 'NULL';
                    case 0x06:
                        return 'OBJECT_IDENTIFIER';
                    case 0x07:
                        return 'ObjectDescriptor';
                    case 0x08:
                        return 'EXTERNAL';
                    case 0x09:
                        return 'REAL';
                    case 0x0a:
                        return 'ENUMERATED';
                    case 0x0b:
                        return 'EMBEDDED_PDV';
                    case 0x0c:
                        return 'UTF8String';
                    case 0x10:
                        return 'SEQUENCE';
                    case 0x11:
                        return 'SET';
                    case 0x12:
                        return 'NumericString';
                    case 0x13:
                        return 'PrintableString'; // ASCII subset
                    case 0x14:
                        return 'TeletexString'; // aka T61String
                    case 0x15:
                        return 'VideotexString';
                    case 0x16:
                        return 'IA5String'; // ASCII
                    case 0x17:
                        return 'UTCTime';
                    case 0x18:
                        return 'GeneralizedTime';
                    case 0x19:
                        return 'GraphicString';
                    case 0x1a:
                        return 'VisibleString'; // ASCII subset
                    case 0x1b:
                        return 'GeneralString';
                    case 0x1c:
                        return 'UniversalString';
                    case 0x1e:
                        return 'BMPString';
                }
                return 'Universal_' + this.tag.tagNumber.toString();
            case 1:
                return 'Application_' + this.tag.tagNumber.toString();
            case 2:
                return '[' + this.tag.tagNumber.toString() + ']'; // Context
            case 3:
                return 'Private_' + this.tag.tagNumber.toString();
        }
    }
    content(maxLength) {
        if (this.tag === undefined)
            return null;
        if (maxLength === undefined)
            maxLength = Infinity;
        const content = this.posContent();
        const len = Math.abs(this.length);
        if (!this.tag.isUniversal()) {
            if (this.sub !== null)
                return '(' + this.sub.length + ' elem)';
            const d1 = this.stream.parseOctetString(content, content + len, maxLength);
            return '(' + d1.size + ' byte)\n' + d1.str;
        }
        switch (this.tag.tagNumber) {
            case 0x01: // BOOLEAN
                return this.stream.get(content) === 0 ? 'false' : 'true';
            case 0x02: // INTEGER
                return this.stream.parseInteger(content, content + len);
            case 0x03: // BIT_STRING
                var d = recurse(this, 'parseBitString', maxLength);
                return '(' + d.size + ' bit)\n' + d.str;
            case 0x04: // OCTET_STRING
                d = recurse(this, 'parseOctetString', maxLength);
                return '(' + d.size + ' byte)\n' + d.str;
            //case 0x05: // NULL
            case 0x06: // OBJECT_IDENTIFIER
                return this.stream.parseOID(content, content + len, maxLength);
            //case 0x07: // ObjectDescriptor
            //case 0x08: // EXTERNAL
            //case 0x09: // REAL
            case 0x0a: // ENUMERATED
                return this.stream.parseInteger(content, content + len);
            //case 0x0B: // EMBEDDED_PDV
            case 0x10: // SEQUENCE
            case 0x11: // SET
                if (this.sub !== null)
                    return '(' + this.sub.length + ' elem)';
                else
                    return '(no elem)';
            case 0x0c: // UTF8String
                return stringCut(this.stream.parseStringUTF(content, content + len), maxLength);
            case 0x12: // NumericString
            case 0x13: // PrintableString
            case 0x14: // TeletexString
            case 0x15: // VideotexString
            case 0x16: // IA5String
            case 0x1a: // VisibleString
            case 0x1b: // GeneralString
                //case 0x19: // GraphicString
                //case 0x1C: // UniversalString
                return stringCut(this.stream.parseStringISO(content, content + len), maxLength);
            case 0x1e: // BMPString
                return stringCut(this.stream.parseStringBMP(content, content + len), maxLength);
            case 0x17: // UTCTime
            case 0x18: // GeneralizedTime
                return this.stream.parseTime(content, content + len, this.tag.tagNumber == 0x17);
        }
        return null;
    }
    toString() {
        return (this.typeName() +
            '@' +
            this.stream.pos +
            '[header:' +
            this.header +
            ',length:' +
            this.length +
            ',sub:' +
            (this.sub === null ? 'null' : this.sub.length) +
            ']');
    }
    toPrettyString(indent) {
        if (indent === undefined)
            indent = '';
        let s = indent + this.typeName() + ' @' + this.stream.pos;
        if (this.length >= 0)
            s += '+';
        s += this.length;
        if (this.tag.tagConstructed)
            s += ' (constructed)';
        else if (this.tag.isUniversal() &&
            (this.tag.tagNumber == 0x03 || this.tag.tagNumber == 0x04) &&
            this.sub !== null)
            s += ' (encapsulates)';
        const content = this.content();
        if (content)
            s += ': ' + content.replace(/\n/g, '|');
        s += '\n';
        if (this.sub !== null) {
            indent += '  ';
            for (let i = 0, max = this.sub.length; i < max; ++i)
                s += this.sub[i].toPrettyString(indent);
        }
        return s;
    }
    posStart() {
        return this.stream.pos;
    }
    posContent() {
        return this.stream.pos + this.header;
    }
    posEnd() {
        return this.stream.pos + this.header + Math.abs(this.length);
    }
    /** Position of the length. */
    posLen() {
        return this.stream.pos + this.tagLen;
    }
    toHexString() {
        return this.stream.hexDump(this.posStart(), this.posEnd(), true);
    }
    toB64String() {
        return this.stream.b64Dump(this.posStart(), this.posEnd());
    }
}

// ASN.1 JavaScript decoder
function decodeLength(stream) {
    let buf = stream.get(), len = buf & 0x7f;
    if (len == buf)
        // first bit was 0, short form
        return len;
    if (len === 0)
        // long form with length 0 is a special case
        return null; // undefined length
    if (len > 6)
        // no reason to use Int10, as it would be a huge buffer anyways
        throw 'Length over 48 bits not supported at position ' + (stream.pos - 1);
    buf = 0;
    for (var i = 0; i < len; ++i)
        buf = buf * 256 + stream.get();
    return buf;
}
function decode(pStream, offset) {
    let stream = pStream instanceof Stream ? pStream : new Stream(pStream, offset || 0);
    const streamStart = new Stream(stream);
    let tag = new ASN1Tag(stream);
    const tagLen = stream.pos - streamStart.pos;
    let len = decodeLength(stream);
    let start = stream.pos;
    const header = start - streamStart.pos;
    let sub = null;
    const getSub = () => {
        sub = [];
        if (len !== null) {
            // definite length
            var end = start + len;
            // @ts-ignore
            if (end > stream.enc.length)
                throw ('Container at offset ' +
                    start +
                    ' has a length of ' +
                    len +
                    ', which is past the end of the stream');
            while (stream.pos < end) {
                sub[sub.length] = decode(stream);
            }
            if (stream.pos != end)
                throw 'Content size is not correct for container at offset ' + start;
        }
        else {
            // undefined length
            try {
                for (;;) {
                    var s = decode(stream);
                    if (s.tag.isEOC())
                        break;
                    sub[sub.length] = s;
                }
                len = start - stream.pos; // undefined lengths are represented as negative values
            }
            catch (e) {
                throw ('Exception while decoding undefined length content at offset ' +
                    start +
                    ': ' +
                    e);
            }
        }
    };
    if (tag.tagConstructed) {
        // must have valid content
        getSub();
    }
    else if (tag.isUniversal() &&
        (tag.tagNumber == 0x03 || tag.tagNumber == 0x04)) {
        // sometimes BitString and OctetString are used to encapsulate ASN.1
        try {
            if (tag.tagNumber == 0x03)
                if (stream.get() != 0)
                    throw 'BIT STRINGs with unused bits cannot encapsulate.';
            getSub();
            if (sub) {
                for (var i = 0; i < sub.length; ++i)
                    if (sub[i].tag.isEOC())
                        throw 'EOC is not supposed to be actual content.';
            }
        }
        catch (e) {
            // but silently ignore when they don't
            sub = null;
            //DEBUG console.log('Could not decode structure at ' + start + ':', e);
        }
    }
    if (sub === null) {
        if (len === null)
            throw ("We can't skip over an invalid tag with undefined length at offset " +
                start);
        stream.pos = start + Math.abs(len);
    }
    return new Asn1(streamStart, header, len, tag, tagLen, sub);
}

// asn.1 节点标识相当于 xml element
const STATIC_TAG_SEQUENCE = 'SEQUENCE';
function loopAsn1(sub) {
    if (sub?.length) {
        return sub.map(item => {
            // const stream = new Stream(item.stream, item.stream.pos);
            // @ts-ignore
            const tagName = item?.typeName.call(item, 8 * 80);
            // @ts-ignore
            const val = item?.content.call(item, 8 * 80);
            return {
                tagLen: item.tagLen,
                tag: item.tag,
                stream: item.stream,
                header: item.header,
                length: item.length,
                // @ts-ignore
                tagName: tagName,
                value: val,
                sub: item.sub ? loopAsn1(item.sub) : null
            };
        });
    }
    return undefined;
}
class Asn1Parse {
    static asn1ESealHeader;
    static asn1ESealEsID;
    static asn1ESealPictureInfo;
    static asn1ESealExtDatas;
    static asn1ESealProperty;
    asn1;
    static pricuteInfo = {
        data: null,
        type: '',
        width: '',
        height: ''
    };
    constructor(str) {
        this.asn1 = str;
        this.init();
    }
    init() {
        try {
            // 参考 [电子密码规范](http://c.gb688.cn/bzgk/gb/showGb?type=online&hcno=EBF1360C272E40E7A8B9B32ED0724AB1)
            const asn1 = decode(this.asn1, 0);
            Asn1Parse.pricuteInfo = { data: null, type: '', width: '', height: '' };
            // 平铺asn.1节点，获取每个节点tag name
            const asnFlatArrays = [];
            if (asn1?.sub) {
                asnFlatArrays.push({
                    tagLen: asn1.tagLen,
                    tag: asn1.tag,
                    stream: asn1.stream,
                    header: asn1.header,
                    length: asn1.length,
                    // @ts-ignore
                    tagName: asn1.typeName.call(asn1, 8 * 80),
                    sub: loopAsn1(asn1.sub)
                });
            }
            // 根据（电子签章规范）[http://c.gb688.cn/bzgk/gb/showGb?type=online&hcno=EBF1360C272E40E7A8B9B32ED0724AB1]获取签章
            /**
             * 第一级：
             * 印章信息、制章者证书、签名算法标识、签名值
             */
            if (asnFlatArrays[0]?.sub?.length) {
                const childSub = asnFlatArrays[0].sub;
                // 印章信息
                const eSealInfo = childSub[0];
                // 制章者证书
                // const cert = childSub[1];
                //签名算法标识
                // const signAlgID = childSub[2];
                // 签名值
                // const signedValue = childSub[3];
                // 印章信息解析
                if (eSealInfo?.sub?.length) {
                    for (let i = 0; i < eSealInfo.sub.length; i++) {
                        const { tagName, sub } = eSealInfo.sub[i];
                        if (tagName === STATIC_TAG_SEQUENCE) {
                            // 实际印章信息包含非SEQUENCE节点类似 attribute，需要进一步遍历SEQUENCE节点
                            if (sub?.length) {
                                for (let j = 0; j < sub.length; j++) {
                                    const { tagName: cTagName, sub: cSub } = sub[j];
                                    if (cTagName === STATIC_TAG_SEQUENCE && cSub?.length) {
                                        /**
                                         * 第二级：印章信息
                                         * 印章头、印章标识、印章属性、印章图像数据、自定义数据
                                         */
                                        const header = cSub[0];
                                        const esID = cSub[1];
                                        const property = cSub[2];
                                        const pictureInfo = cSub[3];
                                        const extDatas = cSub[4];
                                        Asn1Parse.asn1ESealHeader = header;
                                        Asn1Parse.asn1ESealEsID = esID;
                                        Asn1Parse.asn1ESealProperty = property;
                                        Asn1Parse.asn1ESealPictureInfo = pictureInfo;
                                        Asn1Parse.asn1ESealExtDatas = extDatas;
                                        this.parsePricuter(pictureInfo);
                                        break;
                                    }
                                }
                            }
                            break;
                        }
                        // console.log(item);
                    }
                }
                // console.log(
                //   'asnFlatArrays:',
                //   asnFlatArrays,
                //   signedValue,
                //   cert,
                //   signAlgID
                // );
            }
        }
        catch (e) {
            console.error('Cannot decode string. :', e);
        }
    }
    decodeUTCTime(str) {
        let strs = str.replace('Unrecognized time: ', '');
        // const UTC = strs.indexOf('Z') > 0;
        strs = strs.replace('Z', '');
        strs = strs.substring(0, 1) < '5' ? '20' + strs : '19' + strs;
        return strs;
    }
    parsePricuter(ans) {
        if (ans?.sub?.length) {
            // 图片类型
            Asn1Parse.pricuteInfo.type = ans?.sub[0].value;
            // 图片数据
            if (ans.sub[1].stream) {
                // 获取 Uint8Array
                const unit8arrs = ans.sub[1].stream.enc;
                const bytes = unit8arrs.subarray(ans.sub[1].stream.pos + ans.sub[1].header, ans.sub[1].stream.pos + ans.sub[1].header + ans.sub[1].length);
                // console.log(toUint8Arr(hex));
                Asn1Parse.pricuteInfo.data = bytes;
            }
            // 图片宽度
            Asn1Parse.pricuteInfo.width = ans?.sub[2].value;
            // 图片高度
            Asn1Parse.pricuteInfo.height = ans?.sub[3].value;
        }
    }
    getPicture() {
        if (Asn1Parse.pricuteInfo && Asn1Parse.pricuteInfo.data) {
            return Asn1Parse.pricuteInfo;
        }
        return null;
    }
}

class SignaturesXml extends OFDElement {
    static fileName;
    static Signatures;
    //  Doc_0/Signs/Signatures.xml 文件夹路径
    signedPath;
    constructor(fileName) {
        super();
        SignaturesXml.Signatures = [];
        SignaturesXml.fileName = fileName;
        // 获取 Doc_0/Signs/Signatures.xml 文件夹
        this.signedPath = fileName.substring(0, fileName.lastIndexOf('/') + 1);
        this.getSignatures();
    }
    getDocumentRes() {
        // const res = this.getOFDElements(DocumnetXml.fileName, 'DocumentRes');
        // if (res && res.elements) {
        //   return new DocumentResXml(res.elements);
        // }
        // return null;
    }
    getPublicRes() {
        // const res = this.getOFDElements(DocumnetXml.fileName, 'PublicRes');
        // if (res && res.elements) {
        //   return new PublicResXml(res.elements);
        // }
        return null;
    }
    getSeal(filePath) {
        const result = {};
        const SealInfo = new Asn1Parse(OFDElement.OFDElements[filePath]);
        const pictureInfo = SealInfo.getPicture();
        if (pictureInfo) {
            result.picture = { ...pictureInfo };
        }
        return result;
    }
    getSignedInfo(signedInfoElement) {
        const result = {};
        for (let item of signedInfoElement) {
            const { name, attributes, elements } = item;
            if (name) {
                const simpleName = name.replace(NameREG, '');
                // 特殊处理 StampAnnot
                if (simpleName === 'StampAnnot' && attributes) {
                    if (!result.StampAnnot) {
                        result.StampAnnot = [];
                    }
                    result.StampAnnot.push({
                        ...attributes
                    });
                    continue;
                }
                if (simpleName === 'Provider' && attributes) {
                    result.Provider = { ...attributes };
                    continue;
                }
                if ((simpleName === 'SignatureMethod' ||
                    simpleName === 'SignatureDateTime') &&
                    elements) {
                    result[simpleName] = String(elements[0].text);
                    continue;
                }
                if (simpleName === 'References') {
                    result.ReferencesCheckMethod = String(attributes?.CheckMethod || 'MD5');
                    if (elements?.length) {
                        if (!result.References) {
                            result.References = [];
                        }
                        elements.forEach(reference => {
                            const FileRef = String(reference.attributes?.FileRef || '');
                            if (reference.elements?.length) {
                                const CheckValueElement = reference.elements.find(ritem => ritem.name === this.OFDCommonQName('CheckValue'));
                                if (CheckValueElement?.elements?.length) {
                                    result.References?.push({
                                        FileRef,
                                        CheckValue: String(CheckValueElement?.elements[0].text)
                                    });
                                }
                            }
                        });
                    }
                }
                // if (
                //   simpleName === 'Seal' &&
                //   elements &&
                //   elements[0].name === this.OFDCommonQName('BaseLoc')
                // ) {
                //   const sealLoc = elements[0].elements
                //     ? String(elements[0].elements[0].text)
                //     : '';
                //   console.log('sealLoc:', sealLoc);
                //   result.Seal = this.getSeal(sealLoc.replace(/^\//, ''));
                // }
            }
        }
        return result;
    }
    getSignature(filePath) {
        const res = this.getOFDElements(filePath, 'Signature');
        if (res?.elements) {
            const result = {};
            for (let item of res?.elements) {
                const { name, elements } = item;
                if (name && elements?.length) {
                    const simpleName = name?.replace(NameREG, '');
                    if (simpleName === 'SignedValue') {
                        result.SignedValueLoc = String(elements[0]?.text || '');
                        if (!result.SignedInfo) {
                            result.SignedInfo = {};
                        }
                        // 此路径可能为 相对路径
                        const currentPath = filePath.substring(0, filePath.lastIndexOf('/') + 1);
                        result.SignedInfo.Seal = this.getSeal(currentPath +
                            result.SignedValueLoc.replace(new RegExp(currentPath), '').replace(/^\//, ''));
                    }
                    if (simpleName === 'SignedInfo') {
                        if (!result.SignedInfo) {
                            result.SignedInfo = {};
                        }
                        Object.assign(result.SignedInfo, this.getSignedInfo(elements));
                    }
                }
            }
            return result;
        }
        return null;
    }
    /**
     * 获取文档区域坐标
     * @returns
     */
    getSignatures() {
        const res = this.getOFDElements(SignaturesXml.fileName, 'Signatures');
        if (res && res.elements) {
            const SignaturesElements = res.elements;
            SignaturesElements.forEach(item => {
                if (item?.name) {
                    const { name, attributes } = item;
                    const simpleName = name.replace(NameREG, '');
                    if (simpleName === 'Signature' && attributes?.BaseLoc) {
                        // 获取Signature xml文件
                        const { ID, Type, BaseLoc } = attributes;
                        // 此路径可能为 相对路径
                        const signedInfo = this.getSignature(this.signedPath +
                            BaseLoc.replace(new RegExp(this.signedPath), '').replace(/^\//, ''));
                        if (!SignaturesXml.Signatures) {
                            SignaturesXml.Signatures = [];
                        }
                        SignaturesXml.Signatures.push({
                            ID,
                            Type,
                            BaseLoc,
                            Signature: signedInfo
                        });
                    }
                }
            });
            if (SignaturesXml.Signatures?.length) {
                // 组装成方便遍历的数据，{[id:pageid]:info}
                const result = {};
                SignaturesXml.Signatures.forEach(item => {
                    const { Signature } = item;
                    if (Signature?.SignedInfo?.StampAnnot?.length) {
                        const StampAnnot = Signature.SignedInfo.StampAnnot.map(sa => ({
                            ...sa
                        }));
                        StampAnnot.forEach(cItem => {
                            if (cItem?.PageRef) {
                                if (!result[cItem.PageRef]) {
                                    result[cItem.PageRef] = [];
                                }
                                const newItem = {
                                    ...item,
                                    Signature: {
                                        ...item.Signature,
                                        SignedInfo: {
                                            ...item.Signature?.SignedInfo,
                                            StampAnnot: item.Signature?.SignedInfo?.StampAnnot?.map(sa => ({ ...sa }))
                                        }
                                    }
                                };
                                if (newItem.Signature?.SignedInfo?.StampAnnot?.length) {
                                    newItem.Signature.SignedInfo.StampAnnot = StampAnnot.filter(sItem => sItem.PageRef === cItem.PageRef);
                                }
                                result[cItem.PageRef].push({
                                    ...newItem
                                });
                            }
                        });
                    }
                });
                OFDElement.Signatures = SignaturesXml.Signatures;
                OFDElement.PageSignatures = result;
            }
        }
        return null;
    }
}

class OFDXMl extends OFDElement {
    static fileName;
    constructor(ofdxml) {
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
    getData() {
        const { Pages, Res, OFDElements, DocumnetResRoot, PublicResRoot, Tpls, STLoc, PageArea, Signatures, PageSignatures } = OFDElement;
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

/**
 * @desc mm 转 px
 */
class UnitCoversion {
    /**
     * Description placeholder
     * @date 2022/8/2 - 15:49:57
     *
     * @static
     * @type {number}
     */
    static multiple;
    /**
     * 设置1mm单位
     */
    setUnit() {
        if (document?.body) {
            const div = document.createElement('div');
            div.setAttribute('style', 'width:1mm');
            document.body.appendChild(div);
            const { width } = div.getBoundingClientRect();
            UnitCoversion.multiple = width;
            document.body.removeChild(div);
        }
    }
    /**
     * px转换MM
     * @param millimeter 待转换毫米
     * @returns number
     */
    CoversionMill(px) {
        if (!px)
            return 0;
        if (!UnitCoversion.multiple) {
            this.setUnit();
        }
        return Number(px) / UnitCoversion.multiple;
    }
    /**
     * 毫米转换PX
     * @param millimeter 待转换毫米
     * @returns number
     */
    CoversionPx(millimeter) {
        if (!millimeter)
            return 0;
        if (!UnitCoversion.multiple) {
            this.setUnit();
        }
        return Number(millimeter) * UnitCoversion.multiple;
    }
}
var UnitCoversion$1 = new UnitCoversion();

class ConverterDpi {
    /**
     * 缩放比例
     * @date 2022/8/23 - 09:26:37
     *
     * @type {number}
     */
    scale;
    initScale;
    constructor() {
        this.scale = 1;
        this.initScale = 1;
    }
    setInitScale(n) {
        this.initScale = n || 1;
    }
    setScale(n, isSeal = false) {
        if (!n) {
            return;
        }
        if (isSeal) {
            this.scale = n * this.initScale;
        }
        else {
            this.scale = n;
        }
    }
    getScreenPX(millimeter) {
        return UnitCoversion$1.CoversionPx(Number(millimeter) * (this.scale || 1));
    }
}
var ConverterDpi$1 = new ConverterDpi();

/**
 * @desc 字体family
 */
const FONT_FAMILY = {
    楷体: '楷体, KaiTi, Kai, simkai',
    kaiti: '楷体, KaiTi, Kai, simkai',
    Kai: '楷体, KaiTi, Kai',
    simsun: 'SimSun, simsun, Songti SC',
    宋体: '宋体, SimSun, simsun, Songti SC',
    黑体: '黑体, SimHei, STHeiti, simhei',
    仿宋: 'FangSong, STFangsong, simfang',
    小标宋体: 'sSun',
    方正小标宋_gbk: 'sSun',
    仿宋_gb2312: 'FangSong, STFangsong, simfang',
    楷体_gb2312: '楷体, KaiTi, Kai, simkai',
    华文楷体: '华文楷体, 楷体, KaiTi, Kai, simkai, 宋体',
    华文中宋: '华文楷体, 楷体, KaiTi, Kai, simkai, 宋体',
    couriernew: 'Courier New',
    'courier new': 'Courier New'
};
const pageZIndex = {
    Background: 2,
    Body: 4,
    WatermarkAnnot: 6,
    Foreground: 8
};
/**
 * 设置style样式文件
 * @param ele
 * @param styles
 */
const setStyle = (ele, styles) => {
    if (ele?.setAttribute && styles) {
        let str = '';
        Object.entries(styles).forEach(([keys, val]) => {
            str += `${keys}:${val};`;
        });
        ele.setAttribute('style', str);
    }
};
const converterDpi = millimeter => {
    let defaultPx = ConverterDpi$1.getScreenPX(millimeter);
    return defaultPx;
};
const parseCtm = (ctm) => {
    if (ctm) {
        return ctm.split(' ');
    }
    return null;
};
const parseAbbreviatedData = (abbreviatedData) => {
    if (abbreviatedData) {
        const abbreviatedDataArray = abbreviatedData.split(' ');
        const result = [];
        for (let item of abbreviatedDataArray) {
            if (item) {
                if (item && !/[A-Z]/i.test(item)) {
                    result.push(String(converterDpi(item).toFixed(4)));
                }
                else {
                    let cit = item;
                    if (item === 'S') {
                        cit = 'M';
                    }
                    if (item === 'B') {
                        cit = 'C';
                    }
                    if (item === 'C') {
                        cit = 'Z';
                    }
                    result.push(String(cit));
                }
            }
        }
        return result.join(' ');
    }
    return null;
};
/**
 * 格式化ST_Box数据
 * @param ST_Box
 * @returns
 */
const formatSTBox = (ST_Box, shouldAds = true) => {
    if (!ST_Box)
        return {
            left: 0,
            top: 0,
            width: 0,
            height: 0
        };
    const [left, top, width, height] = ST_Box.split(' ');
    const returnLeft = Number(width) < 0
        ? converterDpi(Number(left) + Number(width))
        : converterDpi(left);
    const returnTop = Number(height) < 0
        ? converterDpi(Number(top) + Number(height))
        : converterDpi(top);
    const returnWidth = converterDpi(shouldAds ? Math.abs(Number(width)) : width);
    const returnHeight = converterDpi(shouldAds ? Math.abs(Number(height)) : height);
    return {
        left: returnLeft,
        top: returnTop,
        width: returnWidth,
        height: returnHeight
    };
};
const getRes = (Res, resId, type) => {
    if (Res) {
        for (let res of Res) {
            if (res.ID == resId && res.OFDType === type) {
                return res;
            }
        }
    }
    return null;
};
const getFont = (Fonts, resId) => {
    return getRes(Fonts, resId, 'Font');
};
const getDrawParam = (DrawParam, resId) => {
    return getRes(DrawParam, resId, 'DrawParam');
};
const getMultiMedia = (MultiMedias, resId) => {
    return getRes(MultiMedias, resId, 'MultiMedia');
};
const calcDeltaPos = (deltaPos, textStr) => {
    const result = [];
    let flagG = false;
    let currentGIndex = 0;
    if (deltaPos) {
        const deltaPosArrays = deltaPos.split(' ').filter(Boolean);
        deltaPosArrays.forEach((item, index) => {
            if (item === 'g') {
                flagG = true;
                currentGIndex = index;
            }
            if (index > currentGIndex + 2) {
                flagG = false;
            }
            if (!flagG) {
                result.push(Number(item));
            }
            // 当循环 为g时， g后第一项为 长度，第二项为度量值，第三项及其后面值直接插入result，直到遇到g
            if (flagG) {
                if (index <= currentGIndex + 2 && index !== currentGIndex) {
                    return;
                }
                const max = Number(deltaPosArrays[currentGIndex + 1]);
                for (let i = 0; i < max; i++) {
                    result.push(Number(deltaPosArrays[currentGIndex + 2]));
                }
            }
        });
        // 优化空格文字
        if (textStr && textStr.length !== result.length + 1) {
            const diff = result[result.length - 1];
            textStr
                .split('')
                .slice(result.length + 1)
                .forEach((_, i) => {
                result.splice(result.length + i, 0, diff + diff * i);
            });
        }
    }
    return result;
};
/**
 * 替换html可识别family
 * @param fontObj
 * @returns
 */
const getFontFamily = (fontInfo) => {
    if (!fontInfo || (!fontInfo.FontName && !fontInfo.family)) {
        return FONT_FAMILY['宋体'];
    }
    if (fontInfo?.Path) {
        return `${fontInfo?.FontName || fontInfo.family}, ${FONT_FAMILY['宋体']}`;
    }
    return (
    //@ts-ignore
    FONT_FAMILY[fontInfo.FontName || fontInfo.family] || FONT_FAMILY['宋体']);
};
/**
 * 计算坐标
 * @param x
 * @param y
 * @param boundary
 * @returns
 */
const adjustPos = function (x, y, boundary) {
    let posX = 0;
    let posY = 0;
    if (boundary) {
        if (typeof boundary === 'string') {
            const [x, y] = boundary.split(' ');
            posX = Number(x);
            posY = Number(y);
        }
        if (typeof boundary === 'object') {
            if (Array.isArray(boundary)) {
                const [x, y] = boundary;
                posX = Number(x);
                posY = Number(y);
            }
            else {
                posX = boundary.left;
                posY = boundary.top;
            }
        }
    }
    const realX = posX + x;
    const realY = posY + y;
    return { cx: realX, cy: realY };
};
/**
 * 格式化颜色
 * @param color
 * @returns
 */
const parseColor = function (color) {
    const cols = String(color);
    if (cols && cols.length > 0) {
        if (cols.indexOf('#') !== -1) {
            let hexCols = cols.replace(/#/g, '');
            hexCols = hexCols.replace(/ /g, '');
            hexCols = '#' + hexCols.toString();
            return hexCols;
        }
        const array = cols.split(' ');
        return `rgb(${array[0]}, ${array[1]}, ${array[2]})`;
    }
    else {
        return `rgb(0, 0, 0)`;
    }
};
const ctmCalPoint = function (x, y, ctm) {
    const numX = Number(x);
    const numY = Number(y);
    if (Array.isArray(ctm)) {
        const [a, b, c, d, e, f] = ctm.map(item => Number(item));
        const ctmX = numX * a + numY * c + 1 * e;
        const ctmY = numX * b + numY * d + 1 * f;
        return { cx: ctmX, cy: ctmY };
    }
    const [a, b, c, d, e, f] = ctm.split(' ').map(item => Number(item));
    const ctmX = numX * a + numY * c + 1 * e;
    const ctmY = numX * b + numY * d + 1 * f;
    return { cx: ctmX, cy: ctmY };
};
const ctmCalDetalPoint = function (x, y, ctm) {
    const numX = Number(x);
    const numY = Number(y);
    if (Array.isArray(ctm)) {
        const [a, b, c, d] = ctm.map(item => Number(item));
        const ctmX = numX * a + numY * c;
        const ctmY = numX * b + numY * d;
        return { ctmX, ctmY };
    }
    const [a, b, c, d] = ctm.split(' ').map(item => Number(item));
    const ctmX = numX * a + numY * c;
    const ctmY = numX * b + numY * d;
    return { ctmX, ctmY };
};
/**
 *
 * @param textCodes
 * @param cgTransform
 * @param ctm
 * @param boundary
 * @param compositeObjectBoundary
 * @param compositeObjectCTM
 * @returns
 */
const calTextPoint = function (textCode, cgTransform, ctm, Boundary, compositeObjectCTM) {
    let x = 0;
    let y = 0;
    let cx = 0;
    let cy = 0;
    let textCodePointList = [];
    if (!textCode) {
        return textCodePointList;
    }
    const boundary = formatSTBox(Boundary, false);
    // console.log('textCode:', textCode, boundary);
    x = parseFloat(textCode['X']);
    y = parseFloat(textCode['Y']);
    // 存在负数宽度字体位置需要调整
    if (isNaN(x) || (x < 0 && boundary.width < 0)) {
        x = 0;
    }
    // 存在负数宽度字体位置需要调整
    if (isNaN(y) || (y < 0 && boundary.height < 0)) {
        y = 0;
    }
    cx = x;
    cy = y;
    if (ctm) {
        const r = ctmCalPoint(cx, cy, ctm);
        cx = r.cx;
        cy = r.cy;
    }
    let textStr = textCode['text'];
    if (textStr) {
        textStr = decodeHtml(textStr);
        textStr = textStr.replace(/&#x20;/g, ' ');
    }
    let deltaXList = [];
    let deltaYList = [];
    if (textCode['DeltaX']) {
        Array.prototype.push.apply(deltaXList, calcDeltaPos(textCode['DeltaX'], textStr));
    }
    if (textCode['DeltaY']) {
        // 确定文字排列位置
        Array.prototype.push.apply(deltaYList, calcDeltaPos(textCode['DeltaY'], textStr));
    }
    if (textStr) {
        for (let i = 0; i < textStr.length; i++) {
            if (i > 0 && deltaXList.length > 0) {
                x += deltaXList[i - 1];
                if (ctm) {
                    const r = ctmCalDetalPoint(deltaXList[i - 1], 0, ctm);
                    cx += r.ctmX;
                }
                else {
                    cx = x;
                }
            }
            if (i > 0 && deltaYList.length > 0) {
                y += deltaYList[i - 1];
                if (ctm) {
                    const r = ctmCalDetalPoint(0, deltaYList[i - 1], ctm);
                    cy += r.ctmY;
                }
                else {
                    cy = y;
                }
            }
            let realPos = adjustPos(cx, cy, boundary);
            if (compositeObjectCTM) {
                realPos = ctmCalPoint(realPos.cx, realPos.cy, compositeObjectCTM);
            }
            let text = textStr.substring(i, i + 1);
            let textCodePoint = {
                x: converterDpi(x),
                y: converterDpi(y),
                text: text,
                cx: converterDpi(realPos.cx),
                cy: converterDpi(realPos.cy)
            };
            textCodePointList.push(textCodePoint);
        }
    }
    if (textCodePointList.length > 0 && cgTransform?.length) {
        for (const transform of cgTransform) {
            // console.log(transform)
            const pos = transform['CodePosition'];
            const glyphCount = transform['GlyphCount'];
            // const codeCount = transform['CodeCount']
            for (let i = pos; i < glyphCount + pos; i++) {
                if (textCodePointList.length <= i) {
                    const glyphs = `${textCodePointList[textCodePointList.length - 1].glyph} ${transform['Glyphs'][i - pos]}`;
                    textCodePointList[textCodePointList.length - 1].glyph = glyphs;
                }
                else {
                    textCodePointList[i].glyph = transform['Glyphs'][i - pos];
                }
            }
        }
    }
    return textCodePointList;
};
const drawBMPImage = async (imgSrc) => {
    try {
        return await new Promise((resolve, reject) => {
            const images = new Image();
            images.src = imgSrc;
            const devRatio = window.devicePixelRatio || 1;
            images.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = images.width * devRatio;
                canvas.height = images.height * devRatio;
                const context = canvas.getContext('2d');
                context.drawImage(images, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    //rgb大于250的透明度y均设置成0
                    if (imageData.data[i] > 250 &&
                        imageData.data[i + 1] > 250 &&
                        imageData.data[i + 2] > 250) {
                        imageData.data[i + 3] = 0;
                    }
                }
                context.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            images.onerror = reject;
        });
    }
    catch (err) {
        console.error('渲染BMP图片异常');
    }
    return '';
};

function loadScript(url) {
    return new Promise((resolve, reject) => {
        try {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            if (script.readState) {
                script.onreadystatechange = () => {
                    if (script.readState === 'loaded' ||
                        script.readState === 'complete') {
                        script.onreadystatechange = null;
                        resolve(true);
                    }
                };
                return;
            }
            script.onload = () => {
                resolve(true);
            };
            script.setAttribute('src', url);
            document.head.appendChild(script);
        }
        catch (err) {
            reject(err);
        }
    });
}

// import { parse, Font } from 'opentype.js';
/**
 * @description 加载内置字体
 */
class FontMap {
    loading = false;
    fontFile = {};
    intervalTimer = null;
    callbacks = [];
    init() {
        // cdn方式引入opentype.js
        if (!window.opentype) {
            this.loading = true;
            loadScript('https://cdn.jsdelivr.net/npm/opentype.js').then(() => {
                this.loading = false;
                // callback && callback();
            });
        }
    }
    setFontFile(key, file, callback) {
        if (!window.opentype) {
            if (this.loading) {
                // 等待 opentype.min.js 加载完成
                if (!this.intervalTimer) {
                    this.intervalTimer = setInterval(() => {
                        if (!this.loading) {
                            if (this.intervalTimer) {
                                clearInterval(this.intervalTimer);
                            }
                            if (this.callbacks.length) {
                                this.callbacks.forEach(({ k, funs, file: f }) => {
                                    try {
                                        if (!this.fontFile[k]) {
                                            this.fontFile[k] = window.opentype.parse(f);
                                        }
                                        funs(true);
                                    }
                                    catch (er) {
                                        console.warn(er);
                                        funs(false);
                                    }
                                });
                            }
                        }
                    }, 30);
                }
                this.callbacks.push({ k: key, file, funs: callback });
            }
            else {
                this.init();
            }
            return;
        }
        try {
            if (window.opentype && !this.fontFile[key]) {
                this.fontFile[key] = window.opentype.parse(file);
            }
            callback(true);
        }
        catch (err) {
            console.warn(err);
            callback(false);
        }
    }
    getFontFile(key, txt, x, y, s) {
        return this.fontFile[key].getPath(txt, x, y, s, { hinting: true }).toSVG(2);
    }
    destroy() {
        this.fontFile = {};
        this.callbacks = [];
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
        }
    }
}
var LoadFontType = new FontMap();

/**
 * 绘制Text
 */
const renderTextObject = (info, data, content, drawFillColor, drawStrokeColor) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('version', '1.1');
    const { TextCode = {}, CTM, Boundary = '', ID, Fill = true, FillColor, Size, Font, HScale, CGTransform, DrawParam, Weight: weight } = info;
    //
    const boundary = formatSTBox(String(Boundary));
    // // 字体大小
    const size = converterDpi(String(Size || 0));
    const fillColor = FillColor;
    let defaultFillColor = drawFillColor;
    let defaultStrokeColor = drawStrokeColor;
    let defaultFillOpacity = 1;
    const textCodePointList = calTextPoint(TextCode, CGTransform, CTM, Boundary);
    let hScale = Number(HScale);
    let isAxialShd = false;
    let drawParam = DrawParam;
    if (drawParam) {
        let dp = getDrawParam(data.Res, drawParam);
        if (dp?.FillColor && dp?.FillColor?.Value) {
            defaultFillColor = parseColor(dp['FillColor']['Value']);
        }
    }
    if (fillColor) {
        if (fillColor?.['Value']) {
            defaultFillColor = parseColor(fillColor['Value']);
        }
        let alpha = parseFloat(fillColor['Alpha'] || '1');
        const AxialShd = fillColor['AxialShd'];
        if (alpha) {
            defaultFillOpacity = alpha > 1 ? alpha / 255 : alpha;
        }
        if (!Fill) {
            defaultFillOpacity = 0;
        }
        if (CTM) {
            const [a, b, c, d] = String(CTM)
                .split(' ')
                .map(i => Number(i));
            const angel = Math.atan2(-b, d);
            if (angel === 0) {
                hScale = a / d;
            }
        }
        // 颜色渐变
        if (AxialShd) {
            isAxialShd = true;
            let linearGradient = document.createElement('linearGradient');
            linearGradient.setAttribute('id', `${ID}`);
            linearGradient.setAttribute('x1', '0%');
            linearGradient.setAttribute('y1', '0%');
            linearGradient.setAttribute('x2', '100%');
            linearGradient.setAttribute('y2', '100%');
            if (AxialShd['Segment']?.length) {
                for (const segment of AxialShd['Segment']) {
                    if (segment) {
                        let stop = document.createElement('stop');
                        stop.setAttribute('offset', `${segment['Position'] * 100}%`);
                        stop.setAttribute('style', `stop-color:${parseColor(segment['Color']['Value'])};stop-opacity:1`);
                        linearGradient.appendChild(stop);
                        defaultFillColor = parseColor(segment['Color']['Value']);
                    }
                }
            }
            svg.appendChild(linearGradient);
        }
    }
    // 字体处理
    const fontObj = getFont(data.Res, Font);
    // 内置字体文件
    if (fontObj?.Path) {
        LoadFontType.setFontFile(fontObj.ID, data.OFDElements[fontObj.Path], res => {
            if (res === true && textCodePointList.length) {
                let str = '';
                let fontTypeY = textCodePointList?.length
                    ? textCodePointList[0].y
                    : 0;
                let fontTypeX = textCodePointList?.length
                    ? textCodePointList[0].x
                    : 0;
                for (const textCodePoint of textCodePointList) {
                    str += textCodePoint.text;
                }
                const resultFont = LoadFontType.getFontFile(fontObj.ID, str, fontTypeX, fontTypeY, size);
                let svgG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                let transform = '';
                if (CTM) {
                    const [a, b, c, d, e, f] = CTM.split(' ');
                    transform = `matrix(${a} ${b} ${c} ${d} ${converterDpi(e)} ${converterDpi(f)})`;
                }
                if (hScale) {
                    transform = `${transform} matrix(${hScale}, 0, 0, 1, ${(1 - hScale) * fontTypeX}, 0)`;
                }
                svgG.setAttribute('transform', transform);
                if (isAxialShd && defaultFillColor) {
                    svgG.setAttribute('fill', defaultFillColor);
                }
                else {
                    defaultStrokeColor && svgG.setAttribute('fill', defaultStrokeColor);
                    defaultFillColor && svgG.setAttribute('fill', defaultFillColor);
                    defaultFillOpacity &&
                        svgG.setAttribute('fill-opacity', `${defaultFillOpacity}`);
                }
                svgG.innerHTML = resultFont;
                svgG.setAttribute('transform', transform);
                if (isAxialShd && defaultFillColor) {
                    svgG.setAttribute('fill', defaultFillColor);
                }
                else {
                    defaultStrokeColor && svgG.setAttribute('fill', defaultStrokeColor);
                    defaultFillColor && svgG.setAttribute('fill', defaultFillColor);
                    defaultFillOpacity &&
                        svgG.setAttribute('fill-opacity', `${defaultFillOpacity}`);
                }
                svgG.setAttribute('style', `font-weight: ${weight};font-size:${size}px;font-family: ${getFontFamily(fontObj)};`);
                svg.appendChild(svgG);
            }
            else {
                for (const textCodePoint of textCodePointList) {
                    let svgTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    svgTxt.innerHTML = textCodePoint.text;
                    svgTxt.setAttribute('x', textCodePoint.x);
                    svgTxt.setAttribute('y', textCodePoint.y);
                    let transform = '';
                    if (CTM) {
                        const [a, b, c, d, e, f] = CTM.split(' ');
                        transform = `matrix(${a} ${b} ${c} ${d} ${converterDpi(e)} ${converterDpi(f)})`;
                    }
                    if (hScale) {
                        transform = `${transform} matrix(${hScale}, 0, 0, 1, ${(1 - hScale) * textCodePoint.x}, 0)`;
                    }
                    svgTxt.setAttribute('transform', transform);
                    if (isAxialShd && defaultFillColor) {
                        svgTxt.setAttribute('fill', defaultFillColor);
                    }
                    else {
                        defaultStrokeColor &&
                            svgTxt.setAttribute('fill', defaultStrokeColor);
                        defaultFillColor && svgTxt.setAttribute('fill', defaultFillColor);
                        defaultFillOpacity &&
                            svgTxt.setAttribute('fill-opacity', `${defaultFillOpacity}`);
                    }
                    svgTxt.setAttribute('style', `font-weight: ${weight};font-size:${size}px;font-family: ${getFontFamily(fontObj)};`);
                    svg.appendChild(svgTxt);
                }
            }
            const width = boundary.width;
            const height = boundary.height;
            const left = boundary.left;
            const top = boundary.top;
            svg.setAttribute('style', `overflow:hidden;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;`);
            if (content) {
                content.appendChild(svg);
            }
        });
        return;
    }
    for (const textCodePoint of textCodePointList) {
        let text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', textCodePoint.x);
        text.setAttribute('y', textCodePoint.y);
        text.innerHTML = textCodePoint.text;
        let transform = '';
        if (CTM) {
            const [a, b, c, d, e, f] = CTM.split(' ');
            transform = `matrix(${a} ${b} ${c} ${d} ${converterDpi(e)} ${converterDpi(f)})`;
        }
        // if (compositeObjectCTM) {
        //   transform = `${transform} matrix(${compositeObjectCTM.a} ${
        //     compositeObjectCTM.b
        //   } ${compositeObjectCTM.c} ${compositeObjectCTM.d} ${converterDpi(
        //     compositeObjectCTM.e
        //   )} ${converterDpi(compositeObjectCTM.f)})`;
        // }
        if (hScale) {
            transform = `${transform} matrix(${hScale}, 0, 0, 1, ${(1 - hScale) * textCodePoint.x}, 0)`;
        }
        text.setAttribute('transform', transform);
        if (isAxialShd && defaultFillColor) {
            text.setAttribute('fill', defaultFillColor);
        }
        else {
            defaultStrokeColor && text.setAttribute('fill', defaultStrokeColor);
            defaultFillColor && text.setAttribute('fill', defaultFillColor);
            defaultFillOpacity &&
                text.setAttribute('fill-opacity', `${defaultFillOpacity}`);
        }
        text.setAttribute('style', `font-weight: ${weight};font-size:${size}px;font-family: ${getFontFamily(fontObj)};`);
        svg.appendChild(text);
    }
    const width = boundary.width;
    const height = boundary.height;
    const left = boundary.left;
    const top = boundary.top;
    svg.setAttribute('style', `overflow:hidden;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;`);
    // svg.innerText = String(TextCode);
    if (content) {
        content.appendChild(svg);
    }
};

const renderPathObject = function (pathObject, data, content, drawLineWidth, drawFillColor, drawStrokeColor, isStampAnnot, compositeObjectAlpha, compositeObjectBoundary, compositeObjectCTM
//   isStampAnnot,
//   compositeObjectAlpha,
//   compositeObjectBoundary,
//   compositeObjectCTM
) {
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('version', '1.1');
    const { Boundary, AbbreviatedData, CTM, LineWidth: lineWidth, DrawParam: pathDrawParam } = pathObject;
    if (!Boundary)
        return svg;
    let boundary = formatSTBox(Boundary);
    let defaultLineWith = drawLineWidth || 1;
    let defaultStrokeColor = drawStrokeColor;
    let defaultFillColor = drawFillColor;
    let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    if (lineWidth) {
        defaultLineWith = converterDpi(lineWidth);
    }
    if (pathDrawParam) {
        let dp = getDrawParam(data.Res, pathDrawParam);
        if (dp?.LineWidth) {
            defaultLineWith = converterDpi(dp.LineWidth);
        }
    }
    if (CTM) {
        const [a, b, c, d, e, f] = String(CTM).split(' ');
        path.setAttribute('transform', `matrix(${a} ${b} ${c} ${d} ${converterDpi(e)} ${converterDpi(f)})`);
    }
    const strokeColor = pathObject['StrokeColor'];
    // let isStrokeAxialShd = false;
    if (strokeColor) {
        if (strokeColor['Value']) {
            defaultStrokeColor = parseColor(strokeColor['Value']);
        }
        const AxialShd = strokeColor['AxialShd'];
        if (AxialShd) {
            // isStrokeAxialShd = true;
            let linearGradient = document.createElement('linearGradient');
            linearGradient.setAttribute('id', `${pathObject['ID']}`);
            linearGradient.setAttribute('x1', '0%');
            linearGradient.setAttribute('y1', '0%');
            linearGradient.setAttribute('x2', '100%');
            linearGradient.setAttribute('y2', '100%');
            if (AxialShd['ofd:Segment']?.length) {
                for (const segment of AxialShd['ofd:Segment']) {
                    if (segment) {
                        let stop = document.createElement('stop');
                        stop.setAttribute('offset', `${segment['Position'] * 100}%`);
                        stop.setAttribute('style', `stop-color:${parseColor(segment['Color']['Value'])};stop-opacity:1`);
                        linearGradient.appendChild(stop);
                        defaultStrokeColor = parseColor(segment['ofd:Color']['@_Value']);
                    }
                }
            }
            svg.appendChild(linearGradient);
        }
    }
    const fillColor = pathObject['FillColor'];
    // let isFillAxialShd = false;
    if (fillColor) {
        if (fillColor['Value']) {
            defaultFillColor = parseColor(fillColor['Value']);
        }
        if (fillColor['Alpha'] && fillColor['Alpha'] == 0) {
            defaultFillColor = 'none';
        }
        const AxialShd = fillColor['AxialShd'];
        if (AxialShd) {
            // isFillAxialShd = true;
            let linearGradient = document.createElement('linearGradient');
            linearGradient.setAttribute('id', `${pathObject['ID']}`);
            linearGradient.setAttribute('x1', '0%');
            linearGradient.setAttribute('y1', '0%');
            linearGradient.setAttribute('x2', '100%');
            linearGradient.setAttribute('y2', '100%');
            if (AxialShd['ofd:Segment']?.length) {
                for (const segment of AxialShd['ofd:Segment']) {
                    if (segment) {
                        let stop = document.createElement('stop');
                        stop.setAttribute('offset', `${segment['Position'] * 100}%`);
                        stop.setAttribute('style', `stop-color:${parseColor(segment['Color']['Value'])};stop-opacity:1`);
                        linearGradient.appendChild(stop);
                        defaultFillColor = parseColor(segment['ofd:Color']['@_Value']);
                    }
                }
            }
            svg.appendChild(linearGradient);
        }
    }
    if (defaultLineWith > 0 && !defaultStrokeColor) {
        defaultStrokeColor = defaultFillColor;
        if (!defaultStrokeColor) {
            defaultStrokeColor = 'rgb(0, 0, 0)';
        }
    }
    if (compositeObjectAlpha) {
        path.setAttribute('fill-opacity', `${compositeObjectAlpha / 255}`);
    }
    if (pathObject['Stroke']) {
        path.setAttribute('stroke', `${defaultStrokeColor}`);
        path.setAttribute('stroke-width', `${defaultLineWith}px`);
    }
    if (!pathObject['Fill']) {
        path.setAttribute('fill', 'none');
    }
    else {
        path.setAttribute('fill', `${isStampAnnot ? 'none' : defaultFillColor ? defaultFillColor : 'none'}`);
        // console.log('isFillAxialShd:', isFillAxialShd);
        // if (isFillAxialShd) {
        //   path.setAttribute('fill', `url(#${pathObject['ID']})`);
        // }
    }
    if (pathObject['Join']) {
        path.setAttribute('stroke-linejoin', `${pathObject['Join']}`);
    }
    if (pathObject['Cap']) {
        path.setAttribute('stroke-linecap', `${pathObject['Cap']}`);
    }
    if (pathObject['DashPattern']) {
        let dash = pathObject['DashPattern'];
        const dashs = parseCtm(dash);
        let offset = 0;
        if (pathObject['DashOffset']) {
            offset = pathObject['DashOffset'];
        }
        if (dashs) {
            path.setAttribute('stroke-dasharray', `${converterDpi(dashs[0])},${converterDpi(dashs[1])}`);
        }
        path.setAttribute('stroke-dashoffset', `${converterDpi(offset)}px`);
    }
    if (AbbreviatedData?.text) {
        const abbreviatedData = parseAbbreviatedData(AbbreviatedData.text);
        path.setAttribute('d', abbreviatedData);
    }
    svg.appendChild(path);
    let width = isStampAnnot ? boundary.width : Math.ceil(boundary.width);
    let height = isStampAnnot ? boundary.height : Math.ceil(boundary.height);
    let left = boundary.left;
    let top = boundary.top;
    svg.setAttribute('style', `overflow:hidden;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;`);
    if (compositeObjectBoundary) {
        let comSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        comSvg.setAttribute('version', '1.1');
        // let width = Math.ceil(boundary.width);
        // let height = Math.ceil(boundary.height);
        // let left = boundary.left;
        // let top = boundary.top;
        comSvg.setAttribute('style', `overflow:hidden;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;`);
        if (compositeObjectCTM) {
            const ctms = parseCtm(compositeObjectCTM);
            if (ctms) {
                svg.setAttribute('transform', `matrix(${ctms[0]} ${ctms[1]} ${ctms[2]} ${ctms[3]} ${converterDpi(ctms[4])} ${converterDpi(ctms[5])})`);
            }
        }
        comSvg.appendChild(svg);
        return comSvg;
    }
    if (content) {
        content.appendChild(svg);
    }
    return svg;
};

/* Copyright 2018 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals process */

// NW.js / Electron is a browser context, but copies some Node.js objects; see
// http://docs.nwjs.io/en/latest/For%20Users/Advanced/JavaScript%20Contexts%20in%20NW.js/#access-nodejs-and-nwjs-api-in-browser-context
// https://www.electronjs.org/docs/api/process#processversionselectron-readonly
// https://www.electronjs.org/docs/api/process#processtype-readonly
const isNodeJS =
  typeof process === 'object' &&
  process + '' === '[object process]' &&
  !process.versions.nw &&
  // @ts-ignore
  !(process.versions.electron && process.type && process.type !== 'browser');

/* Copyright 2017 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Skip compatibility checks for modern builds and if we already ran the module.
if (
  // @ts-ignore
  (typeof PDFJSDev === 'undefined' || !PDFJSDev.test('SKIP_BABEL')) &&
  !globalThis._pdfjsCompatibilityChecked
) {
  globalThis._pdfjsCompatibilityChecked = true;

  // Support: Node.js<16.0.0
  (function checkNodeBtoa() {
    // @ts-ignore
    if (globalThis.btoa || !isNodeJS) {
      return;
    }
    globalThis.btoa = function (chars) {
      // eslint-disable-next-line no-undef
      return Buffer.from(chars, 'binary').toString('base64');
    };
  })();

  // Support: Node.js<16.0.0
  (function checkNodeAtob() {
    // @ts-ignore
    if (globalThis.atob || !isNodeJS) {
      return;
    }
    globalThis.atob = function (input) {
      // eslint-disable-next-line no-undef
      return Buffer.from(input, 'base64').toString('binary');
    };
  })();

  // Support: Node.js
  (function checkDOMMatrix() {
    if (globalThis.DOMMatrix || !isNodeJS) {
      return;
    }
    // @ts-ignore
    globalThis.DOMMatrix = __non_webpack_require__(
      'dommatrix/dist/dommatrix.js'
    );
  })();

  // Support: Node.js
  (function checkReadableStream() {
    if (globalThis.ReadableStream || !isNodeJS) {
      return;
    }
    // @ts-ignore
    globalThis.ReadableStream = __non_webpack_require__(
      'web-streams-polyfill/dist/ponyfill.js'
    ).ReadableStream;
  })();

  // Support: Firefox<90, Chrome<92, Safari<15.4, Node.js<16.6.0
  (function checkArrayAt() {
    // @ts-ignore
    if (Array.prototype.at) {
      return;
    }
    // @ts-ignore
    require('core-js/es/array/at.js');
  })();

  // Support: Firefox<90, Chrome<92, Safari<15.4, Node.js<16.6.0
  (function checkTypedArrayAt() {
    // @ts-ignore
    if (Uint8Array.prototype.at) {
      return;
    }
    // @ts-ignore
    require('core-js/es/typed-array/at.js');
  })();

  // Support: Firefox<94, Chrome<98, Safari<15.4, Node.js<17.0.0
  (function checkStructuredClone() {
    // @ts-ignore
    if (typeof PDFJSDev !== 'undefined' && PDFJSDev.test('IMAGE_DECODERS')) {
      // The current image decoders are synchronous, hence `structuredClone`
      // shouldn't need to be polyfilled for the IMAGE_DECODERS build target.
      return;
    }
    // @ts-ignore
    if (globalThis.structuredClone) {
      return;
    }
    // @ts-ignore
    require('core-js/web/structured-clone.js');
  })();
}

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function unreachable(msg) {
  throw new Error(msg);
}

function shadow(obj, prop, value) {
  // if (
  //   typeof PDFJSDev === "undefined" ||
  //   PDFJSDev.test("!PRODUCTION || TESTING")
  // ) {
  //   assert(
  //     prop in obj,
  //     `shadow: Property "${prop && prop.toString()}" not found in object.`
  //   );
  // }
  Object.defineProperty(obj, prop, {
    value,
    enumerable: true,
    configurable: true,
    writable: false
  });
  return value;
}

/**
 * @type {any}
 */
const BaseException = (function BaseExceptionClosure() {
  // eslint-disable-next-line no-shadow
  function BaseException(message, name) {
    if (this.constructor === BaseException) {
      unreachable('Cannot initialize BaseException.');
    }
    this.message = message;
    this.name = name;
  }
  BaseException.prototype = new Error();
  BaseException.constructor = BaseException;

  return BaseException;
})();

/**
 * Error caused during parsing PDF data.
 */
class FormatError extends BaseException {
  constructor(msg) {
    super(msg, 'FormatError');
  }
}

[...Array(256).keys()].map(n =>
  n.toString(16).padStart(2, '0')
);

/* Copyright 2019 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Calculate the base 2 logarithm of the number `x`. This differs from the
// native function in the sense that it returns the ceiling value and that it
// returns 0 instead of `Infinity`/`NaN` for `x` values smaller than/equal to 0.
function log2(x) {
  if (x <= 0) {
    return 0;
  }
  return Math.ceil(Math.log2(x));
}

function readInt8(data, offset) {
  return (data[offset] << 24) >> 24;
}

function readUint16(data, offset) {
  return (data[offset] << 8) | data[offset + 1];
}

function readUint32(data, offset) {
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  );
}

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Table C-2
const QeTable = [
  { qe: 0x5601, nmps: 1, nlps: 1, switchFlag: 1 },
  { qe: 0x3401, nmps: 2, nlps: 6, switchFlag: 0 },
  { qe: 0x1801, nmps: 3, nlps: 9, switchFlag: 0 },
  { qe: 0x0ac1, nmps: 4, nlps: 12, switchFlag: 0 },
  { qe: 0x0521, nmps: 5, nlps: 29, switchFlag: 0 },
  { qe: 0x0221, nmps: 38, nlps: 33, switchFlag: 0 },
  { qe: 0x5601, nmps: 7, nlps: 6, switchFlag: 1 },
  { qe: 0x5401, nmps: 8, nlps: 14, switchFlag: 0 },
  { qe: 0x4801, nmps: 9, nlps: 14, switchFlag: 0 },
  { qe: 0x3801, nmps: 10, nlps: 14, switchFlag: 0 },
  { qe: 0x3001, nmps: 11, nlps: 17, switchFlag: 0 },
  { qe: 0x2401, nmps: 12, nlps: 18, switchFlag: 0 },
  { qe: 0x1c01, nmps: 13, nlps: 20, switchFlag: 0 },
  { qe: 0x1601, nmps: 29, nlps: 21, switchFlag: 0 },
  { qe: 0x5601, nmps: 15, nlps: 14, switchFlag: 1 },
  { qe: 0x5401, nmps: 16, nlps: 14, switchFlag: 0 },
  { qe: 0x5101, nmps: 17, nlps: 15, switchFlag: 0 },
  { qe: 0x4801, nmps: 18, nlps: 16, switchFlag: 0 },
  { qe: 0x3801, nmps: 19, nlps: 17, switchFlag: 0 },
  { qe: 0x3401, nmps: 20, nlps: 18, switchFlag: 0 },
  { qe: 0x3001, nmps: 21, nlps: 19, switchFlag: 0 },
  { qe: 0x2801, nmps: 22, nlps: 19, switchFlag: 0 },
  { qe: 0x2401, nmps: 23, nlps: 20, switchFlag: 0 },
  { qe: 0x2201, nmps: 24, nlps: 21, switchFlag: 0 },
  { qe: 0x1c01, nmps: 25, nlps: 22, switchFlag: 0 },
  { qe: 0x1801, nmps: 26, nlps: 23, switchFlag: 0 },
  { qe: 0x1601, nmps: 27, nlps: 24, switchFlag: 0 },
  { qe: 0x1401, nmps: 28, nlps: 25, switchFlag: 0 },
  { qe: 0x1201, nmps: 29, nlps: 26, switchFlag: 0 },
  { qe: 0x1101, nmps: 30, nlps: 27, switchFlag: 0 },
  { qe: 0x0ac1, nmps: 31, nlps: 28, switchFlag: 0 },
  { qe: 0x09c1, nmps: 32, nlps: 29, switchFlag: 0 },
  { qe: 0x08a1, nmps: 33, nlps: 30, switchFlag: 0 },
  { qe: 0x0521, nmps: 34, nlps: 31, switchFlag: 0 },
  { qe: 0x0441, nmps: 35, nlps: 32, switchFlag: 0 },
  { qe: 0x02a1, nmps: 36, nlps: 33, switchFlag: 0 },
  { qe: 0x0221, nmps: 37, nlps: 34, switchFlag: 0 },
  { qe: 0x0141, nmps: 38, nlps: 35, switchFlag: 0 },
  { qe: 0x0111, nmps: 39, nlps: 36, switchFlag: 0 },
  { qe: 0x0085, nmps: 40, nlps: 37, switchFlag: 0 },
  { qe: 0x0049, nmps: 41, nlps: 38, switchFlag: 0 },
  { qe: 0x0025, nmps: 42, nlps: 39, switchFlag: 0 },
  { qe: 0x0015, nmps: 43, nlps: 40, switchFlag: 0 },
  { qe: 0x0009, nmps: 44, nlps: 41, switchFlag: 0 },
  { qe: 0x0005, nmps: 45, nlps: 42, switchFlag: 0 },
  { qe: 0x0001, nmps: 45, nlps: 43, switchFlag: 0 },
  { qe: 0x5601, nmps: 46, nlps: 46, switchFlag: 0 }
];

/**
 * This class implements the QM Coder decoding as defined in
 *   JPEG 2000 Part I Final Committee Draft Version 1.0
 *   Annex C.3 Arithmetic decoding procedure
 * available at http://www.jpeg.org/public/fcd15444-1.pdf
 *
 * The arithmetic decoder is used in conjunction with context models to decode
 * JPEG2000 and JBIG2 streams.
 */
class ArithmeticDecoder {
  // C.3.5 Initialisation of the decoder (INITDEC)
  constructor(data, start, end) {
    this.data = data;
    this.bp = start;
    this.dataEnd = end;

    this.chigh = data[start];
    this.clow = 0;

    this.byteIn();

    this.chigh = ((this.chigh << 7) & 0xffff) | ((this.clow >> 9) & 0x7f);
    this.clow = (this.clow << 7) & 0xffff;
    // @ts-ignore
    this.ct -= 7;
    this.a = 0x8000;
  }

  // C.3.4 Compressed data input (BYTEIN)
  byteIn() {
    const data = this.data;
    let bp = this.bp;

    if (data[bp] === 0xff) {
      if (data[bp + 1] > 0x8f) {
        this.clow += 0xff00;
        this.ct = 8;
      } else {
        bp++;
        this.clow += data[bp] << 9;
        this.ct = 7;
        this.bp = bp;
      }
    } else {
      bp++;
      this.clow += bp < this.dataEnd ? data[bp] << 8 : 0xff00;
      this.ct = 8;
      this.bp = bp;
    }
    if (this.clow > 0xffff) {
      this.chigh += this.clow >> 16;
      this.clow &= 0xffff;
    }
  }

  // C.3.2 Decoding a decision (DECODE)
  readBit(contexts, pos) {
    // Contexts are packed into 1 byte:
    // highest 7 bits carry cx.index, lowest bit carries cx.mps
    let cx_index = contexts[pos] >> 1,
      cx_mps = contexts[pos] & 1;
    const qeTableIcx = QeTable[cx_index];
    const qeIcx = qeTableIcx.qe;
    let d;
    let a = this.a - qeIcx;

    if (this.chigh < qeIcx) {
      // exchangeLps
      if (a < qeIcx) {
        a = qeIcx;
        d = cx_mps;
        cx_index = qeTableIcx.nmps;
      } else {
        a = qeIcx;
        d = 1 ^ cx_mps;
        if (qeTableIcx.switchFlag === 1) {
          cx_mps = d;
        }
        cx_index = qeTableIcx.nlps;
      }
    } else {
      this.chigh -= qeIcx;
      if ((a & 0x8000) !== 0) {
        this.a = a;
        return cx_mps;
      }
      // exchangeMps
      if (a < qeIcx) {
        d = 1 ^ cx_mps;
        if (qeTableIcx.switchFlag === 1) {
          cx_mps = d;
        }
        cx_index = qeTableIcx.nlps;
      } else {
        d = cx_mps;
        cx_index = qeTableIcx.nmps;
      }
    }
    // C.3.3 renormD;
    do {
      if (this.ct === 0) {
        this.byteIn();
      }

      a <<= 1;
      this.chigh = ((this.chigh << 1) & 0xffff) | ((this.clow >> 15) & 1);
      this.clow = (this.clow << 1) & 0xffff;
      // @ts-ignore
      this.ct--;
    } while ((a & 0x8000) === 0);
    this.a = a;

    contexts[pos] = (cx_index << 1) | cx_mps;
    return d;
  }
}

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @typedef {Object} CCITTFaxDecoderSource
 * @property {function} next - Method that return one byte of data for decoding,
 *   or -1 when EOF is reached.
 */

const ccittEOL = -2;
const ccittEOF = -1;
const twoDimPass = 0;
const twoDimHoriz = 1;
const twoDimVert0 = 2;
const twoDimVertR1 = 3;
const twoDimVertL1 = 4;
const twoDimVertR2 = 5;
const twoDimVertL2 = 6;
const twoDimVertR3 = 7;
const twoDimVertL3 = 8;

// prettier-ignore
const twoDimTable = [
  [-1, -1], [-1, -1],                   // 000000x
  [7, twoDimVertL3],                    // 0000010
  [7, twoDimVertR3],                    // 0000011
  [6, twoDimVertL2], [6, twoDimVertL2], // 000010x
  [6, twoDimVertR2], [6, twoDimVertR2], // 000011x
  [4, twoDimPass], [4, twoDimPass],     // 0001xxx
  [4, twoDimPass], [4, twoDimPass],
  [4, twoDimPass], [4, twoDimPass],
  [4, twoDimPass], [4, twoDimPass],
  [3, twoDimHoriz], [3, twoDimHoriz],   // 001xxxx
  [3, twoDimHoriz], [3, twoDimHoriz],
  [3, twoDimHoriz], [3, twoDimHoriz],
  [3, twoDimHoriz], [3, twoDimHoriz],
  [3, twoDimHoriz], [3, twoDimHoriz],
  [3, twoDimHoriz], [3, twoDimHoriz],
  [3, twoDimHoriz], [3, twoDimHoriz],
  [3, twoDimHoriz], [3, twoDimHoriz],
  [3, twoDimVertL1], [3, twoDimVertL1], // 010xxxx
  [3, twoDimVertL1], [3, twoDimVertL1],
  [3, twoDimVertL1], [3, twoDimVertL1],
  [3, twoDimVertL1], [3, twoDimVertL1],
  [3, twoDimVertL1], [3, twoDimVertL1],
  [3, twoDimVertL1], [3, twoDimVertL1],
  [3, twoDimVertL1], [3, twoDimVertL1],
  [3, twoDimVertL1], [3, twoDimVertL1],
  [3, twoDimVertR1], [3, twoDimVertR1], // 011xxxx
  [3, twoDimVertR1], [3, twoDimVertR1],
  [3, twoDimVertR1], [3, twoDimVertR1],
  [3, twoDimVertR1], [3, twoDimVertR1],
  [3, twoDimVertR1], [3, twoDimVertR1],
  [3, twoDimVertR1], [3, twoDimVertR1],
  [3, twoDimVertR1], [3, twoDimVertR1],
  [3, twoDimVertR1], [3, twoDimVertR1],
  [1, twoDimVert0], [1, twoDimVert0],   // 1xxxxxx
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0],
  [1, twoDimVert0], [1, twoDimVert0]
];

// prettier-ignore
const whiteTable1 = [
  [-1, -1],                               // 00000
  [12, ccittEOL],                         // 00001
  [-1, -1], [-1, -1],                     // 0001x
  [-1, -1], [-1, -1], [-1, -1], [-1, -1], // 001xx
  [-1, -1], [-1, -1], [-1, -1], [-1, -1], // 010xx
  [-1, -1], [-1, -1], [-1, -1], [-1, -1], // 011xx
  [11, 1792], [11, 1792],                 // 1000x
  [12, 1984],                             // 10010
  [12, 2048],                             // 10011
  [12, 2112],                             // 10100
  [12, 2176],                             // 10101
  [12, 2240],                             // 10110
  [12, 2304],                             // 10111
  [11, 1856], [11, 1856],                 // 1100x
  [11, 1920], [11, 1920],                 // 1101x
  [12, 2368],                             // 11100
  [12, 2432],                             // 11101
  [12, 2496],                             // 11110
  [12, 2560]                              // 11111
];

// prettier-ignore
const whiteTable2 = [
  [-1, -1], [-1, -1], [-1, -1], [-1, -1],     // 0000000xx
  [8, 29], [8, 29],                           // 00000010x
  [8, 30], [8, 30],                           // 00000011x
  [8, 45], [8, 45],                           // 00000100x
  [8, 46], [8, 46],                           // 00000101x
  [7, 22], [7, 22], [7, 22], [7, 22],         // 0000011xx
  [7, 23], [7, 23], [7, 23], [7, 23],         // 0000100xx
  [8, 47], [8, 47],                           // 00001010x
  [8, 48], [8, 48],                           // 00001011x
  [6, 13], [6, 13], [6, 13], [6, 13],         // 000011xxx
  [6, 13], [6, 13], [6, 13], [6, 13],
  [7, 20], [7, 20], [7, 20], [7, 20],         // 0001000xx
  [8, 33], [8, 33],                           // 00010010x
  [8, 34], [8, 34],                           // 00010011x
  [8, 35], [8, 35],                           // 00010100x
  [8, 36], [8, 36],                           // 00010101x
  [8, 37], [8, 37],                           // 00010110x
  [8, 38], [8, 38],                           // 00010111x
  [7, 19], [7, 19], [7, 19], [7, 19],         // 0001100xx
  [8, 31], [8, 31],                           // 00011010x
  [8, 32], [8, 32],                           // 00011011x
  [6, 1], [6, 1], [6, 1], [6, 1],             // 000111xxx
  [6, 1], [6, 1], [6, 1], [6, 1],
  [6, 12], [6, 12], [6, 12], [6, 12],         // 001000xxx
  [6, 12], [6, 12], [6, 12], [6, 12],
  [8, 53], [8, 53],                           // 00100100x
  [8, 54], [8, 54],                           // 00100101x
  [7, 26], [7, 26], [7, 26], [7, 26],         // 0010011xx
  [8, 39], [8, 39],                           // 00101000x
  [8, 40], [8, 40],                           // 00101001x
  [8, 41], [8, 41],                           // 00101010x
  [8, 42], [8, 42],                           // 00101011x
  [8, 43], [8, 43],                           // 00101100x
  [8, 44], [8, 44],                           // 00101101x
  [7, 21], [7, 21], [7, 21], [7, 21],         // 0010111xx
  [7, 28], [7, 28], [7, 28], [7, 28],         // 0011000xx
  [8, 61], [8, 61],                           // 00110010x
  [8, 62], [8, 62],                           // 00110011x
  [8, 63], [8, 63],                           // 00110100x
  [8, 0], [8, 0],                             // 00110101x
  [8, 320], [8, 320],                         // 00110110x
  [8, 384], [8, 384],                         // 00110111x
  [5, 10], [5, 10], [5, 10], [5, 10],         // 00111xxxx
  [5, 10], [5, 10], [5, 10], [5, 10],
  [5, 10], [5, 10], [5, 10], [5, 10],
  [5, 10], [5, 10], [5, 10], [5, 10],
  [5, 11], [5, 11], [5, 11], [5, 11],         // 01000xxxx
  [5, 11], [5, 11], [5, 11], [5, 11],
  [5, 11], [5, 11], [5, 11], [5, 11],
  [5, 11], [5, 11], [5, 11], [5, 11],
  [7, 27], [7, 27], [7, 27], [7, 27],         // 0100100xx
  [8, 59], [8, 59],                           // 01001010x
  [8, 60], [8, 60],                           // 01001011x
  [9, 1472],                                  // 010011000
  [9, 1536],                                  // 010011001
  [9, 1600],                                  // 010011010
  [9, 1728],                                  // 010011011
  [7, 18], [7, 18], [7, 18], [7, 18],         // 0100111xx
  [7, 24], [7, 24], [7, 24], [7, 24],         // 0101000xx
  [8, 49], [8, 49],                           // 01010010x
  [8, 50], [8, 50],                           // 01010011x
  [8, 51], [8, 51],                           // 01010100x
  [8, 52], [8, 52],                           // 01010101x
  [7, 25], [7, 25], [7, 25], [7, 25],         // 0101011xx
  [8, 55], [8, 55],                           // 01011000x
  [8, 56], [8, 56],                           // 01011001x
  [8, 57], [8, 57],                           // 01011010x
  [8, 58], [8, 58],                           // 01011011x
  [6, 192], [6, 192], [6, 192], [6, 192],     // 010111xxx
  [6, 192], [6, 192], [6, 192], [6, 192],
  [6, 1664], [6, 1664], [6, 1664], [6, 1664], // 011000xxx
  [6, 1664], [6, 1664], [6, 1664], [6, 1664],
  [8, 448], [8, 448],                         // 01100100x
  [8, 512], [8, 512],                         // 01100101x
  [9, 704],                                   // 011001100
  [9, 768],                                   // 011001101
  [8, 640], [8, 640],                         // 01100111x
  [8, 576], [8, 576],                         // 01101000x
  [9, 832],                                   // 011010010
  [9, 896],                                   // 011010011
  [9, 960],                                   // 011010100
  [9, 1024],                                  // 011010101
  [9, 1088],                                  // 011010110
  [9, 1152],                                  // 011010111
  [9, 1216],                                  // 011011000
  [9, 1280],                                  // 011011001
  [9, 1344],                                  // 011011010
  [9, 1408],                                  // 011011011
  [7, 256], [7, 256], [7, 256], [7, 256],     // 0110111xx
  [4, 2], [4, 2], [4, 2], [4, 2],             // 0111xxxxx
  [4, 2], [4, 2], [4, 2], [4, 2],
  [4, 2], [4, 2], [4, 2], [4, 2],
  [4, 2], [4, 2], [4, 2], [4, 2],
  [4, 2], [4, 2], [4, 2], [4, 2],
  [4, 2], [4, 2], [4, 2], [4, 2],
  [4, 2], [4, 2], [4, 2], [4, 2],
  [4, 2], [4, 2], [4, 2], [4, 2],
  [4, 3], [4, 3], [4, 3], [4, 3],             // 1000xxxxx
  [4, 3], [4, 3], [4, 3], [4, 3],
  [4, 3], [4, 3], [4, 3], [4, 3],
  [4, 3], [4, 3], [4, 3], [4, 3],
  [4, 3], [4, 3], [4, 3], [4, 3],
  [4, 3], [4, 3], [4, 3], [4, 3],
  [4, 3], [4, 3], [4, 3], [4, 3],
  [4, 3], [4, 3], [4, 3], [4, 3],
  [5, 128], [5, 128], [5, 128], [5, 128],     // 10010xxxx
  [5, 128], [5, 128], [5, 128], [5, 128],
  [5, 128], [5, 128], [5, 128], [5, 128],
  [5, 128], [5, 128], [5, 128], [5, 128],
  [5, 8], [5, 8], [5, 8], [5, 8],             // 10011xxxx
  [5, 8], [5, 8], [5, 8], [5, 8],
  [5, 8], [5, 8], [5, 8], [5, 8],
  [5, 8], [5, 8], [5, 8], [5, 8],
  [5, 9], [5, 9], [5, 9], [5, 9],             // 10100xxxx
  [5, 9], [5, 9], [5, 9], [5, 9],
  [5, 9], [5, 9], [5, 9], [5, 9],
  [5, 9], [5, 9], [5, 9], [5, 9],
  [6, 16], [6, 16], [6, 16], [6, 16],         // 101010xxx
  [6, 16], [6, 16], [6, 16], [6, 16],
  [6, 17], [6, 17], [6, 17], [6, 17],         // 101011xxx
  [6, 17], [6, 17], [6, 17], [6, 17],
  [4, 4], [4, 4], [4, 4], [4, 4],             // 1011xxxxx
  [4, 4], [4, 4], [4, 4], [4, 4],
  [4, 4], [4, 4], [4, 4], [4, 4],
  [4, 4], [4, 4], [4, 4], [4, 4],
  [4, 4], [4, 4], [4, 4], [4, 4],
  [4, 4], [4, 4], [4, 4], [4, 4],
  [4, 4], [4, 4], [4, 4], [4, 4],
  [4, 4], [4, 4], [4, 4], [4, 4],
  [4, 5], [4, 5], [4, 5], [4, 5],             // 1100xxxxx
  [4, 5], [4, 5], [4, 5], [4, 5],
  [4, 5], [4, 5], [4, 5], [4, 5],
  [4, 5], [4, 5], [4, 5], [4, 5],
  [4, 5], [4, 5], [4, 5], [4, 5],
  [4, 5], [4, 5], [4, 5], [4, 5],
  [4, 5], [4, 5], [4, 5], [4, 5],
  [4, 5], [4, 5], [4, 5], [4, 5],
  [6, 14], [6, 14], [6, 14], [6, 14],         // 110100xxx
  [6, 14], [6, 14], [6, 14], [6, 14],
  [6, 15], [6, 15], [6, 15], [6, 15],         // 110101xxx
  [6, 15], [6, 15], [6, 15], [6, 15],
  [5, 64], [5, 64], [5, 64], [5, 64],         // 11011xxxx
  [5, 64], [5, 64], [5, 64], [5, 64],
  [5, 64], [5, 64], [5, 64], [5, 64],
  [5, 64], [5, 64], [5, 64], [5, 64],
  [4, 6], [4, 6], [4, 6], [4, 6],             // 1110xxxxx
  [4, 6], [4, 6], [4, 6], [4, 6],
  [4, 6], [4, 6], [4, 6], [4, 6],
  [4, 6], [4, 6], [4, 6], [4, 6],
  [4, 6], [4, 6], [4, 6], [4, 6],
  [4, 6], [4, 6], [4, 6], [4, 6],
  [4, 6], [4, 6], [4, 6], [4, 6],
  [4, 6], [4, 6], [4, 6], [4, 6],
  [4, 7], [4, 7], [4, 7], [4, 7],             // 1111xxxxx
  [4, 7], [4, 7], [4, 7], [4, 7],
  [4, 7], [4, 7], [4, 7], [4, 7],
  [4, 7], [4, 7], [4, 7], [4, 7],
  [4, 7], [4, 7], [4, 7], [4, 7],
  [4, 7], [4, 7], [4, 7], [4, 7],
  [4, 7], [4, 7], [4, 7], [4, 7],
  [4, 7], [4, 7], [4, 7], [4, 7]
];

// prettier-ignore
const blackTable1 = [
  [-1, -1], [-1, -1],                             // 000000000000x
  [12, ccittEOL], [12, ccittEOL],                 // 000000000001x
  [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000001xx
  [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000010xx
  [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000011xx
  [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000100xx
  [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000101xx
  [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000110xx
  [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000111xx
  [11, 1792], [11, 1792], [11, 1792], [11, 1792], // 00000001000xx
  [12, 1984], [12, 1984],                         // 000000010010x
  [12, 2048], [12, 2048],                         // 000000010011x
  [12, 2112], [12, 2112],                         // 000000010100x
  [12, 2176], [12, 2176],                         // 000000010101x
  [12, 2240], [12, 2240],                         // 000000010110x
  [12, 2304], [12, 2304],                         // 000000010111x
  [11, 1856], [11, 1856], [11, 1856], [11, 1856], // 00000001100xx
  [11, 1920], [11, 1920], [11, 1920], [11, 1920], // 00000001101xx
  [12, 2368], [12, 2368],                         // 000000011100x
  [12, 2432], [12, 2432],                         // 000000011101x
  [12, 2496], [12, 2496],                         // 000000011110x
  [12, 2560], [12, 2560],                         // 000000011111x
  [10, 18], [10, 18], [10, 18], [10, 18],         // 0000001000xxx
  [10, 18], [10, 18], [10, 18], [10, 18],
  [12, 52], [12, 52],                             // 000000100100x
  [13, 640],                                      // 0000001001010
  [13, 704],                                      // 0000001001011
  [13, 768],                                      // 0000001001100
  [13, 832],                                      // 0000001001101
  [12, 55], [12, 55],                             // 000000100111x
  [12, 56], [12, 56],                             // 000000101000x
  [13, 1280],                                     // 0000001010010
  [13, 1344],                                     // 0000001010011
  [13, 1408],                                     // 0000001010100
  [13, 1472],                                     // 0000001010101
  [12, 59], [12, 59],                             // 000000101011x
  [12, 60], [12, 60],                             // 000000101100x
  [13, 1536],                                     // 0000001011010
  [13, 1600],                                     // 0000001011011
  [11, 24], [11, 24], [11, 24], [11, 24],         // 00000010111xx
  [11, 25], [11, 25], [11, 25], [11, 25],         // 00000011000xx
  [13, 1664],                                     // 0000001100100
  [13, 1728],                                     // 0000001100101
  [12, 320], [12, 320],                           // 000000110011x
  [12, 384], [12, 384],                           // 000000110100x
  [12, 448], [12, 448],                           // 000000110101x
  [13, 512],                                      // 0000001101100
  [13, 576],                                      // 0000001101101
  [12, 53], [12, 53],                             // 000000110111x
  [12, 54], [12, 54],                             // 000000111000x
  [13, 896],                                      // 0000001110010
  [13, 960],                                      // 0000001110011
  [13, 1024],                                     // 0000001110100
  [13, 1088],                                     // 0000001110101
  [13, 1152],                                     // 0000001110110
  [13, 1216],                                     // 0000001110111
  [10, 64], [10, 64], [10, 64], [10, 64],         // 0000001111xxx
  [10, 64], [10, 64], [10, 64], [10, 64]
];

// prettier-ignore
const blackTable2 = [
  [8, 13], [8, 13], [8, 13], [8, 13],     // 00000100xxxx
  [8, 13], [8, 13], [8, 13], [8, 13],
  [8, 13], [8, 13], [8, 13], [8, 13],
  [8, 13], [8, 13], [8, 13], [8, 13],
  [11, 23], [11, 23],                     // 00000101000x
  [12, 50],                               // 000001010010
  [12, 51],                               // 000001010011
  [12, 44],                               // 000001010100
  [12, 45],                               // 000001010101
  [12, 46],                               // 000001010110
  [12, 47],                               // 000001010111
  [12, 57],                               // 000001011000
  [12, 58],                               // 000001011001
  [12, 61],                               // 000001011010
  [12, 256],                              // 000001011011
  [10, 16], [10, 16], [10, 16], [10, 16], // 0000010111xx
  [10, 17], [10, 17], [10, 17], [10, 17], // 0000011000xx
  [12, 48],                               // 000001100100
  [12, 49],                               // 000001100101
  [12, 62],                               // 000001100110
  [12, 63],                               // 000001100111
  [12, 30],                               // 000001101000
  [12, 31],                               // 000001101001
  [12, 32],                               // 000001101010
  [12, 33],                               // 000001101011
  [12, 40],                               // 000001101100
  [12, 41],                               // 000001101101
  [11, 22], [11, 22],                     // 00000110111x
  [8, 14], [8, 14], [8, 14], [8, 14],     // 00000111xxxx
  [8, 14], [8, 14], [8, 14], [8, 14],
  [8, 14], [8, 14], [8, 14], [8, 14],
  [8, 14], [8, 14], [8, 14], [8, 14],
  [7, 10], [7, 10], [7, 10], [7, 10],     // 0000100xxxxx
  [7, 10], [7, 10], [7, 10], [7, 10],
  [7, 10], [7, 10], [7, 10], [7, 10],
  [7, 10], [7, 10], [7, 10], [7, 10],
  [7, 10], [7, 10], [7, 10], [7, 10],
  [7, 10], [7, 10], [7, 10], [7, 10],
  [7, 10], [7, 10], [7, 10], [7, 10],
  [7, 10], [7, 10], [7, 10], [7, 10],
  [7, 11], [7, 11], [7, 11], [7, 11],     // 0000101xxxxx
  [7, 11], [7, 11], [7, 11], [7, 11],
  [7, 11], [7, 11], [7, 11], [7, 11],
  [7, 11], [7, 11], [7, 11], [7, 11],
  [7, 11], [7, 11], [7, 11], [7, 11],
  [7, 11], [7, 11], [7, 11], [7, 11],
  [7, 11], [7, 11], [7, 11], [7, 11],
  [7, 11], [7, 11], [7, 11], [7, 11],
  [9, 15], [9, 15], [9, 15], [9, 15],     // 000011000xxx
  [9, 15], [9, 15], [9, 15], [9, 15],
  [12, 128],                              // 000011001000
  [12, 192],                              // 000011001001
  [12, 26],                               // 000011001010
  [12, 27],                               // 000011001011
  [12, 28],                               // 000011001100
  [12, 29],                               // 000011001101
  [11, 19], [11, 19],                     // 00001100111x
  [11, 20], [11, 20],                     // 00001101000x
  [12, 34],                               // 000011010010
  [12, 35],                               // 000011010011
  [12, 36],                               // 000011010100
  [12, 37],                               // 000011010101
  [12, 38],                               // 000011010110
  [12, 39],                               // 000011010111
  [11, 21], [11, 21],                     // 00001101100x
  [12, 42],                               // 000011011010
  [12, 43],                               // 000011011011
  [10, 0], [10, 0], [10, 0], [10, 0],     // 0000110111xx
  [7, 12], [7, 12], [7, 12], [7, 12],     // 0000111xxxxx
  [7, 12], [7, 12], [7, 12], [7, 12],
  [7, 12], [7, 12], [7, 12], [7, 12],
  [7, 12], [7, 12], [7, 12], [7, 12],
  [7, 12], [7, 12], [7, 12], [7, 12],
  [7, 12], [7, 12], [7, 12], [7, 12],
  [7, 12], [7, 12], [7, 12], [7, 12],
  [7, 12], [7, 12], [7, 12], [7, 12]
];

// prettier-ignore
const blackTable3 = [
  [-1, -1], [-1, -1], [-1, -1], [-1, -1], // 0000xx
  [6, 9],                                 // 000100
  [6, 8],                                 // 000101
  [5, 7], [5, 7],                         // 00011x
  [4, 6], [4, 6], [4, 6], [4, 6],         // 0010xx
  [4, 5], [4, 5], [4, 5], [4, 5],         // 0011xx
  [3, 1], [3, 1], [3, 1], [3, 1],         // 010xxx
  [3, 1], [3, 1], [3, 1], [3, 1],
  [3, 4], [3, 4], [3, 4], [3, 4],         // 011xxx
  [3, 4], [3, 4], [3, 4], [3, 4],
  [2, 3], [2, 3], [2, 3], [2, 3],         // 10xxxx
  [2, 3], [2, 3], [2, 3], [2, 3],
  [2, 3], [2, 3], [2, 3], [2, 3],
  [2, 3], [2, 3], [2, 3], [2, 3],
  [2, 2], [2, 2], [2, 2], [2, 2],         // 11xxxx
  [2, 2], [2, 2], [2, 2], [2, 2],
  [2, 2], [2, 2], [2, 2], [2, 2],
  [2, 2], [2, 2], [2, 2], [2, 2]
];

/**
 * @param {CCITTFaxDecoderSource} source - The data which should be decoded.
 * @param {Object} [options] - Decoding options.
 */
class CCITTFaxDecoder {
  constructor(source, options = {}) {
    if (!source || typeof source.next !== 'function') {
      throw new Error('CCITTFaxDecoder - invalid "source" parameter.');
    }
    this.source = source;
    this.eof = false;

    this.encoding = options.K || 0;
    this.eoline = options.EndOfLine || false;
    this.byteAlign = options.EncodedByteAlign || false;
    this.columns = options.Columns || 1728;
    this.rows = options.Rows || 0;
    let eoblock = options.EndOfBlock;
    if (eoblock === null || eoblock === undefined) {
      eoblock = true;
    }
    this.eoblock = eoblock;
    this.black = options.BlackIs1 || false;

    this.codingLine = new Uint32Array(this.columns + 1);
    this.refLine = new Uint32Array(this.columns + 2);

    this.codingLine[0] = this.columns;
    this.codingPos = 0;

    this.row = 0;
    this.nextLine2D = this.encoding < 0;
    this.inputBits = 0;
    this.inputBuf = 0;
    this.outputBits = 0;
    this.rowsDone = false;

    let code1;
    while ((code1 = this._lookBits(12)) === 0) {
      this._eatBits(1);
    }
    if (code1 === 1) {
      this._eatBits(12);
    }
    if (this.encoding > 0) {
      this.nextLine2D = !this._lookBits(1);
      this._eatBits(1);
    }
  }

  readNextChar() {
    if (this.eof) {
      return -1;
    }
    const refLine = this.refLine;
    const codingLine = this.codingLine;
    const columns = this.columns;

    let refPos, blackPixels, bits, i;

    if (this.outputBits === 0) {
      if (this.rowsDone) {
        this.eof = true;
      }
      if (this.eof) {
        return -1;
      }
      this.err = false;

      let code1, code2, code3;
      if (this.nextLine2D) {
        for (i = 0; codingLine[i] < columns; ++i) {
          refLine[i] = codingLine[i];
        }
        refLine[i++] = columns;
        refLine[i] = columns;
        codingLine[0] = 0;
        this.codingPos = 0;
        refPos = 0;
        blackPixels = 0;

        while (codingLine[this.codingPos] < columns) {
          code1 = this._getTwoDimCode();
          switch (code1) {
            case twoDimPass:
              this._addPixels(refLine[refPos + 1], blackPixels);
              if (refLine[refPos + 1] < columns) {
                refPos += 2;
              }
              break;
            case twoDimHoriz:
              code1 = code2 = 0;
              if (blackPixels) {
                do {
                  code1 += code3 = this._getBlackCode();
                } while (code3 >= 64);
                do {
                  code2 += code3 = this._getWhiteCode();
                } while (code3 >= 64);
              } else {
                do {
                  code1 += code3 = this._getWhiteCode();
                } while (code3 >= 64);
                do {
                  code2 += code3 = this._getBlackCode();
                } while (code3 >= 64);
              }
              this._addPixels(codingLine[this.codingPos] + code1, blackPixels);
              if (codingLine[this.codingPos] < columns) {
                this._addPixels(
                  codingLine[this.codingPos] + code2,
                  blackPixels ^ 1
                );
              }
              while (
                refLine[refPos] <= codingLine[this.codingPos] &&
                refLine[refPos] < columns
              ) {
                refPos += 2;
              }
              break;
            case twoDimVertR3:
              this._addPixels(refLine[refPos] + 3, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (
                  refLine[refPos] <= codingLine[this.codingPos] &&
                  refLine[refPos] < columns
                ) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertR2:
              this._addPixels(refLine[refPos] + 2, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (
                  refLine[refPos] <= codingLine[this.codingPos] &&
                  refLine[refPos] < columns
                ) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertR1:
              this._addPixels(refLine[refPos] + 1, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (
                  refLine[refPos] <= codingLine[this.codingPos] &&
                  refLine[refPos] < columns
                ) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVert0:
              this._addPixels(refLine[refPos], blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (
                  refLine[refPos] <= codingLine[this.codingPos] &&
                  refLine[refPos] < columns
                ) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertL3:
              this._addPixelsNeg(refLine[refPos] - 3, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                if (refPos > 0) {
                  --refPos;
                } else {
                  ++refPos;
                }
                while (
                  refLine[refPos] <= codingLine[this.codingPos] &&
                  refLine[refPos] < columns
                ) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertL2:
              this._addPixelsNeg(refLine[refPos] - 2, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                if (refPos > 0) {
                  --refPos;
                } else {
                  ++refPos;
                }
                while (
                  refLine[refPos] <= codingLine[this.codingPos] &&
                  refLine[refPos] < columns
                ) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertL1:
              this._addPixelsNeg(refLine[refPos] - 1, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                if (refPos > 0) {
                  --refPos;
                } else {
                  ++refPos;
                }
                while (
                  refLine[refPos] <= codingLine[this.codingPos] &&
                  refLine[refPos] < columns
                ) {
                  refPos += 2;
                }
              }
              break;
            case ccittEOF:
              this._addPixels(columns, 0);
              this.eof = true;
              break;
            default:
              this._addPixels(columns, 0);
              this.err = true;
          }
        }
      } else {
        codingLine[0] = 0;
        this.codingPos = 0;
        blackPixels = 0;
        while (codingLine[this.codingPos] < columns) {
          code1 = 0;
          if (blackPixels) {
            do {
              code1 += code3 = this._getBlackCode();
            } while (code3 >= 64);
          } else {
            do {
              code1 += code3 = this._getWhiteCode();
            } while (code3 >= 64);
          }
          this._addPixels(codingLine[this.codingPos] + code1, blackPixels);
          blackPixels ^= 1;
        }
      }

      let gotEOL = false;

      if (this.byteAlign) {
        this.inputBits &= ~7;
      }

      if (!this.eoblock && this.row === this.rows - 1) {
        this.rowsDone = true;
      } else {
        code1 = this._lookBits(12);
        if (this.eoline) {
          while (code1 !== ccittEOF && code1 !== 1) {
            this._eatBits(1);
            code1 = this._lookBits(12);
          }
        } else {
          while (code1 === 0) {
            this._eatBits(1);
            code1 = this._lookBits(12);
          }
        }
        if (code1 === 1) {
          this._eatBits(12);
          gotEOL = true;
        } else if (code1 === ccittEOF) {
          this.eof = true;
        }
      }

      if (!this.eof && this.encoding > 0 && !this.rowsDone) {
        this.nextLine2D = !this._lookBits(1);
        this._eatBits(1);
      }

      if (this.eoblock && gotEOL && this.byteAlign) {
        code1 = this._lookBits(12);
        if (code1 === 1) {
          this._eatBits(12);
          if (this.encoding > 0) {
            this._lookBits(1);
            this._eatBits(1);
          }
          if (this.encoding >= 0) {
            for (i = 0; i < 4; ++i) {
              code1 = this._lookBits(12);
              this._eatBits(12);
              if (this.encoding > 0) {
                this._lookBits(1);
                this._eatBits(1);
              }
            }
          }
          this.eof = true;
        }
      } else if (this.err && this.eoline) {
        while (true) {
          code1 = this._lookBits(13);
          if (code1 === ccittEOF) {
            this.eof = true;
            return -1;
          }
          if (code1 >> 1 === 1) {
            break;
          }
          this._eatBits(1);
        }
        this._eatBits(12);
        if (this.encoding > 0) {
          this._eatBits(1);
          this.nextLine2D = !(code1 & 1);
        }
      }

      if (codingLine[0] > 0) {
        this.outputBits = codingLine[(this.codingPos = 0)];
      } else {
        this.outputBits = codingLine[(this.codingPos = 1)];
      }
      this.row++;
    }

    let c;
    if (this.outputBits >= 8) {
      c = this.codingPos & 1 ? 0 : 0xff;
      this.outputBits -= 8;
      if (this.outputBits === 0 && codingLine[this.codingPos] < columns) {
        this.codingPos++;
        this.outputBits =
          codingLine[this.codingPos] - codingLine[this.codingPos - 1];
      }
    } else {
      bits = 8;
      c = 0;
      do {
        if (typeof this.outputBits !== 'number') {
          throw new FormatError(
            'Invalid /CCITTFaxDecode data, "outputBits" must be a number.'
          );
        }

        if (this.outputBits > bits) {
          c <<= bits;
          if (!(this.codingPos & 1)) {
            c |= 0xff >> (8 - bits);
          }
          this.outputBits -= bits;
          bits = 0;
        } else {
          c <<= this.outputBits;
          if (!(this.codingPos & 1)) {
            c |= 0xff >> (8 - this.outputBits);
          }
          bits -= this.outputBits;
          this.outputBits = 0;
          if (codingLine[this.codingPos] < columns) {
            this.codingPos++;
            this.outputBits =
              codingLine[this.codingPos] - codingLine[this.codingPos - 1];
          } else if (bits > 0) {
            c <<= bits;
            bits = 0;
          }
        }
      } while (bits);
    }
    if (this.black) {
      c ^= 0xff;
    }
    return c;
  }

  /**
   * @private
   */
  _addPixels(a1, blackPixels) {
    const codingLine = this.codingLine;
    let codingPos = this.codingPos;

    if (a1 > codingLine[codingPos]) {
      if (a1 > this.columns) {
        this.err = true;
        a1 = this.columns;
      }
      if ((codingPos & 1) ^ blackPixels) {
        ++codingPos;
      }

      codingLine[codingPos] = a1;
    }
    this.codingPos = codingPos;
  }

  /**
   * @private
   */
  _addPixelsNeg(a1, blackPixels) {
    const codingLine = this.codingLine;
    let codingPos = this.codingPos;

    if (a1 > codingLine[codingPos]) {
      if (a1 > this.columns) {
        this.err = true;
        a1 = this.columns;
      }
      if ((codingPos & 1) ^ blackPixels) {
        ++codingPos;
      }

      codingLine[codingPos] = a1;
    } else if (a1 < codingLine[codingPos]) {
      if (a1 < 0) {
        this.err = true;
        a1 = 0;
      }
      while (codingPos > 0 && a1 < codingLine[codingPos - 1]) {
        --codingPos;
      }
      codingLine[codingPos] = a1;
    }

    this.codingPos = codingPos;
  }

  /**
   * This function returns the code found from the table.
   * The start and end parameters set the boundaries for searching the table.
   * The limit parameter is optional. Function returns an array with three
   * values. The first array element indicates whether a valid code is being
   * returned. The second array element is the actual code. The third array
   * element indicates whether EOF was reached.
   * @private
   */
  _findTableCode(start, end, table, limit) {
    const limitValue = limit || 0;
    for (let i = start; i <= end; ++i) {
      let code = this._lookBits(i);
      if (code === ccittEOF) {
        return [true, 1, false];
      }
      if (i < end) {
        code <<= end - i;
      }
      if (!limitValue || code >= limitValue) {
        const p = table[code - limitValue];
        if (p[0] === i) {
          this._eatBits(i);
          return [true, p[1], true];
        }
      }
    }
    return [false, 0, false];
  }

  /**
   * @private
   */
  _getTwoDimCode() {
    let code = 0;
    let p;
    if (this.eoblock) {
      code = this._lookBits(7);
      p = twoDimTable[code];
      if (p && p[0] > 0) {
        this._eatBits(p[0]);
        return p[1];
      }
    } else {
      const result = this._findTableCode(1, 7, twoDimTable);
      if (result[0] && result[2]) {
        return result[1];
      }
    }
    return ccittEOF;
  }

  /**
   * @private
   */
  _getWhiteCode() {
    let code = 0;
    let p;
    if (this.eoblock) {
      code = this._lookBits(12);
      if (code === ccittEOF) {
        return 1;
      }

      if (code >> 5 === 0) {
        p = whiteTable1[code];
      } else {
        p = whiteTable2[code >> 3];
      }

      if (p[0] > 0) {
        this._eatBits(p[0]);
        return p[1];
      }
    } else {
      let result = this._findTableCode(1, 9, whiteTable2);
      if (result[0]) {
        return result[1];
      }

      result = this._findTableCode(11, 12, whiteTable1);
      if (result[0]) {
        return result[1];
      }
    }
    this._eatBits(1);
    return 1;
  }

  /**
   * @private
   */
  _getBlackCode() {
    let code, p;
    if (this.eoblock) {
      code = this._lookBits(13);
      if (code === ccittEOF) {
        return 1;
      }
      if (code >> 7 === 0) {
        p = blackTable1[code];
      } else if (code >> 9 === 0 && code >> 7 !== 0) {
        p = blackTable2[(code >> 1) - 64];
      } else {
        p = blackTable3[code >> 7];
      }

      if (p[0] > 0) {
        this._eatBits(p[0]);
        return p[1];
      }
    } else {
      let result = this._findTableCode(2, 6, blackTable3);
      if (result[0]) {
        return result[1];
      }

      result = this._findTableCode(7, 12, blackTable2, 64);
      if (result[0]) {
        return result[1];
      }

      result = this._findTableCode(10, 13, blackTable1);
      if (result[0]) {
        return result[1];
      }
    }
    this._eatBits(1);
    return 1;
  }

  /**
   * @private
   */
  _lookBits(n) {
    let c;
    while (this.inputBits < n) {
      if ((c = this.source.next()) === -1) {
        if (this.inputBits === 0) {
          return ccittEOF;
        }
        return (this.inputBuf << (n - this.inputBits)) & (0xffff >> (16 - n));
      }
      this.inputBuf = (this.inputBuf << 8) | c;
      this.inputBits += 8;
    }
    return (this.inputBuf >> (this.inputBits - n)) & (0xffff >> (16 - n));
  }

  /**
   * @private
   */
  _eatBits(n) {
    if ((this.inputBits -= n) < 0) {
      this.inputBits = 0;
    }
  }
}

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class Jbig2Error extends BaseException {
  constructor(msg) {
    super(`JBIG2 error: ${msg}`, 'Jbig2Error');
  }
}

// Utility data structures
class ContextCache {
  getContexts(id) {
    if (id in this) {
      return this[id];
    }
    return (this[id] = new Int8Array(1 << 16));
  }
}

class DecodingContext {
  constructor(data, start, end) {
    this.data = data;
    this.start = start;
    this.end = end;
  }

  get decoder() {
    const decoder = new ArithmeticDecoder(this.data, this.start, this.end);
    return shadow(this, 'decoder', decoder);
  }

  get contextCache() {
    const cache = new ContextCache();
    return shadow(this, 'contextCache', cache);
  }
}

// Annex A. Arithmetic Integer Decoding Procedure
// A.2 Procedure for decoding values
function decodeInteger(contextCache, procedure, decoder) {
  const contexts = contextCache.getContexts(procedure);
  let prev = 1;

  function readBits(length) {
    let v = 0;
    for (let i = 0; i < length; i++) {
      const bit = decoder.readBit(contexts, prev);
      prev = prev < 256 ? (prev << 1) | bit : (((prev << 1) | bit) & 511) | 256;
      v = (v << 1) | bit;
    }
    return v >>> 0;
  }

  const sign = readBits(1);
  // prettier-ignore
  /* eslint-disable no-nested-ternary */
  const value = readBits(1) ?
                  (readBits(1) ?
                    (readBits(1) ?
                      (readBits(1) ?
                        (readBits(1) ?
                          (readBits(32) + 4436) :
                        readBits(12) + 340) :
                      readBits(8) + 84) :
                    readBits(6) + 20) :
                  readBits(4) + 4) :
                readBits(2);
  /* eslint-enable no-nested-ternary */
  if (sign === 0) {
    return value;
  } else if (value > 0) {
    return -value;
  }
  return null;
}

// A.3 The IAID decoding procedure
function decodeIAID(contextCache, decoder, codeLength) {
  const contexts = contextCache.getContexts('IAID');

  let prev = 1;
  for (let i = 0; i < codeLength; i++) {
    const bit = decoder.readBit(contexts, prev);
    prev = (prev << 1) | bit;
  }
  if (codeLength < 31) {
    return prev & ((1 << codeLength) - 1);
  }
  return prev & 0x7fffffff;
}

// 7.3 Segment types
const SegmentTypes = [
  'SymbolDictionary',
  null,
  null,
  null,
  'IntermediateTextRegion',
  null,
  'ImmediateTextRegion',
  'ImmediateLosslessTextRegion',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  'PatternDictionary',
  null,
  null,
  null,
  'IntermediateHalftoneRegion',
  null,
  'ImmediateHalftoneRegion',
  'ImmediateLosslessHalftoneRegion',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  'IntermediateGenericRegion',
  null,
  'ImmediateGenericRegion',
  'ImmediateLosslessGenericRegion',
  'IntermediateGenericRefinementRegion',
  null,
  'ImmediateGenericRefinementRegion',
  'ImmediateLosslessGenericRefinementRegion',
  null,
  null,
  null,
  null,
  'PageInformation',
  'EndOfPage',
  'EndOfStripe',
  'EndOfFile',
  'Profiles',
  'Tables',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  'Extension'
];

const CodingTemplates = [
  [
    { x: -1, y: -2 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
    { x: -2, y: -1 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 2, y: -1 },
    { x: -4, y: 0 },
    { x: -3, y: 0 },
    { x: -2, y: 0 },
    { x: -1, y: 0 }
  ],
  [
    { x: -1, y: -2 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
    { x: 2, y: -2 },
    { x: -2, y: -1 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 2, y: -1 },
    { x: -3, y: 0 },
    { x: -2, y: 0 },
    { x: -1, y: 0 }
  ],
  [
    { x: -1, y: -2 },
    { x: 0, y: -2 },
    { x: 1, y: -2 },
    { x: -2, y: -1 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: -2, y: 0 },
    { x: -1, y: 0 }
  ],
  [
    { x: -3, y: -1 },
    { x: -2, y: -1 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: -4, y: 0 },
    { x: -3, y: 0 },
    { x: -2, y: 0 },
    { x: -1, y: 0 }
  ]
];

const RefinementTemplates = [
  {
    coding: [
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 0 }
    ],
    reference: [
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ]
  },
  {
    coding: [
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 0 }
    ],
    reference: [
      { x: 0, y: -1 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ]
  }
];

// See 6.2.5.7 Decoding the bitmap.
const ReusedContexts = [
  0x9b25, // 10011 0110010 0101
  0x0795, // 0011 110010 101
  0x00e5, // 001 11001 01
  0x0195 // 011001 0101
];

const RefinementReusedContexts = [
  0x0020, // '000' + '0' (coding) + '00010000' + '0' (reference)
  0x0008 // '0000' + '001000'
];

function decodeBitmapTemplate0(width, height, decodingContext) {
  const decoder = decodingContext.decoder;
  const contexts = decodingContext.contextCache.getContexts('GB');
  const bitmap = [];
  let contextLabel, i, j, pixel, row, row1, row2;

  // ...ooooo....
  // ..ooooooo... Context template for current pixel (X)
  // .ooooX...... (concatenate values of 'o'-pixels to get contextLabel)
  const OLD_PIXEL_MASK = 0x7bf7; // 01111 0111111 0111

  for (i = 0; i < height; i++) {
    row = bitmap[i] = new Uint8Array(width);
    row1 = i < 1 ? row : bitmap[i - 1];
    row2 = i < 2 ? row : bitmap[i - 2];

    // At the beginning of each row:
    // Fill contextLabel with pixels that are above/right of (X)
    contextLabel =
      (row2[0] << 13) |
      (row2[1] << 12) |
      (row2[2] << 11) |
      (row1[0] << 7) |
      (row1[1] << 6) |
      (row1[2] << 5) |
      (row1[3] << 4);

    for (j = 0; j < width; j++) {
      row[j] = pixel = decoder.readBit(contexts, contextLabel);

      // At each pixel: Clear contextLabel pixels that are shifted
      // out of the context, then add new ones.
      contextLabel =
        ((contextLabel & OLD_PIXEL_MASK) << 1) |
        (j + 3 < width ? row2[j + 3] << 11 : 0) |
        (j + 4 < width ? row1[j + 4] << 4 : 0) |
        pixel;
    }
  }

  return bitmap;
}

// 6.2 Generic Region Decoding Procedure
function decodeBitmap(
  mmr,
  width,
  height,
  templateIndex,
  prediction,
  skip,
  at,
  decodingContext
) {
  if (mmr) {
    const input = new Reader(
      decodingContext.data,
      decodingContext.start,
      decodingContext.end
    );
    return decodeMMRBitmap(input, width, height, false);
  }

  // Use optimized version for the most common case
  if (
    templateIndex === 0 &&
    !skip &&
    !prediction &&
    at.length === 4 &&
    at[0].x === 3 &&
    at[0].y === -1 &&
    at[1].x === -3 &&
    at[1].y === -1 &&
    at[2].x === 2 &&
    at[2].y === -2 &&
    at[3].x === -2 &&
    at[3].y === -2
  ) {
    return decodeBitmapTemplate0(width, height, decodingContext);
  }

  const useskip = !!skip;
  const template = CodingTemplates[templateIndex].concat(at);

  // Sorting is non-standard, and it is not required. But sorting increases
  // the number of template bits that can be reused from the previous
  // contextLabel in the main loop.
  template.sort(function (a, b) {
    return a.y - b.y || a.x - b.x;
  });

  const templateLength = template.length;
  const templateX = new Int8Array(templateLength);
  const templateY = new Int8Array(templateLength);
  const changingTemplateEntries = [];
  let reuseMask = 0,
    minX = 0,
    maxX = 0,
    minY = 0;
  let c, k;

  for (k = 0; k < templateLength; k++) {
    templateX[k] = template[k].x;
    templateY[k] = template[k].y;
    minX = Math.min(minX, template[k].x);
    maxX = Math.max(maxX, template[k].x);
    minY = Math.min(minY, template[k].y);
    // Check if the template pixel appears in two consecutive context labels,
    // so it can be reused. Otherwise, we add it to the list of changing
    // template entries.
    if (
      k < templateLength - 1 &&
      template[k].y === template[k + 1].y &&
      template[k].x === template[k + 1].x - 1
    ) {
      reuseMask |= 1 << (templateLength - 1 - k);
    } else {
      changingTemplateEntries.push(k);
    }
  }
  const changingEntriesLength = changingTemplateEntries.length;

  const changingTemplateX = new Int8Array(changingEntriesLength);
  const changingTemplateY = new Int8Array(changingEntriesLength);
  const changingTemplateBit = new Uint16Array(changingEntriesLength);
  for (c = 0; c < changingEntriesLength; c++) {
    k = changingTemplateEntries[c];
    changingTemplateX[c] = template[k].x;
    changingTemplateY[c] = template[k].y;
    changingTemplateBit[c] = 1 << (templateLength - 1 - k);
  }

  // Get the safe bounding box edges from the width, height, minX, maxX, minY
  const sbb_left = -minX;
  const sbb_top = -minY;
  const sbb_right = width - maxX;

  const pseudoPixelContext = ReusedContexts[templateIndex];
  let row = new Uint8Array(width);
  const bitmap = [];

  const decoder = decodingContext.decoder;
  const contexts = decodingContext.contextCache.getContexts('GB');

  let ltp = 0,
    j,
    i0,
    j0,
    contextLabel = 0,
    bit,
    shift;
  for (let i = 0; i < height; i++) {
    if (prediction) {
      const sltp = decoder.readBit(contexts, pseudoPixelContext);
      ltp ^= sltp;
      if (ltp) {
        bitmap.push(row); // duplicate previous row
        continue;
      }
    }
    row = new Uint8Array(row);
    bitmap.push(row);
    for (j = 0; j < width; j++) {
      if (useskip && skip[i][j]) {
        row[j] = 0;
        continue;
      }
      // Are we in the middle of a scanline, so we can reuse contextLabel
      // bits?
      if (j >= sbb_left && j < sbb_right && i >= sbb_top) {
        // If yes, we can just shift the bits that are reusable and only
        // fetch the remaining ones.
        contextLabel = (contextLabel << 1) & reuseMask;
        for (k = 0; k < changingEntriesLength; k++) {
          i0 = i + changingTemplateY[k];
          j0 = j + changingTemplateX[k];
          bit = bitmap[i0][j0];
          if (bit) {
            bit = changingTemplateBit[k];
            contextLabel |= bit;
          }
        }
      } else {
        // compute the contextLabel from scratch
        contextLabel = 0;
        shift = templateLength - 1;
        for (k = 0; k < templateLength; k++, shift--) {
          j0 = j + templateX[k];
          if (j0 >= 0 && j0 < width) {
            i0 = i + templateY[k];
            if (i0 >= 0) {
              bit = bitmap[i0][j0];
              if (bit) {
                contextLabel |= bit << shift;
              }
            }
          }
        }
      }
      const pixel = decoder.readBit(contexts, contextLabel);
      row[j] = pixel;
    }
  }
  return bitmap;
}

// 6.3.2 Generic Refinement Region Decoding Procedure
function decodeRefinement(
  width,
  height,
  templateIndex,
  referenceBitmap,
  offsetX,
  offsetY,
  prediction,
  at,
  decodingContext
) {
  let codingTemplate = RefinementTemplates[templateIndex].coding;
  if (templateIndex === 0) {
    codingTemplate = codingTemplate.concat([at[0]]);
  }
  const codingTemplateLength = codingTemplate.length;
  const codingTemplateX = new Int32Array(codingTemplateLength);
  const codingTemplateY = new Int32Array(codingTemplateLength);
  let k;
  for (k = 0; k < codingTemplateLength; k++) {
    codingTemplateX[k] = codingTemplate[k].x;
    codingTemplateY[k] = codingTemplate[k].y;
  }

  let referenceTemplate = RefinementTemplates[templateIndex].reference;
  if (templateIndex === 0) {
    referenceTemplate = referenceTemplate.concat([at[1]]);
  }
  const referenceTemplateLength = referenceTemplate.length;
  const referenceTemplateX = new Int32Array(referenceTemplateLength);
  const referenceTemplateY = new Int32Array(referenceTemplateLength);
  for (k = 0; k < referenceTemplateLength; k++) {
    referenceTemplateX[k] = referenceTemplate[k].x;
    referenceTemplateY[k] = referenceTemplate[k].y;
  }
  const referenceWidth = referenceBitmap[0].length;
  const referenceHeight = referenceBitmap.length;

  const pseudoPixelContext = RefinementReusedContexts[templateIndex];
  const bitmap = [];

  const decoder = decodingContext.decoder;
  const contexts = decodingContext.contextCache.getContexts('GR');

  let ltp = 0;
  for (let i = 0; i < height; i++) {
    if (prediction) {
      const sltp = decoder.readBit(contexts, pseudoPixelContext);
      ltp ^= sltp;
      if (ltp) {
        throw new Jbig2Error('prediction is not supported');
      }
    }
    const row = new Uint8Array(width);
    bitmap.push(row);
    for (let j = 0; j < width; j++) {
      let i0, j0;
      let contextLabel = 0;
      for (k = 0; k < codingTemplateLength; k++) {
        i0 = i + codingTemplateY[k];
        j0 = j + codingTemplateX[k];
        if (i0 < 0 || j0 < 0 || j0 >= width) {
          contextLabel <<= 1; // out of bound pixel
        } else {
          contextLabel = (contextLabel << 1) | bitmap[i0][j0];
        }
      }
      for (k = 0; k < referenceTemplateLength; k++) {
        i0 = i + referenceTemplateY[k] - offsetY;
        j0 = j + referenceTemplateX[k] - offsetX;
        if (i0 < 0 || i0 >= referenceHeight || j0 < 0 || j0 >= referenceWidth) {
          contextLabel <<= 1; // out of bound pixel
        } else {
          contextLabel = (contextLabel << 1) | referenceBitmap[i0][j0];
        }
      }
      const pixel = decoder.readBit(contexts, contextLabel);
      row[j] = pixel;
    }
  }

  return bitmap;
}

// 6.5.5 Decoding the symbol dictionary
function decodeSymbolDictionary(
  huffman,
  refinement,
  symbols,
  numberOfNewSymbols,
  numberOfExportedSymbols,
  huffmanTables,
  templateIndex,
  at,
  refinementTemplateIndex,
  refinementAt,
  decodingContext,
  huffmanInput
) {
  if (huffman && refinement) {
    throw new Jbig2Error('symbol refinement with Huffman is not supported');
  }

  const newSymbols = [];
  let currentHeight = 0;
  let symbolCodeLength = log2(symbols.length + numberOfNewSymbols);

  const decoder = decodingContext.decoder;
  const contextCache = decodingContext.contextCache;
  let tableB1, symbolWidths;
  if (huffman) {
    tableB1 = getStandardTable(1); // standard table B.1
    symbolWidths = [];
    symbolCodeLength = Math.max(symbolCodeLength, 1); // 6.5.8.2.3
  }

  while (newSymbols.length < numberOfNewSymbols) {
    const deltaHeight = huffman
      ? huffmanTables.tableDeltaHeight.decode(huffmanInput)
      : decodeInteger(contextCache, 'IADH', decoder); // 6.5.6
    currentHeight += deltaHeight;
    let currentWidth = 0,
      totalWidth = 0;
    // @ts-ignore
    const firstSymbol = huffman ? symbolWidths.length : 0;
    while (true) {
      const deltaWidth = huffman
        ? huffmanTables.tableDeltaWidth.decode(huffmanInput)
        : decodeInteger(contextCache, 'IADW', decoder); // 6.5.7
      if (deltaWidth === null) {
        break; // OOB
      }
      currentWidth += deltaWidth;
      totalWidth += currentWidth;
      let bitmap;
      if (refinement) {
        // 6.5.8.2 Refinement/aggregate-coded symbol bitmap
        const numberOfInstances = decodeInteger(contextCache, 'IAAI', decoder);
        // @ts-ignore
        if (numberOfInstances > 1) {
          bitmap = decodeTextRegion(
            huffman,
            refinement,
            currentWidth,
            currentHeight,
            0,
            numberOfInstances,
            1, // strip size
            symbols.concat(newSymbols),
            symbolCodeLength,
            0, // transposed
            0, // ds offset
            1, // top left 7.4.3.1.1
            0, // OR operator
            huffmanTables,
            refinementTemplateIndex,
            refinementAt,
            decodingContext,
            0,
            huffmanInput
          );
        } else {
          const symbolId = decodeIAID(contextCache, decoder, symbolCodeLength);
          const rdx = decodeInteger(contextCache, 'IARDX', decoder); // 6.4.11.3
          const rdy = decodeInteger(contextCache, 'IARDY', decoder); // 6.4.11.4
          const symbol =
            symbolId < symbols.length
              ? symbols[symbolId]
              : newSymbols[symbolId - symbols.length];
          bitmap = decodeRefinement(
            currentWidth,
            currentHeight,
            refinementTemplateIndex,
            symbol,
            rdx,
            rdy,
            false,
            refinementAt,
            decodingContext
          );
        }
        newSymbols.push(bitmap);
      } else if (huffman) {
        // Store only symbol width and decode a collective bitmap when the
        // height class is done.
        // @ts-ignore
        symbolWidths.push(currentWidth);
      } else {
        // 6.5.8.1 Direct-coded symbol bitmap
        bitmap = decodeBitmap(
          false,
          currentWidth,
          currentHeight,
          templateIndex,
          false,
          null,
          at,
          decodingContext
        );
        newSymbols.push(bitmap);
      }
    }
    if (huffman && !refinement) {
      // 6.5.9 Height class collective bitmap
      const bitmapSize = huffmanTables.tableBitmapSize.decode(huffmanInput);
      huffmanInput.byteAlign();
      let collectiveBitmap;
      if (bitmapSize === 0) {
        // Uncompressed collective bitmap
        collectiveBitmap = readUncompressedBitmap(
          huffmanInput,
          totalWidth,
          currentHeight
        );
      } else {
        // MMR collective bitmap
        const originalEnd = huffmanInput.end;
        const bitmapEnd = huffmanInput.position + bitmapSize;
        huffmanInput.end = bitmapEnd;
        collectiveBitmap = decodeMMRBitmap(
          huffmanInput,
          totalWidth,
          currentHeight,
          false
        );
        huffmanInput.end = originalEnd;
        huffmanInput.position = bitmapEnd;
      }
      // @ts-ignore
      const numberOfSymbolsDecoded = symbolWidths.length;
      if (firstSymbol === numberOfSymbolsDecoded - 1) {
        // collectiveBitmap is a single symbol.
        newSymbols.push(collectiveBitmap);
      } else {
        // Divide collectiveBitmap into symbols.
        let i,
          y,
          xMin = 0,
          xMax,
          bitmapWidth,
          symbolBitmap;
        for (i = firstSymbol; i < numberOfSymbolsDecoded; i++) {
          // @ts-ignore
          bitmapWidth = symbolWidths[i];
          xMax = xMin + bitmapWidth;
          symbolBitmap = [];
          for (y = 0; y < currentHeight; y++) {
            symbolBitmap.push(collectiveBitmap[y].subarray(xMin, xMax));
          }
          newSymbols.push(symbolBitmap);
          xMin = xMax;
        }
      }
    }
  }

  // 6.5.10 Exported symbols
  const exportedSymbols = [],
    flags = [];
  let currentFlag = false,
    i,
    ii;
  const totalSymbolsLength = symbols.length + numberOfNewSymbols;
  while (flags.length < totalSymbolsLength) {
    let runLength = huffman
      ? tableB1.decode(huffmanInput)
      : decodeInteger(contextCache, 'IAEX', decoder);
    while (runLength--) {
      flags.push(currentFlag);
    }
    currentFlag = !currentFlag;
  }
  for (i = 0, ii = symbols.length; i < ii; i++) {
    if (flags[i]) {
      exportedSymbols.push(symbols[i]);
    }
  }
  for (let j = 0; j < numberOfNewSymbols; i++, j++) {
    if (flags[i]) {
      exportedSymbols.push(newSymbols[j]);
    }
  }
  return exportedSymbols;
}

function decodeTextRegion(
  huffman,
  refinement,
  width,
  height,
  defaultPixelValue,
  numberOfSymbolInstances,
  stripSize,
  inputSymbols,
  symbolCodeLength,
  transposed,
  dsOffset,
  referenceCorner,
  combinationOperator,
  huffmanTables,
  refinementTemplateIndex,
  refinementAt,
  decodingContext,
  logStripSize,
  huffmanInput
) {
  if (huffman && refinement) {
    throw new Jbig2Error('refinement with Huffman is not supported');
  }

  // Prepare bitmap
  const bitmap = [];
  let i, row;
  for (i = 0; i < height; i++) {
    row = new Uint8Array(width);
    if (defaultPixelValue) {
      for (let j = 0; j < width; j++) {
        row[j] = defaultPixelValue;
      }
    }
    bitmap.push(row);
  }

  const decoder = decodingContext.decoder;
  const contextCache = decodingContext.contextCache;

  let stripT = huffman
    ? -huffmanTables.tableDeltaT.decode(huffmanInput)
    : // @ts-ignore
      -decodeInteger(contextCache, 'IADT', decoder); // 6.4.6
  let firstS = 0;
  i = 0;
  while (i < numberOfSymbolInstances) {
    const deltaT = huffman
      ? huffmanTables.tableDeltaT.decode(huffmanInput)
      : decodeInteger(contextCache, 'IADT', decoder); // 6.4.6
    stripT += deltaT;

    const deltaFirstS = huffman
      ? huffmanTables.tableFirstS.decode(huffmanInput)
      : decodeInteger(contextCache, 'IAFS', decoder); // 6.4.7
    firstS += deltaFirstS;
    let currentS = firstS;
    do {
      let currentT = 0; // 6.4.9
      if (stripSize > 1) {
        currentT = huffman
          ? huffmanInput.readBits(logStripSize)
          : decodeInteger(contextCache, 'IAIT', decoder);
      }
      const t = stripSize * stripT + currentT;
      const symbolId = huffman
        ? huffmanTables.symbolIDTable.decode(huffmanInput)
        : decodeIAID(contextCache, decoder, symbolCodeLength);
      const applyRefinement =
        refinement &&
        (huffman
          ? huffmanInput.readBit()
          : decodeInteger(contextCache, 'IARI', decoder));
      let symbolBitmap = inputSymbols[symbolId];
      let symbolWidth = symbolBitmap[0].length;
      let symbolHeight = symbolBitmap.length;
      if (applyRefinement) {
        const rdw = decodeInteger(contextCache, 'IARDW', decoder); // 6.4.11.1
        const rdh = decodeInteger(contextCache, 'IARDH', decoder); // 6.4.11.2
        const rdx = decodeInteger(contextCache, 'IARDX', decoder); // 6.4.11.3
        const rdy = decodeInteger(contextCache, 'IARDY', decoder); // 6.4.11.4
        symbolWidth += rdw;
        symbolHeight += rdh;
        symbolBitmap = decodeRefinement(
          symbolWidth,
          symbolHeight,
          refinementTemplateIndex,
          symbolBitmap,
          // @ts-ignore
          (rdw >> 1) + rdx,
          // @ts-ignore
          (rdh >> 1) + rdy,
          false,
          refinementAt,
          decodingContext
        );
      }
      const offsetT = t - (referenceCorner & 1 ? 0 : symbolHeight - 1);
      const offsetS = currentS - (referenceCorner & 2 ? symbolWidth - 1 : 0);
      let s2, t2, symbolRow;
      if (transposed) {
        // Place Symbol Bitmap from T1,S1
        for (s2 = 0; s2 < symbolHeight; s2++) {
          row = bitmap[offsetS + s2];
          if (!row) {
            continue;
          }
          symbolRow = symbolBitmap[s2];
          // To ignore Parts of Symbol bitmap which goes
          // outside bitmap region
          const maxWidth = Math.min(width - offsetT, symbolWidth);
          switch (combinationOperator) {
            case 0: // OR
              for (t2 = 0; t2 < maxWidth; t2++) {
                row[offsetT + t2] |= symbolRow[t2];
              }
              break;
            case 2: // XOR
              for (t2 = 0; t2 < maxWidth; t2++) {
                row[offsetT + t2] ^= symbolRow[t2];
              }
              break;
            default:
              throw new Jbig2Error(
                `operator ${combinationOperator} is not supported`
              );
          }
        }
        currentS += symbolHeight - 1;
      } else {
        for (t2 = 0; t2 < symbolHeight; t2++) {
          row = bitmap[offsetT + t2];
          if (!row) {
            continue;
          }
          symbolRow = symbolBitmap[t2];
          switch (combinationOperator) {
            case 0: // OR
              for (s2 = 0; s2 < symbolWidth; s2++) {
                row[offsetS + s2] |= symbolRow[s2];
              }
              break;
            case 2: // XOR
              for (s2 = 0; s2 < symbolWidth; s2++) {
                row[offsetS + s2] ^= symbolRow[s2];
              }
              break;
            default:
              throw new Jbig2Error(
                `operator ${combinationOperator} is not supported`
              );
          }
        }
        currentS += symbolWidth - 1;
      }
      i++;
      const deltaS = huffman
        ? huffmanTables.tableDeltaS.decode(huffmanInput)
        : decodeInteger(contextCache, 'IADS', decoder); // 6.4.8
      if (deltaS === null) {
        break; // OOB
      }
      currentS += deltaS + dsOffset;
    } while (true);
  }
  return bitmap;
}

function decodePatternDictionary(
  mmr,
  patternWidth,
  patternHeight,
  maxPatternIndex,
  template,
  decodingContext
) {
  const at = [];
  if (!mmr) {
    at.push({
      x: -patternWidth,
      y: 0
    });
    if (template === 0) {
      at.push(
        {
          x: -3,
          y: -1
        },
        {
          x: 2,
          y: -2
        },
        {
          x: -2,
          y: -2
        }
      );
    }
  }
  const collectiveWidth = (maxPatternIndex + 1) * patternWidth;
  const collectiveBitmap = decodeBitmap(
    mmr,
    collectiveWidth,
    patternHeight,
    template,
    false,
    null,
    at,
    decodingContext
  );
  // Divide collective bitmap into patterns.
  const patterns = [];
  for (let i = 0; i <= maxPatternIndex; i++) {
    const patternBitmap = [];
    const xMin = patternWidth * i;
    const xMax = xMin + patternWidth;
    for (let y = 0; y < patternHeight; y++) {
      patternBitmap.push(collectiveBitmap[y].subarray(xMin, xMax));
    }
    patterns.push(patternBitmap);
  }
  return patterns;
}

function decodeHalftoneRegion(
  mmr,
  patterns,
  template,
  regionWidth,
  regionHeight,
  defaultPixelValue,
  enableSkip,
  combinationOperator,
  gridWidth,
  gridHeight,
  gridOffsetX,
  gridOffsetY,
  gridVectorX,
  gridVectorY,
  decodingContext
) {
  const skip = null;
  if (enableSkip) {
    throw new Jbig2Error('skip is not supported');
  }
  if (combinationOperator !== 0) {
    throw new Jbig2Error(
      `operator "${combinationOperator}" is not supported in halftone region`
    );
  }

  // Prepare bitmap.
  const regionBitmap = [];
  let i, j, row;
  for (i = 0; i < regionHeight; i++) {
    row = new Uint8Array(regionWidth);
    if (defaultPixelValue) {
      for (j = 0; j < regionWidth; j++) {
        row[j] = defaultPixelValue;
      }
    }
    regionBitmap.push(row);
  }

  const numberOfPatterns = patterns.length;
  const pattern0 = patterns[0];
  const patternWidth = pattern0[0].length,
    patternHeight = pattern0.length;
  const bitsPerValue = log2(numberOfPatterns);
  const at = [];
  if (!mmr) {
    at.push({
      x: template <= 1 ? 3 : 2,
      y: -1
    });
    if (template === 0) {
      at.push(
        {
          x: -3,
          y: -1
        },
        {
          x: 2,
          y: -2
        },
        {
          x: -2,
          y: -2
        }
      );
    }
  }
  // Annex C. Gray-scale Image Decoding Procedure.
  const grayScaleBitPlanes = [];
  let mmrInput, bitmap;
  if (mmr) {
    // MMR bit planes are in one continuous stream. Only EOFB codes indicate
    // the end of each bitmap, so EOFBs must be decoded.
    mmrInput = new Reader(
      decodingContext.data,
      decodingContext.start,
      decodingContext.end
    );
  }
  for (i = bitsPerValue - 1; i >= 0; i--) {
    if (mmr) {
      bitmap = decodeMMRBitmap(mmrInput, gridWidth, gridHeight, true);
    } else {
      bitmap = decodeBitmap(
        false,
        gridWidth,
        gridHeight,
        template,
        false,
        skip,
        at,
        decodingContext
      );
    }
    grayScaleBitPlanes[i] = bitmap;
  }
  // 6.6.5.2 Rendering the patterns.
  let mg, ng, bit, patternIndex, patternBitmap, x, y, patternRow, regionRow;
  for (mg = 0; mg < gridHeight; mg++) {
    for (ng = 0; ng < gridWidth; ng++) {
      bit = 0;
      patternIndex = 0;
      for (j = bitsPerValue - 1; j >= 0; j--) {
        bit ^= grayScaleBitPlanes[j][mg][ng]; // Gray decoding
        patternIndex |= bit << j;
      }
      patternBitmap = patterns[patternIndex];
      x = (gridOffsetX + mg * gridVectorY + ng * gridVectorX) >> 8;
      y = (gridOffsetY + mg * gridVectorX - ng * gridVectorY) >> 8;
      // Draw patternBitmap at (x, y).
      if (
        x >= 0 &&
        x + patternWidth <= regionWidth &&
        y >= 0 &&
        y + patternHeight <= regionHeight
      ) {
        for (i = 0; i < patternHeight; i++) {
          regionRow = regionBitmap[y + i];
          patternRow = patternBitmap[i];
          for (j = 0; j < patternWidth; j++) {
            regionRow[x + j] |= patternRow[j];
          }
        }
      } else {
        let regionX, regionY;
        for (i = 0; i < patternHeight; i++) {
          regionY = y + i;
          if (regionY < 0 || regionY >= regionHeight) {
            continue;
          }
          regionRow = regionBitmap[regionY];
          patternRow = patternBitmap[i];
          for (j = 0; j < patternWidth; j++) {
            regionX = x + j;
            if (regionX >= 0 && regionX < regionWidth) {
              regionRow[regionX] |= patternRow[j];
            }
          }
        }
      }
    }
  }
  return regionBitmap;
}

function readSegmentHeader(data, start) {
  const segmentHeader = {};
  segmentHeader.number = readUint32(data, start);
  const flags = data[start + 4];
  const segmentType = flags & 0x3f;
  if (!SegmentTypes[segmentType]) {
    throw new Jbig2Error('invalid segment type: ' + segmentType);
  }
  segmentHeader.type = segmentType;
  segmentHeader.typeName = SegmentTypes[segmentType];
  segmentHeader.deferredNonRetain = !!(flags & 0x80);

  const pageAssociationFieldSize = !!(flags & 0x40);
  const referredFlags = data[start + 5];
  let referredToCount = (referredFlags >> 5) & 7;
  const retainBits = [referredFlags & 31];
  let position = start + 6;
  if (referredFlags === 7) {
    referredToCount = readUint32(data, position - 1) & 0x1fffffff;
    position += 3;
    let bytes = (referredToCount + 7) >> 3;
    retainBits[0] = data[position++];
    while (--bytes > 0) {
      retainBits.push(data[position++]);
    }
  } else if (referredFlags === 5 || referredFlags === 6) {
    throw new Jbig2Error('invalid referred-to flags');
  }

  segmentHeader.retainBits = retainBits;

  let referredToSegmentNumberSize = 4;
  if (segmentHeader.number <= 256) {
    referredToSegmentNumberSize = 1;
  } else if (segmentHeader.number <= 65536) {
    referredToSegmentNumberSize = 2;
  }
  const referredTo = [];
  let i, ii;
  for (i = 0; i < referredToCount; i++) {
    let number;
    if (referredToSegmentNumberSize === 1) {
      number = data[position];
    } else if (referredToSegmentNumberSize === 2) {
      number = readUint16(data, position);
    } else {
      number = readUint32(data, position);
    }
    referredTo.push(number);
    position += referredToSegmentNumberSize;
  }
  segmentHeader.referredTo = referredTo;
  if (!pageAssociationFieldSize) {
    segmentHeader.pageAssociation = data[position++];
  } else {
    segmentHeader.pageAssociation = readUint32(data, position);
    position += 4;
  }
  segmentHeader.length = readUint32(data, position);
  position += 4;

  if (segmentHeader.length === 0xffffffff) {
    // 7.2.7 Segment data length, unknown segment length
    if (segmentType === 38) {
      // ImmediateGenericRegion
      const genericRegionInfo = readRegionSegmentInformation(data, position);
      const genericRegionSegmentFlags =
        data[position + RegionSegmentInformationFieldLength];
      const genericRegionMmr = !!(genericRegionSegmentFlags & 1);
      // searching for the segment end
      const searchPatternLength = 6;
      const searchPattern = new Uint8Array(searchPatternLength);
      if (!genericRegionMmr) {
        searchPattern[0] = 0xff;
        searchPattern[1] = 0xac;
      }
      searchPattern[2] = (genericRegionInfo.height >>> 24) & 0xff;
      searchPattern[3] = (genericRegionInfo.height >> 16) & 0xff;
      searchPattern[4] = (genericRegionInfo.height >> 8) & 0xff;
      searchPattern[5] = genericRegionInfo.height & 0xff;
      for (i = position, ii = data.length; i < ii; i++) {
        let j = 0;
        while (j < searchPatternLength && searchPattern[j] === data[i + j]) {
          j++;
        }
        if (j === searchPatternLength) {
          segmentHeader.length = i + searchPatternLength;
          break;
        }
      }
      if (segmentHeader.length === 0xffffffff) {
        throw new Jbig2Error('segment end was not found');
      }
    } else {
      throw new Jbig2Error('invalid unknown segment length');
    }
  }
  segmentHeader.headerEnd = position;
  return segmentHeader;
}

function readSegments(header, data, start, end) {
  const segments = [];
  let position = start;
  while (position < end) {
    const segmentHeader = readSegmentHeader(data, position);
    position = segmentHeader.headerEnd;
    const segment = {
      header: segmentHeader,
      data
    };
    if (!header.randomAccess) {
      segment.start = position;
      position += segmentHeader.length;
      segment.end = position;
    }
    segments.push(segment);
    if (segmentHeader.type === 51) {
      break; // end of file is found
    }
  }
  if (header.randomAccess) {
    for (let i = 0, ii = segments.length; i < ii; i++) {
      segments[i].start = position;
      position += segments[i].header.length;
      segments[i].end = position;
    }
  }
  return segments;
}

// 7.4.1 Region segment information field
function readRegionSegmentInformation(data, start) {
  return {
    width: readUint32(data, start),
    height: readUint32(data, start + 4),
    x: readUint32(data, start + 8),
    y: readUint32(data, start + 12),
    combinationOperator: data[start + 16] & 7
  };
}
const RegionSegmentInformationFieldLength = 17;

function processSegment(segment, visitor) {
  const header = segment.header;

  const data = segment.data,
    end = segment.end;
  let position = segment.start;
  let args, at, i, atLength;
  switch (header.type) {
    case 0: // SymbolDictionary
      // 7.4.2 Symbol dictionary segment syntax
      const dictionary = {};
      const dictionaryFlags = readUint16(data, position); // 7.4.2.1.1
      dictionary.huffman = !!(dictionaryFlags & 1);
      dictionary.refinement = !!(dictionaryFlags & 2);
      dictionary.huffmanDHSelector = (dictionaryFlags >> 2) & 3;
      dictionary.huffmanDWSelector = (dictionaryFlags >> 4) & 3;
      dictionary.bitmapSizeSelector = (dictionaryFlags >> 6) & 1;
      dictionary.aggregationInstancesSelector = (dictionaryFlags >> 7) & 1;
      dictionary.bitmapCodingContextUsed = !!(dictionaryFlags & 256);
      dictionary.bitmapCodingContextRetained = !!(dictionaryFlags & 512);
      dictionary.template = (dictionaryFlags >> 10) & 3;
      dictionary.refinementTemplate = (dictionaryFlags >> 12) & 1;
      position += 2;
      if (!dictionary.huffman) {
        atLength = dictionary.template === 0 ? 4 : 1;
        at = [];
        for (i = 0; i < atLength; i++) {
          at.push({
            x: readInt8(data, position),
            y: readInt8(data, position + 1)
          });
          position += 2;
        }
        dictionary.at = at;
      }
      if (dictionary.refinement && !dictionary.refinementTemplate) {
        at = [];
        for (i = 0; i < 2; i++) {
          at.push({
            x: readInt8(data, position),
            y: readInt8(data, position + 1)
          });
          position += 2;
        }
        dictionary.refinementAt = at;
      }
      dictionary.numberOfExportedSymbols = readUint32(data, position);
      position += 4;
      dictionary.numberOfNewSymbols = readUint32(data, position);
      position += 4;
      args = [
        dictionary,
        header.number,
        header.referredTo,
        data,
        position,
        end
      ];
      break;
    case 6: // ImmediateTextRegion
    case 7: // ImmediateLosslessTextRegion
      const textRegion = {};
      textRegion.info = readRegionSegmentInformation(data, position);
      position += RegionSegmentInformationFieldLength;
      const textRegionSegmentFlags = readUint16(data, position);
      position += 2;
      textRegion.huffman = !!(textRegionSegmentFlags & 1);
      textRegion.refinement = !!(textRegionSegmentFlags & 2);
      textRegion.logStripSize = (textRegionSegmentFlags >> 2) & 3;
      textRegion.stripSize = 1 << textRegion.logStripSize;
      textRegion.referenceCorner = (textRegionSegmentFlags >> 4) & 3;
      textRegion.transposed = !!(textRegionSegmentFlags & 64);
      textRegion.combinationOperator = (textRegionSegmentFlags >> 7) & 3;
      textRegion.defaultPixelValue = (textRegionSegmentFlags >> 9) & 1;
      textRegion.dsOffset = (textRegionSegmentFlags << 17) >> 27;
      textRegion.refinementTemplate = (textRegionSegmentFlags >> 15) & 1;
      if (textRegion.huffman) {
        const textRegionHuffmanFlags = readUint16(data, position);
        position += 2;
        textRegion.huffmanFS = textRegionHuffmanFlags & 3;
        textRegion.huffmanDS = (textRegionHuffmanFlags >> 2) & 3;
        textRegion.huffmanDT = (textRegionHuffmanFlags >> 4) & 3;
        textRegion.huffmanRefinementDW = (textRegionHuffmanFlags >> 6) & 3;
        textRegion.huffmanRefinementDH = (textRegionHuffmanFlags >> 8) & 3;
        textRegion.huffmanRefinementDX = (textRegionHuffmanFlags >> 10) & 3;
        textRegion.huffmanRefinementDY = (textRegionHuffmanFlags >> 12) & 3;
        textRegion.huffmanRefinementSizeSelector = !!(
          textRegionHuffmanFlags & 0x4000
        );
      }
      if (textRegion.refinement && !textRegion.refinementTemplate) {
        at = [];
        for (i = 0; i < 2; i++) {
          at.push({
            x: readInt8(data, position),
            y: readInt8(data, position + 1)
          });
          position += 2;
        }
        textRegion.refinementAt = at;
      }
      textRegion.numberOfSymbolInstances = readUint32(data, position);
      position += 4;
      args = [textRegion, header.referredTo, data, position, end];
      break;
    case 16: // PatternDictionary
      // 7.4.4. Pattern dictionary segment syntax
      const patternDictionary = {};
      const patternDictionaryFlags = data[position++];
      patternDictionary.mmr = !!(patternDictionaryFlags & 1);
      patternDictionary.template = (patternDictionaryFlags >> 1) & 3;
      patternDictionary.patternWidth = data[position++];
      patternDictionary.patternHeight = data[position++];
      patternDictionary.maxPatternIndex = readUint32(data, position);
      position += 4;
      args = [patternDictionary, header.number, data, position, end];
      break;
    case 22: // ImmediateHalftoneRegion
    case 23: // ImmediateLosslessHalftoneRegion
      // 7.4.5 Halftone region segment syntax
      const halftoneRegion = {};
      halftoneRegion.info = readRegionSegmentInformation(data, position);
      position += RegionSegmentInformationFieldLength;
      const halftoneRegionFlags = data[position++];
      halftoneRegion.mmr = !!(halftoneRegionFlags & 1);
      halftoneRegion.template = (halftoneRegionFlags >> 1) & 3;
      halftoneRegion.enableSkip = !!(halftoneRegionFlags & 8);
      halftoneRegion.combinationOperator = (halftoneRegionFlags >> 4) & 7;
      halftoneRegion.defaultPixelValue = (halftoneRegionFlags >> 7) & 1;
      halftoneRegion.gridWidth = readUint32(data, position);
      position += 4;
      halftoneRegion.gridHeight = readUint32(data, position);
      position += 4;
      halftoneRegion.gridOffsetX = readUint32(data, position) & 0xffffffff;
      position += 4;
      halftoneRegion.gridOffsetY = readUint32(data, position) & 0xffffffff;
      position += 4;
      halftoneRegion.gridVectorX = readUint16(data, position);
      position += 2;
      halftoneRegion.gridVectorY = readUint16(data, position);
      position += 2;
      args = [halftoneRegion, header.referredTo, data, position, end];
      break;
    case 38: // ImmediateGenericRegion
    case 39: // ImmediateLosslessGenericRegion
      const genericRegion = {};
      genericRegion.info = readRegionSegmentInformation(data, position);
      position += RegionSegmentInformationFieldLength;
      const genericRegionSegmentFlags = data[position++];
      genericRegion.mmr = !!(genericRegionSegmentFlags & 1);
      genericRegion.template = (genericRegionSegmentFlags >> 1) & 3;
      genericRegion.prediction = !!(genericRegionSegmentFlags & 8);
      if (!genericRegion.mmr) {
        atLength = genericRegion.template === 0 ? 4 : 1;
        at = [];
        for (i = 0; i < atLength; i++) {
          at.push({
            x: readInt8(data, position),
            y: readInt8(data, position + 1)
          });
          position += 2;
        }
        genericRegion.at = at;
      }
      args = [genericRegion, data, position, end];
      break;
    case 48: // PageInformation
      const pageInfo = {
        width: readUint32(data, position),
        height: readUint32(data, position + 4),
        resolutionX: readUint32(data, position + 8),
        resolutionY: readUint32(data, position + 12)
      };
      if (pageInfo.height === 0xffffffff) {
        // @ts-ignore
        delete pageInfo.height;
      }
      const pageSegmentFlags = data[position + 16];
      readUint16(data, position + 17); // pageStripingInformation
      pageInfo.lossless = !!(pageSegmentFlags & 1);
      pageInfo.refinement = !!(pageSegmentFlags & 2);
      pageInfo.defaultPixelValue = (pageSegmentFlags >> 2) & 1;
      pageInfo.combinationOperator = (pageSegmentFlags >> 3) & 3;
      pageInfo.requiresBuffer = !!(pageSegmentFlags & 32);
      pageInfo.combinationOperatorOverride = !!(pageSegmentFlags & 64);
      args = [pageInfo];
      break;
    case 49: // EndOfPage
      break;
    case 50: // EndOfStripe
      break;
    case 51: // EndOfFile
      break;
    case 53: // Tables
      args = [header.number, data, position, end];
      break;
    case 62: // 7.4.15 defines 2 extension types which
      // are comments and can be ignored.
      break;
    default:
      throw new Jbig2Error(
        `segment type ${header.typeName}(${header.type}) is not implemented`
      );
  }
  const callbackName = 'on' + header.typeName;
  if (callbackName in visitor) {
    // eslint-disable-next-line prefer-spread
    visitor[callbackName].apply(visitor, args);
  }
}

function processSegments(segments, visitor) {
  for (let i = 0, ii = segments.length; i < ii; i++) {
    processSegment(segments[i], visitor);
  }
}

function parseJbig2Chunks(chunks) {
  const visitor = new SimpleSegmentVisitor();
  for (let i = 0, ii = chunks.length; i < ii; i++) {
    const chunk = chunks[i];
    const segments = readSegments({}, chunk.data, chunk.start, chunk.end);
    processSegments(segments, visitor);
  }
  return visitor.buffer;
}

function parseJbig2(data) {
  const end = data.length;
  let position = 0;

  if (
    data[position] !== 0x97 ||
    data[position + 1] !== 0x4a ||
    data[position + 2] !== 0x42 ||
    data[position + 3] !== 0x32 ||
    data[position + 4] !== 0x0d ||
    data[position + 5] !== 0x0a ||
    data[position + 6] !== 0x1a ||
    data[position + 7] !== 0x0a
  ) {
    throw new Jbig2Error('parseJbig2 - invalid header.');
  }

  const header = Object.create(null);
  position += 8;
  const flags = data[position++];
  header.randomAccess = !(flags & 1);
  if (!(flags & 2)) {
    header.numberOfPages = readUint32(data, position);
    position += 4;
  }

  const segments = readSegments(header, data, position, end);
  const visitor = new SimpleSegmentVisitor();
  processSegments(segments, visitor);

  const { width, height } = visitor.currentPageInfo;
  const bitPacked = visitor.buffer;
  const imgData = new Uint8ClampedArray(width * height);
  let q = 0,
    k = 0;
  for (let i = 0; i < height; i++) {
    let mask = 0,
      buffer;
    for (let j = 0; j < width; j++) {
      if (!mask) {
        mask = 128;
        // @ts-ignore
        buffer = bitPacked[k++];
      }
      // @ts-ignore
      imgData[q++] = buffer & mask ? 0 : 255;
      mask >>= 1;
    }
  }

  return { imgData, width, height };
}

class SimpleSegmentVisitor {
  onPageInformation(info) {
    this.currentPageInfo = info;
    const rowSize = (info.width + 7) >> 3;
    const buffer = new Uint8ClampedArray(rowSize * info.height);
    // The contents of ArrayBuffers are initialized to 0.
    // Fill the buffer with 0xFF only if info.defaultPixelValue is set
    if (info.defaultPixelValue) {
      buffer.fill(0xff);
    }
    this.buffer = buffer;
  }

  drawBitmap(regionInfo, bitmap) {
    const pageInfo = this.currentPageInfo;
    const width = regionInfo.width,
      height = regionInfo.height;
    const rowSize = (pageInfo.width + 7) >> 3;
    const combinationOperator = pageInfo.combinationOperatorOverride
      ? regionInfo.combinationOperator
      : pageInfo.combinationOperator;
    const buffer = this.buffer;
    const mask0 = 128 >> (regionInfo.x & 7);
    let offset0 = regionInfo.y * rowSize + (regionInfo.x >> 3);
    let i, j, mask, offset;
    switch (combinationOperator) {
      case 0: // OR
        for (i = 0; i < height; i++) {
          mask = mask0;
          offset = offset0;
          for (j = 0; j < width; j++) {
            if (bitmap[i][j]) {
              // @ts-ignore
              buffer[offset] |= mask;
            }
            mask >>= 1;
            if (!mask) {
              mask = 128;
              offset++;
            }
          }
          offset0 += rowSize;
        }
        break;
      case 2: // XOR
        for (i = 0; i < height; i++) {
          mask = mask0;
          offset = offset0;
          for (j = 0; j < width; j++) {
            if (bitmap[i][j]) {
              // @ts-ignore
              buffer[offset] ^= mask;
            }
            mask >>= 1;
            if (!mask) {
              mask = 128;
              offset++;
            }
          }
          offset0 += rowSize;
        }
        break;
      default:
        throw new Jbig2Error(
          `operator ${combinationOperator} is not supported`
        );
    }
  }

  onImmediateGenericRegion(region, data, start, end) {
    const regionInfo = region.info;
    const decodingContext = new DecodingContext(data, start, end);
    const bitmap = decodeBitmap(
      region.mmr,
      regionInfo.width,
      regionInfo.height,
      region.template,
      region.prediction,
      null,
      region.at,
      decodingContext
    );
    this.drawBitmap(regionInfo, bitmap);
  }

  onImmediateLosslessGenericRegion() {
    this.onImmediateGenericRegion(...arguments);
  }

  onSymbolDictionary(
    dictionary,
    currentSegment,
    referredSegments,
    data,
    start,
    end
  ) {
    let huffmanTables, huffmanInput;
    if (dictionary.huffman) {
      huffmanTables = getSymbolDictionaryHuffmanTables(
        dictionary,
        referredSegments,
        this.customTables
      );
      huffmanInput = new Reader(data, start, end);
    }

    // Combines exported symbols from all referred segments
    let symbols = this.symbols;
    if (!symbols) {
      this.symbols = symbols = {};
    }

    const inputSymbols = [];
    for (const referredSegment of referredSegments) {
      const referredSymbols = symbols[referredSegment];
      // referredSymbols is undefined when we have a reference to a Tables
      // segment instead of a SymbolDictionary.
      if (referredSymbols) {
        inputSymbols.push(...referredSymbols);
      }
    }

    const decodingContext = new DecodingContext(data, start, end);
    symbols[currentSegment] = decodeSymbolDictionary(
      dictionary.huffman,
      dictionary.refinement,
      inputSymbols,
      dictionary.numberOfNewSymbols,
      dictionary.numberOfExportedSymbols,
      huffmanTables,
      dictionary.template,
      dictionary.at,
      dictionary.refinementTemplate,
      dictionary.refinementAt,
      decodingContext,
      huffmanInput
    );
  }

  onImmediateTextRegion(region, referredSegments, data, start, end) {
    const regionInfo = region.info;
    let huffmanTables, huffmanInput;

    // Combines exported symbols from all referred segments
    const symbols = this.symbols;
    const inputSymbols = [];
    for (const referredSegment of referredSegments) {
      const referredSymbols = symbols[referredSegment];
      // referredSymbols is undefined when we have a reference to a Tables
      // segment instead of a SymbolDictionary.
      if (referredSymbols) {
        inputSymbols.push(...referredSymbols);
      }
    }
    const symbolCodeLength = log2(inputSymbols.length);
    if (region.huffman) {
      huffmanInput = new Reader(data, start, end);
      huffmanTables = getTextRegionHuffmanTables(
        region,
        referredSegments,
        this.customTables,
        inputSymbols.length,
        huffmanInput
      );
    }

    const decodingContext = new DecodingContext(data, start, end);
    const bitmap = decodeTextRegion(
      region.huffman,
      region.refinement,
      regionInfo.width,
      regionInfo.height,
      region.defaultPixelValue,
      region.numberOfSymbolInstances,
      region.stripSize,
      inputSymbols,
      symbolCodeLength,
      region.transposed,
      region.dsOffset,
      region.referenceCorner,
      region.combinationOperator,
      huffmanTables,
      region.refinementTemplate,
      region.refinementAt,
      decodingContext,
      region.logStripSize,
      huffmanInput
    );
    this.drawBitmap(regionInfo, bitmap);
  }

  onImmediateLosslessTextRegion() {
    this.onImmediateTextRegion(...arguments);
  }

  onPatternDictionary(dictionary, currentSegment, data, start, end) {
    let patterns = this.patterns;
    if (!patterns) {
      this.patterns = patterns = {};
    }
    const decodingContext = new DecodingContext(data, start, end);
    patterns[currentSegment] = decodePatternDictionary(
      dictionary.mmr,
      dictionary.patternWidth,
      dictionary.patternHeight,
      dictionary.maxPatternIndex,
      dictionary.template,
      decodingContext
    );
  }

  onImmediateHalftoneRegion(region, referredSegments, data, start, end) {
    // HalftoneRegion refers to exactly one PatternDictionary.
    const patterns = this.patterns[referredSegments[0]];
    const regionInfo = region.info;
    const decodingContext = new DecodingContext(data, start, end);
    const bitmap = decodeHalftoneRegion(
      region.mmr,
      patterns,
      region.template,
      regionInfo.width,
      regionInfo.height,
      region.defaultPixelValue,
      region.enableSkip,
      region.combinationOperator,
      region.gridWidth,
      region.gridHeight,
      region.gridOffsetX,
      region.gridOffsetY,
      region.gridVectorX,
      region.gridVectorY,
      decodingContext
    );
    this.drawBitmap(regionInfo, bitmap);
  }

  onImmediateLosslessHalftoneRegion() {
    this.onImmediateHalftoneRegion(...arguments);
  }

  onTables(currentSegment, data, start, end) {
    let customTables = this.customTables;
    if (!customTables) {
      this.customTables = customTables = {};
    }
    customTables[currentSegment] = decodeTablesSegment(data, start, end);
  }
}

class HuffmanLine {
  constructor(lineData) {
    if (lineData.length === 2) {
      // OOB line.
      this.isOOB = true;
      this.rangeLow = 0;
      this.prefixLength = lineData[0];
      this.rangeLength = 0;
      this.prefixCode = lineData[1];
      this.isLowerRange = false;
    } else {
      // Normal, upper range or lower range line.
      // Upper range lines are processed like normal lines.
      this.isOOB = false;
      this.rangeLow = lineData[0];
      this.prefixLength = lineData[1];
      this.rangeLength = lineData[2];
      this.prefixCode = lineData[3];
      this.isLowerRange = lineData[4] === 'lower';
    }
  }
}

class HuffmanTreeNode {
  constructor(line) {
    this.children = [];
    if (line) {
      // Leaf node
      this.isLeaf = true;
      this.rangeLength = line.rangeLength;
      this.rangeLow = line.rangeLow;
      this.isLowerRange = line.isLowerRange;
      this.isOOB = line.isOOB;
    } else {
      // Intermediate or root node
      this.isLeaf = false;
    }
  }

  buildTree(line, shift) {
    const bit = (line.prefixCode >> shift) & 1;
    if (shift <= 0) {
      // Create a leaf node.
      this.children[bit] = new HuffmanTreeNode(line);
    } else {
      // Create an intermediate node and continue recursively.
      let node = this.children[bit];
      if (!node) {
        this.children[bit] = node = new HuffmanTreeNode(null);
      }
      node.buildTree(line, shift - 1);
    }
  }

  decodeNode(reader) {
    if (this.isLeaf) {
      if (this.isOOB) {
        return null;
      }
      const htOffset = reader.readBits(this.rangeLength);
      return this.rangeLow + (this.isLowerRange ? -htOffset : htOffset);
    }
    const node = this.children[reader.readBit()];
    if (!node) {
      throw new Jbig2Error('invalid Huffman data');
    }
    return node.decodeNode(reader);
  }
}

class HuffmanTable {
  constructor(lines, prefixCodesDone) {
    if (!prefixCodesDone) {
      this.assignPrefixCodes(lines);
    }
    // Create Huffman tree.
    this.rootNode = new HuffmanTreeNode(null);
    for (let i = 0, ii = lines.length; i < ii; i++) {
      const line = lines[i];
      if (line.prefixLength > 0) {
        this.rootNode.buildTree(line, line.prefixLength - 1);
      }
    }
  }

  decode(reader) {
    return this.rootNode.decodeNode(reader);
  }

  assignPrefixCodes(lines) {
    // Annex B.3 Assigning the prefix codes.
    const linesLength = lines.length;
    let prefixLengthMax = 0;
    for (let i = 0; i < linesLength; i++) {
      prefixLengthMax = Math.max(prefixLengthMax, lines[i].prefixLength);
    }

    const histogram = new Uint32Array(prefixLengthMax + 1);
    for (let i = 0; i < linesLength; i++) {
      histogram[lines[i].prefixLength]++;
    }
    let currentLength = 1,
      firstCode = 0,
      currentCode,
      currentTemp,
      line;
    histogram[0] = 0;

    while (currentLength <= prefixLengthMax) {
      firstCode = (firstCode + histogram[currentLength - 1]) << 1;
      currentCode = firstCode;
      currentTemp = 0;
      while (currentTemp < linesLength) {
        line = lines[currentTemp];
        if (line.prefixLength === currentLength) {
          line.prefixCode = currentCode;
          currentCode++;
        }
        currentTemp++;
      }
      currentLength++;
    }
  }
}

function decodeTablesSegment(data, start, end) {
  // Decodes a Tables segment, i.e., a custom Huffman table.
  // Annex B.2 Code table structure.
  const flags = data[start];
  const lowestValue = readUint32(data, start + 1) & 0xffffffff;
  const highestValue = readUint32(data, start + 5) & 0xffffffff;
  const reader = new Reader(data, start + 9, end);

  const prefixSizeBits = ((flags >> 1) & 7) + 1;
  const rangeSizeBits = ((flags >> 4) & 7) + 1;
  const lines = [];
  let prefixLength,
    rangeLength,
    currentRangeLow = lowestValue;

  // Normal table lines
  do {
    prefixLength = reader.readBits(prefixSizeBits);
    rangeLength = reader.readBits(rangeSizeBits);
    lines.push(
      new HuffmanLine([currentRangeLow, prefixLength, rangeLength, 0])
    );
    currentRangeLow += 1 << rangeLength;
  } while (currentRangeLow < highestValue);

  // Lower range table line
  prefixLength = reader.readBits(prefixSizeBits);
  lines.push(new HuffmanLine([lowestValue - 1, prefixLength, 32, 0, 'lower']));

  // Upper range table line
  prefixLength = reader.readBits(prefixSizeBits);
  lines.push(new HuffmanLine([highestValue, prefixLength, 32, 0]));

  if (flags & 1) {
    // Out-of-band table line
    prefixLength = reader.readBits(prefixSizeBits);
    lines.push(new HuffmanLine([prefixLength, 0]));
  }

  return new HuffmanTable(lines, false);
}

const standardTablesCache = {};

function getStandardTable(number) {
  // Annex B.5 Standard Huffman tables.
  let table = standardTablesCache[number];
  if (table) {
    return table;
  }
  let lines;
  switch (number) {
    case 1:
      lines = [
        [0, 1, 4, 0x0],
        [16, 2, 8, 0x2],
        [272, 3, 16, 0x6],
        [65808, 3, 32, 0x7] // upper
      ];
      break;
    case 2:
      lines = [
        [0, 1, 0, 0x0],
        [1, 2, 0, 0x2],
        [2, 3, 0, 0x6],
        [3, 4, 3, 0xe],
        [11, 5, 6, 0x1e],
        [75, 6, 32, 0x3e], // upper
        [6, 0x3f] // OOB
      ];
      break;
    case 3:
      lines = [
        [-256, 8, 8, 0xfe],
        [0, 1, 0, 0x0],
        [1, 2, 0, 0x2],
        [2, 3, 0, 0x6],
        [3, 4, 3, 0xe],
        [11, 5, 6, 0x1e],
        [-257, 8, 32, 0xff, 'lower'],
        [75, 7, 32, 0x7e], // upper
        [6, 0x3e] // OOB
      ];
      break;
    case 4:
      lines = [
        [1, 1, 0, 0x0],
        [2, 2, 0, 0x2],
        [3, 3, 0, 0x6],
        [4, 4, 3, 0xe],
        [12, 5, 6, 0x1e],
        [76, 5, 32, 0x1f] // upper
      ];
      break;
    case 5:
      lines = [
        [-255, 7, 8, 0x7e],
        [1, 1, 0, 0x0],
        [2, 2, 0, 0x2],
        [3, 3, 0, 0x6],
        [4, 4, 3, 0xe],
        [12, 5, 6, 0x1e],
        [-256, 7, 32, 0x7f, 'lower'],
        [76, 6, 32, 0x3e] // upper
      ];
      break;
    case 6:
      lines = [
        [-2048, 5, 10, 0x1c],
        [-1024, 4, 9, 0x8],
        [-512, 4, 8, 0x9],
        [-256, 4, 7, 0xa],
        [-128, 5, 6, 0x1d],
        [-64, 5, 5, 0x1e],
        [-32, 4, 5, 0xb],
        [0, 2, 7, 0x0],
        [128, 3, 7, 0x2],
        [256, 3, 8, 0x3],
        [512, 4, 9, 0xc],
        [1024, 4, 10, 0xd],
        [-2049, 6, 32, 0x3e, 'lower'],
        [2048, 6, 32, 0x3f] // upper
      ];
      break;
    case 7:
      lines = [
        [-1024, 4, 9, 0x8],
        [-512, 3, 8, 0x0],
        [-256, 4, 7, 0x9],
        [-128, 5, 6, 0x1a],
        [-64, 5, 5, 0x1b],
        [-32, 4, 5, 0xa],
        [0, 4, 5, 0xb],
        [32, 5, 5, 0x1c],
        [64, 5, 6, 0x1d],
        [128, 4, 7, 0xc],
        [256, 3, 8, 0x1],
        [512, 3, 9, 0x2],
        [1024, 3, 10, 0x3],
        [-1025, 5, 32, 0x1e, 'lower'],
        [2048, 5, 32, 0x1f] // upper
      ];
      break;
    case 8:
      lines = [
        [-15, 8, 3, 0xfc],
        [-7, 9, 1, 0x1fc],
        [-5, 8, 1, 0xfd],
        [-3, 9, 0, 0x1fd],
        [-2, 7, 0, 0x7c],
        [-1, 4, 0, 0xa],
        [0, 2, 1, 0x0],
        [2, 5, 0, 0x1a],
        [3, 6, 0, 0x3a],
        [4, 3, 4, 0x4],
        [20, 6, 1, 0x3b],
        [22, 4, 4, 0xb],
        [38, 4, 5, 0xc],
        [70, 5, 6, 0x1b],
        [134, 5, 7, 0x1c],
        [262, 6, 7, 0x3c],
        [390, 7, 8, 0x7d],
        [646, 6, 10, 0x3d],
        [-16, 9, 32, 0x1fe, 'lower'],
        [1670, 9, 32, 0x1ff], // upper
        [2, 0x1] // OOB
      ];
      break;
    case 9:
      lines = [
        [-31, 8, 4, 0xfc],
        [-15, 9, 2, 0x1fc],
        [-11, 8, 2, 0xfd],
        [-7, 9, 1, 0x1fd],
        [-5, 7, 1, 0x7c],
        [-3, 4, 1, 0xa],
        [-1, 3, 1, 0x2],
        [1, 3, 1, 0x3],
        [3, 5, 1, 0x1a],
        [5, 6, 1, 0x3a],
        [7, 3, 5, 0x4],
        [39, 6, 2, 0x3b],
        [43, 4, 5, 0xb],
        [75, 4, 6, 0xc],
        [139, 5, 7, 0x1b],
        [267, 5, 8, 0x1c],
        [523, 6, 8, 0x3c],
        [779, 7, 9, 0x7d],
        [1291, 6, 11, 0x3d],
        [-32, 9, 32, 0x1fe, 'lower'],
        [3339, 9, 32, 0x1ff], // upper
        [2, 0x0] // OOB
      ];
      break;
    case 10:
      lines = [
        [-21, 7, 4, 0x7a],
        [-5, 8, 0, 0xfc],
        [-4, 7, 0, 0x7b],
        [-3, 5, 0, 0x18],
        [-2, 2, 2, 0x0],
        [2, 5, 0, 0x19],
        [3, 6, 0, 0x36],
        [4, 7, 0, 0x7c],
        [5, 8, 0, 0xfd],
        [6, 2, 6, 0x1],
        [70, 5, 5, 0x1a],
        [102, 6, 5, 0x37],
        [134, 6, 6, 0x38],
        [198, 6, 7, 0x39],
        [326, 6, 8, 0x3a],
        [582, 6, 9, 0x3b],
        [1094, 6, 10, 0x3c],
        [2118, 7, 11, 0x7d],
        [-22, 8, 32, 0xfe, 'lower'],
        [4166, 8, 32, 0xff], // upper
        [2, 0x2] // OOB
      ];
      break;
    case 11:
      lines = [
        [1, 1, 0, 0x0],
        [2, 2, 1, 0x2],
        [4, 4, 0, 0xc],
        [5, 4, 1, 0xd],
        [7, 5, 1, 0x1c],
        [9, 5, 2, 0x1d],
        [13, 6, 2, 0x3c],
        [17, 7, 2, 0x7a],
        [21, 7, 3, 0x7b],
        [29, 7, 4, 0x7c],
        [45, 7, 5, 0x7d],
        [77, 7, 6, 0x7e],
        [141, 7, 32, 0x7f] // upper
      ];
      break;
    case 12:
      lines = [
        [1, 1, 0, 0x0],
        [2, 2, 0, 0x2],
        [3, 3, 1, 0x6],
        [5, 5, 0, 0x1c],
        [6, 5, 1, 0x1d],
        [8, 6, 1, 0x3c],
        [10, 7, 0, 0x7a],
        [11, 7, 1, 0x7b],
        [13, 7, 2, 0x7c],
        [17, 7, 3, 0x7d],
        [25, 7, 4, 0x7e],
        [41, 8, 5, 0xfe],
        [73, 8, 32, 0xff] // upper
      ];
      break;
    case 13:
      lines = [
        [1, 1, 0, 0x0],
        [2, 3, 0, 0x4],
        [3, 4, 0, 0xc],
        [4, 5, 0, 0x1c],
        [5, 4, 1, 0xd],
        [7, 3, 3, 0x5],
        [15, 6, 1, 0x3a],
        [17, 6, 2, 0x3b],
        [21, 6, 3, 0x3c],
        [29, 6, 4, 0x3d],
        [45, 6, 5, 0x3e],
        [77, 7, 6, 0x7e],
        [141, 7, 32, 0x7f] // upper
      ];
      break;
    case 14:
      lines = [
        [-2, 3, 0, 0x4],
        [-1, 3, 0, 0x5],
        [0, 1, 0, 0x0],
        [1, 3, 0, 0x6],
        [2, 3, 0, 0x7]
      ];
      break;
    case 15:
      lines = [
        [-24, 7, 4, 0x7c],
        [-8, 6, 2, 0x3c],
        [-4, 5, 1, 0x1c],
        [-2, 4, 0, 0xc],
        [-1, 3, 0, 0x4],
        [0, 1, 0, 0x0],
        [1, 3, 0, 0x5],
        [2, 4, 0, 0xd],
        [3, 5, 1, 0x1d],
        [5, 6, 2, 0x3d],
        [9, 7, 4, 0x7d],
        [-25, 7, 32, 0x7e, 'lower'],
        [25, 7, 32, 0x7f] // upper
      ];
      break;
    default:
      throw new Jbig2Error(`standard table B.${number} does not exist`);
  }

  for (let i = 0, ii = lines.length; i < ii; i++) {
    lines[i] = new HuffmanLine(lines[i]);
  }
  table = new HuffmanTable(lines, true);
  standardTablesCache[number] = table;
  return table;
}

class Reader {
  constructor(data, start, end) {
    this.data = data;
    this.start = start;
    this.end = end;
    this.position = start;
    this.shift = -1;
    this.currentByte = 0;
  }

  readBit() {
    if (this.shift < 0) {
      if (this.position >= this.end) {
        throw new Jbig2Error('end of data while reading bit');
      }
      this.currentByte = this.data[this.position++];
      this.shift = 7;
    }
    const bit = (this.currentByte >> this.shift) & 1;
    this.shift--;
    return bit;
  }

  readBits(numBits) {
    let result = 0,
      i;
    for (i = numBits - 1; i >= 0; i--) {
      result |= this.readBit() << i;
    }
    return result;
  }

  byteAlign() {
    this.shift = -1;
  }

  next() {
    if (this.position >= this.end) {
      return -1;
    }
    return this.data[this.position++];
  }
}

function getCustomHuffmanTable(index, referredTo, customTables) {
  // Returns a Tables segment that has been earlier decoded.
  // See 7.4.2.1.6 (symbol dictionary) or 7.4.3.1.6 (text region).
  let currentIndex = 0;
  for (let i = 0, ii = referredTo.length; i < ii; i++) {
    const table = customTables[referredTo[i]];
    if (table) {
      if (index === currentIndex) {
        return table;
      }
      currentIndex++;
    }
  }
  throw new Jbig2Error("can't find custom Huffman table");
}

function getTextRegionHuffmanTables(
  textRegion,
  referredTo,
  customTables,
  numberOfSymbols,
  reader
) {
  // 7.4.3.1.7 Symbol ID Huffman table decoding

  // Read code lengths for RUNCODEs 0...34.
  const codes = [];
  for (let i = 0; i <= 34; i++) {
    const codeLength = reader.readBits(4);
    codes.push(new HuffmanLine([i, codeLength, 0, 0]));
  }
  // Assign Huffman codes for RUNCODEs.
  const runCodesTable = new HuffmanTable(codes, false);

  // Read a Huffman code using the assignment above.
  // Interpret the RUNCODE codes and the additional bits (if any).
  codes.length = 0;
  for (let i = 0; i < numberOfSymbols; ) {
    const codeLength = runCodesTable.decode(reader);
    if (codeLength >= 32) {
      let repeatedLength, numberOfRepeats, j;
      switch (codeLength) {
        case 32:
          if (i === 0) {
            throw new Jbig2Error('no previous value in symbol ID table');
          }
          numberOfRepeats = reader.readBits(2) + 3;
          repeatedLength = codes[i - 1].prefixLength;
          break;
        case 33:
          numberOfRepeats = reader.readBits(3) + 3;
          repeatedLength = 0;
          break;
        case 34:
          numberOfRepeats = reader.readBits(7) + 11;
          repeatedLength = 0;
          break;
        default:
          throw new Jbig2Error('invalid code length in symbol ID table');
      }
      for (j = 0; j < numberOfRepeats; j++) {
        codes.push(new HuffmanLine([i, repeatedLength, 0, 0]));
        i++;
      }
    } else {
      codes.push(new HuffmanLine([i, codeLength, 0, 0]));
      i++;
    }
  }
  reader.byteAlign();
  const symbolIDTable = new HuffmanTable(codes, false);

  // 7.4.3.1.6 Text region segment Huffman table selection

  let customIndex = 0,
    tableFirstS,
    tableDeltaS,
    tableDeltaT;

  switch (textRegion.huffmanFS) {
    case 0:
    case 1:
      tableFirstS = getStandardTable(textRegion.huffmanFS + 6);
      break;
    case 3:
      tableFirstS = getCustomHuffmanTable(
        customIndex,
        referredTo,
        customTables
      );
      customIndex++;
      break;
    default:
      throw new Jbig2Error('invalid Huffman FS selector');
  }

  switch (textRegion.huffmanDS) {
    case 0:
    case 1:
    case 2:
      tableDeltaS = getStandardTable(textRegion.huffmanDS + 8);
      break;
    case 3:
      tableDeltaS = getCustomHuffmanTable(
        customIndex,
        referredTo,
        customTables
      );
      customIndex++;
      break;
    default:
      throw new Jbig2Error('invalid Huffman DS selector');
  }

  switch (textRegion.huffmanDT) {
    case 0:
    case 1:
    case 2:
      tableDeltaT = getStandardTable(textRegion.huffmanDT + 11);
      break;
    case 3:
      tableDeltaT = getCustomHuffmanTable(
        customIndex,
        referredTo,
        customTables
      );
      customIndex++;
      break;
    default:
      throw new Jbig2Error('invalid Huffman DT selector');
  }

  if (textRegion.refinement) {
    // Load tables RDW, RDH, RDX and RDY.
    throw new Jbig2Error('refinement with Huffman is not supported');
  }

  return {
    symbolIDTable,
    tableFirstS,
    tableDeltaS,
    tableDeltaT
  };
}

function getSymbolDictionaryHuffmanTables(
  dictionary,
  referredTo,
  customTables
) {
  // 7.4.2.1.6 Symbol dictionary segment Huffman table selection

  let customIndex = 0,
    tableDeltaHeight,
    tableDeltaWidth;
  switch (dictionary.huffmanDHSelector) {
    case 0:
    case 1:
      tableDeltaHeight = getStandardTable(dictionary.huffmanDHSelector + 4);
      break;
    case 3:
      tableDeltaHeight = getCustomHuffmanTable(
        customIndex,
        referredTo,
        customTables
      );
      customIndex++;
      break;
    default:
      throw new Jbig2Error('invalid Huffman DH selector');
  }

  switch (dictionary.huffmanDWSelector) {
    case 0:
    case 1:
      tableDeltaWidth = getStandardTable(dictionary.huffmanDWSelector + 2);
      break;
    case 3:
      tableDeltaWidth = getCustomHuffmanTable(
        customIndex,
        referredTo,
        customTables
      );
      customIndex++;
      break;
    default:
      throw new Jbig2Error('invalid Huffman DW selector');
  }

  let tableBitmapSize, tableAggregateInstances;
  if (dictionary.bitmapSizeSelector) {
    tableBitmapSize = getCustomHuffmanTable(
      customIndex,
      referredTo,
      customTables
    );
    customIndex++;
  } else {
    tableBitmapSize = getStandardTable(1);
  }

  if (dictionary.aggregationInstancesSelector) {
    tableAggregateInstances = getCustomHuffmanTable(
      customIndex,
      referredTo,
      customTables
    );
  } else {
    tableAggregateInstances = getStandardTable(1);
  }

  return {
    tableDeltaHeight,
    tableDeltaWidth,
    tableBitmapSize,
    tableAggregateInstances
  };
}

function readUncompressedBitmap(reader, width, height) {
  const bitmap = [];
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(width);
    bitmap.push(row);
    for (let x = 0; x < width; x++) {
      row[x] = reader.readBit();
    }
    reader.byteAlign();
  }
  return bitmap;
}

function decodeMMRBitmap(input, width, height, endOfBlock) {
  // MMR is the same compression algorithm as the PDF filter
  // CCITTFaxDecode with /K -1.
  const params = {
    K: -1,
    Columns: width,
    Rows: height,
    BlackIs1: true,
    EndOfBlock: endOfBlock
  };
  const decoder = new CCITTFaxDecoder(input, params);
  const bitmap = [];
  let currentByte,
    eof = false;

  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(width);
    bitmap.push(row);
    let shift = -1;
    for (let x = 0; x < width; x++) {
      if (shift < 0) {
        currentByte = decoder.readNextChar();
        if (currentByte === -1) {
          // Set the rest of the bits to zero.
          currentByte = 0;
          eof = true;
        }
        shift = 7;
      }
      // @ts-ignore
      row[x] = (currentByte >> shift) & 1;
      shift--;
    }
  }

  if (endOfBlock && !eof) {
    // Read until EOFB has been consumed.
    const lookForEOFLimit = 5;
    for (let i = 0; i < lookForEOFLimit; i++) {
      if (decoder.readNextChar() === -1) {
        break;
      }
    }
  }

  return bitmap;
}

class Jbig2Image {
  parseChunks(chunks) {
    return parseJbig2Chunks(chunks);
  }

  parse(data) {
    const { imgData, width, height } = parseJbig2(data);
    this.width = width;
    this.height = height;
    return imgData;
  }
}

// import { xml2js } from 'xml-js';
/**
 * uint8array 转base64
 * @param u8Arr
 * @returns
 */
function uint8arrayToBase64(u8Arr) {
    let CHUNK_SIZE = 0x8000; //arbitrary number
    let index = 0;
    let length = u8Arr.length;
    let result = '';
    let slice;
    while (index < length) {
        slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
        // @ts-ignore
        result += String.fromCharCode.apply(null, slice);
        index += CHUNK_SIZE;
    }
    return window.btoa(result);
}
const renderImageObject = (imageObject, data, content, isStampAnnot, StampId, PageRef, compositeObjectCTM) => {
    const { Boundary, ResourceID, CTM } = imageObject;
    const media = getMultiMedia(data.Res, ResourceID);
    let left = 0, top = 0, width = 0, height = 0;
    if (Boundary) {
        let boundary = formatSTBox(Boundary);
        left = boundary.left;
        top = boundary.top;
        width = boundary.width;
        height = boundary.height;
    }
    if (media && media.Path) {
        // 获取图片格式
        let mime = 'jpeg';
        mime = media.Path.replace(/.*\.(.*)$/, '$1');
        if (/jb2|bmp|gbig2/i.test(mime)) {
            renderBitImage({
                type: mime,
                // @ts-ignore
                data: data.OFDElements[media.Path],
                width: String(width),
                height: String(height)
            }, imageObject, content);
            return;
        }
        const baseStr = data.OFDElements[media.Path];
        if (!baseStr) {
            return false;
        }
        const imgSrc = `data:image/${mime};base64,` + baseStr;
        // const imgSrc = ParseFile.parseImageFromZip(media as { Path: string });
        if (imgSrc) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            if (isStampAnnot) {
                setStyle(svg, {
                    viewbox: `0 0 ${width} ${height}`,
                    name: 'seal_img_div',
                    'data-signature-id': StampId || '',
                    'data-page-ref': PageRef || ''
                });
                setStyle(img, {
                    preserveAspectRatio: 'none slice'
                });
            }
            img.setAttribute('xlink:href', imgSrc);
            img.href.baseVal = imgSrc;
            img.setAttribute('width', `100%`);
            let transform = '';
            if (CTM) {
                const [a, b, c, d, e, f] = CTM.split(' ').filter(Boolean);
                if (a && b && c && d) {
                    transform = `matrix(${converterDpi(a) / width} ${converterDpi(b) / width} ${converterDpi(c) / height} ${converterDpi(d) / height} ${converterDpi(e)} ${converterDpi(f)})`;
                }
            }
            if (compositeObjectCTM) {
                transform = `${transform} matrix(${compositeObjectCTM.a} ${compositeObjectCTM.b} ${compositeObjectCTM.c} ${compositeObjectCTM.d} ${converterDpi(compositeObjectCTM.e)} ${converterDpi(compositeObjectCTM.f)})`;
            }
            img.setAttribute('transform', transform);
            svg.appendChild(img);
            // if (clip) {
            //   clip = converterBox(clip);
            //   c = `clip: rect(${clip.y}px, ${clip.w + clip.x}px, ${
            //     clip.h + clip.y
            //   }px, ${clip.x}px)`;
            // }
            if (compositeObjectCTM) {
                const a = compositeObjectCTM.a;
                const b = compositeObjectCTM.b;
                const c = compositeObjectCTM.c;
                const d = compositeObjectCTM.d;
                const sx = a > 0
                    ? Math.sign(a) * Math.sqrt(a * a + c * c)
                    : Math.sqrt(a * a + c * c);
                const sy = d > 0
                    ? Math.sign(d) * Math.sqrt(b * b + d * d)
                    : Math.sqrt(b * b + d * d);
                const angel = Math.atan2(-b, d);
                if (!(angel == 0 && a != 0 && d == 1)) {
                    top *= sy;
                    left *= sx;
                }
            }
            svg.setAttribute('style', `cursor: pointer; overflow: visible; position: absolute; left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px; `);
            if (content) {
                content.appendChild(svg);
            }
        }
        // return svg;
    }
};
const renderBitImage = (pictureInfo, Box, content) => {
    if (!Box.Boundary)
        return;
    const { type, data } = pictureInfo;
    const { left, top, width: boundaryWidth, height: boundaryHeight } = formatSTBox(Box.Boundary);
    if (type.toLocaleLowerCase() === 'png' ||
        /gif|png|jpeg|bmp|jpg/i.test(type)) {
        const img = document.createElement('img');
        let imgSrc = `data:image/${type.toLocaleLowerCase()};base64,` +
            // @ts-ignore
            uint8arrayToBase64(data);
        if (type.toLocaleLowerCase() === 'bmp') {
            // 使用canvas转换图片格式
            drawBMPImage(imgSrc).then(r => {
                if (r) {
                    setStyle(img, {
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${boundaryWidth}px`,
                        height: `${boundaryHeight}px`,
                        position: 'absolute',
                        'z-index': '9'
                    });
                    img.setAttribute('src', r);
                    content.appendChild(img);
                }
            });
            return;
        }
        setStyle(img, {
            left: `${left}px`,
            top: `${top}px`,
            width: `${boundaryWidth}px`,
            height: `${boundaryHeight}px`,
            position: 'absolute',
            'z-index': '9'
        });
        img.setAttribute('src', imgSrc);
        content.appendChild(img);
        return;
    }
    // OFD格式签章
    if (/ofd/i.test(type)) {
        // @ts-ignore
        const baseStr = String.fromCharCode.apply(null, data);
        const zip = new JSZip();
        zip
            .loadAsync(baseStr)
            .then(r => {
            const signedOfd = r;
            if (signedOfd.files) {
                const wh = pictureInfo.width;
                parse(signedOfd.files, zip, Number(wh), undefined, true).then(res => {
                    const div = document.createElement('div');
                    setStyle(div, {
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${boundaryWidth}px`,
                        height: `${boundaryHeight}px`,
                        position: 'absolute',
                        overflow: 'hidden',
                        'z-index': '9'
                    });
                    // 清空 container 防止xml重复渲染
                    div.innerHTML = '';
                    div.appendChild(res);
                    if (content) {
                        content.appendChild(div);
                    }
                });
            }
            else {
                console.error('渲染OFD类型签章错误！！');
            }
        })
            .catch(err => new VaildOFDError(500, err.message || 'OFD解析失败'));
        return;
    }
    if (data && (/gbig2/i.test(type) || /jb2/i.test(type))) {
        let jbig2 = new Jbig2Image();
        const imgData = jbig2.parse(data);
        if (imgData) {
            const arr = new Uint8ClampedArray(4 * jbig2.width * jbig2.height);
            for (let i = 0; i < imgData.length; i++) {
                arr[4 * i] = imgData[i];
                arr[4 * i + 1] = imgData[i];
                arr[4 * i + 2] = imgData[i];
                arr[4 * i + 3] = 255;
            }
            let bitImageData = new ImageData(arr, jbig2.width, jbig2.height);
            const devRatio = window.devicePixelRatio || 1;
            const canvas = document.createElement('canvas');
            canvas.width = jbig2.width * devRatio;
            canvas.height = jbig2.height * devRatio;
            const context = canvas.getContext('2d');
            context.putImageData(bitImageData, 0, 0, 0, 0, jbig2.width, jbig2.height);
            canvas.setAttribute('style', `left: ${left}px; top: ${top}px; width: ${boundaryWidth}px; height: ${boundaryHeight}px;`);
            canvas.style.position = 'absolute';
            content.appendChild(canvas);
            return canvas;
        }
    }
};

/**
 * 渲染OFD
 * @param data OFD元数据
 * @param zip 解压
 * @param defaultWall 最大宽度
 * @param isSeal 是否是签章渲染
 */
const OFDRender = (data, defaultWidth, isSeal = false) => {
    // 优化 当OFD文件不存在 PageArea，获取Pages最大的PhysicalBox
    if (data.PageArea && !data.PageArea.PhysicalBox && !data.Pages) {
        throw new VaildOFDError(9999, 'OFD 绘制区域坐标为空！');
    }
    if (!data.Pages || !data.Pages.length) {
        throw new VaildOFDError(9999, 'OFD Pages为空，不绘制！');
    }
    const { PhysicalBox } = data.PageArea || { PhysicalBox: '' };
    // 确定绘制区域
    // const { width } = formatSTBox(PhysicalBox);
    const div = document.createElement('div');
    // 渲染签章
    if (isSeal) {
        setStyle(div, {
            position: 'relative',
            overflow: 'hidden'
        });
    }
    // 非签章渲染
    if (!isSeal) {
        setStyle(div, {
            position: 'relative',
            overflow: 'hidden',
            // 'min-width': `${width}px`,
            // 'min-height': `${height}px`,
            background: '#fff'
        });
    }
    // const pageDivs: any[] = [];
    let columnTop = 0;
    let maxWidth = 0;
    // 传入宽高容器限制，需要计算缩放比例
    let scale = 1;
    data.Pages.forEach(item => {
        const { Area, Template, PageID } = item;
        /**
         *
         * 定义该页页面区域的大小和位置,仅对该页有效。该节点不出现时。
         * 则使用模板页中的定义,如果模板页不存在或模板页中没有定义页面区域,
         * 则使用文件CommonData中的定义
         */
        if (!Area || !Area.PhysicalBox) {
            // Page 未确定起点坐标不绘制
            // 查找 Template
            if ((!Template || !data?.Tpls || !data.Tpls[Template.TemplateID]) &&
                !PhysicalBox) {
                return;
            }
        }
        // 根据规则查找 页面坐标
        let PageBox = Area.PhysicalBox;
        if (!PageBox &&
            Template?.TemplateID &&
            data.Tpls &&
            data.Tpls[Template.TemplateID]) {
            PageBox = data.Tpls[Template.TemplateID][0].Area.PhysicalBox;
        }
        if (!PageBox) {
            PageBox = PhysicalBox;
        }
        const [, , wh] = PageBox.split(' ');
        if (defaultWidth && wh) {
            scale = Number((defaultWidth / Number(wh)).toFixed(1));
        }
        if (!isSeal) {
            // 防止签章多次渲染变小
            ConverterDpi$1.setInitScale(scale);
        }
        // 设置缩放比例
        ConverterDpi$1.setScale(scale, isSeal);
        const { left: pageLeft, 
        // top: pageTop,
        width: pageWidth, height: pageHeight } = formatSTBox(PageBox);
        //
        let { width: physicalWidth
        //  height: physicalHeight
         } = formatSTBox(PhysicalBox);
        const pageDiv = document.createElement('div');
        // const pHeight = pageHeight > physicalHeight ? pageHeight : physicalHeight;
        const pHeight = pageHeight;
        const pWidth = pageWidth > physicalWidth ? pageWidth : physicalWidth;
        setStyle(pageDiv, {
            overflow: 'hidden',
            position: 'absolute',
            width: `${pWidth}px`,
            top: `${columnTop}px`,
            left: `${pageLeft}px`,
            height: `${pHeight}px`
        });
        columnTop += pHeight;
        // 使用Page最大宽度
        if (pWidth > maxWidth) {
            maxWidth = pWidth;
            div.style.width = `${maxWidth}px`;
        }
        // page渲染
        renderPage(item, data, pageDiv);
        // 判断是否有签章并渲染
        if (data.PageSignatures?.[PageID]) {
            renderSignature(data.PageSignatures[PageID], pageDiv);
        }
        div.appendChild(pageDiv);
        if (Template && Template.TemplateID) {
            // 查找是否有背景
            const ZOrder = String(Template.ZOrder || 'Background');
            if (data.Tpls && data.Tpls[Template.TemplateID]) {
                const TplsDivs = renderTplsPage(data.Tpls[Template.TemplateID], data, pageZIndex[ZOrder] - 1);
                if (TplsDivs?.length) {
                    TplsDivs.forEach(divItem => {
                        pageDiv.appendChild(divItem);
                    });
                }
            }
        }
    });
    div.style.height = `${columnTop}px`;
    return div;
};
/**
 * 序列化绘制 Template pages
 * @param pages
 * @param data
 * @param zIndex
 * @param pageDivs
 */
const renderTplsPage = (pages, data, zIndex) => {
    const result = [];
    if (pages?.length) {
        pages.forEach(item => {
            const { Area } = item;
            // if (!Area || !Area.PhysicalBox) {
            //   // Template Page 未确定起点坐标不绘制
            //   return;
            // }
            const { left: tplLeft, top: tplTop, width: tplWidth, height: tplHeight } = formatSTBox(Area.PhysicalBox);
            const div = document.createElement('div');
            setStyle(div, {
                overflow: 'hidden',
                position: 'absolute',
                width: tplWidth ? `${tplWidth}px` : '100%',
                top: `${tplTop}px`,
                left: `${tplLeft}px`,
                height: tplHeight ? `${tplHeight}px` : '100%',
                'z-index': zIndex
            });
            renderPage(item, data, div);
            result.push(div);
        });
    }
    return result;
};
const renderPage = (page, data, content) => {
    const { Area, Content: PageContent, Annot } = page;
    const { left: pageLeft, top: pageTop, width: pageWidth, height: pageHeight } = formatSTBox(Area.PhysicalBox);
    const pageContents = [];
    let drawFillColor = '';
    let drawStrokeColor = '';
    let drawLineWidth = 2;
    if (PageContent?.length) {
        PageContent.forEach(item => {
            const { Type = 'Body', PageBlock, DrawParam: drawParam } = item;
            const ZIndex = pageZIndex[Type];
            if (drawParam && getDrawParam(data.Res, drawParam)) {
                let currentDrawParam = getDrawParam(data.Res, drawParam);
                if (currentDrawParam?.Relative) {
                    currentDrawParam = getDrawParam(data.Res, currentDrawParam['Relative']);
                }
                if (currentDrawParam?.FillColor && currentDrawParam?.FillColor?.Value) {
                    drawFillColor = parseColor(currentDrawParam.FillColor['Value']);
                }
                if (currentDrawParam?.StrokeColor &&
                    currentDrawParam?.StrokeColor?.Value) {
                    drawStrokeColor = parseColor(currentDrawParam['StrokeColor']['Value']);
                }
                if (currentDrawParam?.LineWidth) {
                    drawLineWidth = Number(currentDrawParam?.LineWidth) > 0 ? 2 : 1;
                }
            }
            if (PageBlock?.length) {
                const div = document.createElement('div');
                setStyle(div, {
                    // overflow: 'hidden',
                    position: 'absolute',
                    width: pageWidth ? `${pageWidth}px` : '100%',
                    top: `${pageTop}px`,
                    left: `${pageLeft}px`,
                    height: pageHeight ? `${pageHeight}px` : '100%',
                    'z-index': ZIndex
                });
                PageBlock.forEach(item => {
                    const { Type } = item;
                    if (Type === 'TextObject') {
                        renderTextObject(item, data, div, drawFillColor, drawStrokeColor);
                    }
                    if (Type === 'PathObject') {
                        renderPathObject(item, data, div, drawLineWidth, 
                        // 线条填充颜色去除，防止签章纯色
                        '', drawStrokeColor);
                    }
                    if (Type === 'ImageObject') {
                        renderImageObject(item, data, div);
                    }
                });
                if (content) {
                    // Tpls 插入节点
                    content.appendChild(div);
                }
                else {
                    pageContents.push(div);
                }
            }
        });
    }
    if (Annot && Annot.Subtype === 'Watermark' && Annot.Appearance?.length) {
        Annot.Appearance.forEach(aItem => {
            if (aItem.PageBlock?.length) {
                const annotPageBlock = aItem.PageBlock;
                const annotDiv = document.createElement('div');
                const { left: annotPageLeft, top: annotPageTop, width: annotPageWidth, height: annotPageHeight } = formatSTBox(aItem.Boundary);
                setStyle(annotDiv, {
                    overflow: 'hidden',
                    position: 'absolute',
                    width: annotPageWidth ? `${annotPageWidth}px` : '100%',
                    top: `${annotPageTop}px`,
                    left: `${annotPageLeft}px`,
                    height: annotPageHeight ? `${annotPageHeight}px` : '100%',
                    'z-index': pageZIndex['WatermarkAnnot']
                });
                annotPageBlock.forEach(item => {
                    const { Type } = item;
                    if (Type === 'TextObject') {
                        renderTextObject(item, data, annotDiv, drawFillColor, drawStrokeColor);
                    }
                    if (Type === 'PathObject') {
                        renderPathObject(item, data, annotDiv, drawLineWidth, drawFillColor, drawStrokeColor);
                    }
                    if (Type === 'ImageObject') {
                        renderImageObject(item, data, annotDiv);
                    }
                });
                if (content) {
                    content.appendChild(annotDiv);
                }
                else {
                    pageContents.push(annotDiv);
                }
            }
        });
    }
    return pageContents;
};
/**
 * 格式化渲染签名
 * @param signedInfo
 * @param content
 */
const renderSignature = (signedInfo, content) => {
    // const div = document.createElement('div');
    // setStyle(div, {
    //   overflow: 'hidden',
    //   position: 'absolute',
    //   width: '100%',
    //   top: 0,
    //   left: 0,
    //   height: '100%',
    //   'z-index': 99
    // });
    signedInfo.forEach(item => {
        const pictureInfo = item?.Signature?.SignedInfo?.Seal?.picture;
        // 获取签章信息
        if (pictureInfo && item?.Signature?.SignedInfo?.StampAnnot?.length) {
            const StampAnnot = item.Signature.SignedInfo.StampAnnot;
            StampAnnot.forEach(cItem => {
                if (cItem?.Boundary) {
                    renderBitImage(pictureInfo, cItem, content);
                }
            });
        }
    });
    // if (content) {
    //   content.appendChild(div);
    // }
    // return div;
};

const xmlOptions = { compact: false, spaces: 4 };
/**
 * @description 解析ofd.xml
 */
// const OFDXMLParse = () => {};
/**
 * @description 解析ofd xml 文件
 * @param data OFD解压出来的文件
 * @param zip jszip 实例化对象
 * @param isParse true:直接返回解析json，false 返回dom节点
 * @param isSeal true:签章渲染，false:非签章渲染
 */
const parse = (data, zip, defaultWidth, isParse = false, isSeal = false) => {
    return new Promise((resolve, reject) => {
        try {
            if (!data) {
                throw new VaildOFDError(400, 'ofd xml不可为空');
            }
            const XMLMap = { ...data };
            const zipPromise = [];
            let current = 0;
            Object.entries(data).forEach(([key, val]) => {
                if (!val.dir) {
                    XMLMap[key.replace(/^\//, '')] = val;
                    // 格式化每一个XML文件
                    if (/\.xml$|\.xbrl$/.test(key)) {
                        // @ts-ignore
                        zipPromise.push(zip.file(key).async('string'));
                    }
                    else if (/\.dat$|\.esl$|\.jb2$|\.bmp$/.test(key)) {
                        // 签章文件转 binarystring
                        // @ts-ignore
                        zipPromise.push(zip.file(key).async('uint8array'));
                    }
                    else if (/\.ttf$|\.svg$|\.wof$|\.eot$|\.tof$|\.otf$/i.test(key)) {
                        // 字体文件转 arraybuffer
                        // @ts-ignore
                        zipPromise.push(zip.file(key).async('arraybuffer'));
                    }
                    else {
                        // 图片或资源文件转base64
                        // @ts-ignore
                        zipPromise.push(zip.file(key).async('base64'));
                    }
                    XMLMap[current] = key.replace(/^\//, '');
                    current += 1;
                }
                else {
                    // 删除文件夹
                    delete XMLMap[key];
                }
            });
            Promise.all(zipPromise).then(res => {
                if (res && res.length) {
                    for (let i = 0; i < res.length; i++) {
                        XMLMap[XMLMap[i]] = res[i];
                        // xml 格式文件需要格式化
                        if (/\.xml$|\.xbrl$/i.test(XMLMap[i])) {
                            XMLMap[XMLMap[i]] = xml2js(res[i], xmlOptions);
                        }
                        delete XMLMap[i];
                    }
                    const OFDXML = new OFDXMl(XMLMap);
                    const data = OFDXML.getData();
                    if (isParse) {
                        resolve(data);
                    }
                    else {
                        resolve(OFDRender(data, defaultWidth, isSeal));
                    }
                }
            });
        }
        catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

const zip = new JSZip();
const OfdDecompress = ({ file, requestData, requestOptions }) => {
    return new Promise((resolve, reject) => {
        //
        if (typeof file === 'string') {
            fetchs(file, { ...requestData }, { ...requestOptions }).then(res => {
                // OFD 只能返回文件流
                if (res && res instanceof ArrayBuffer) {
                    // OFD 需要解压
                    zip
                        .loadAsync(res)
                        .then(r => {
                        if (r && r.files) {
                            resolve({
                                code: 200,
                                data: r.files
                            });
                        }
                    })
                        .catch(err => reject(new VaildOFDError(500, err.message || 'OFD解析失败')));
                }
                else {
                    reject(new VaildOFDError(404));
                }
            });
        }
        if (file instanceof File) {
            // 优先获取魔数判断文件类型
            getFileType(file).then(fileType => {
                if (fileType === 'application/ofd' ||
                    fileType === 'ofd' ||
                    fileType === 'zip' ||
                    fileType === 'application/dicom') {
                    zip
                        .loadAsync(file)
                        .then(r => {
                        if (r && r.files) {
                            resolve({
                                code: 200,
                                data: r.files
                            });
                        }
                    })
                        .catch(err => {
                        console.error('err:', err);
                        reject(new VaildOFDError(500, err.message || 'OFD解析失败'));
                    });
                }
            });
        }
        if (file instanceof ArrayBuffer) {
            // OFD 需要解压
            zip
                .loadAsync(file)
                .then(r => {
                if (r && r.files) {
                    resolve({
                        code: 200,
                        data: r.files
                    });
                }
            })
                .catch(err => reject(new VaildOFDError(500, err.message || 'OFD解析失败')));
        }
    });
};
/**
 * 直接输出渲染节点
 * @param param0
 * @returns
 */
const getSVGDoms = ({ file, ofd, content, id, screenWidth, ...restOptions }) => new Promise((resolve, reject) => {
    LoadFontType.destroy();
    // 兼容ofd老版本
    if (!ofd && !file) {
        reject(new VaildOFDError(400, 'file 参数不可为空'));
        return;
    }
    if (ofd) {
        console.warn('注意1.0.4之后版本建议使用file替换ofd参数！');
    }
    const ofdfile = ofd || file;
    if (id && content) {
        reject(new VaildOFDError(500, 'id 和 content不能同时出现'));
        return;
    }
    // 初始化缩放比例
    ConverterDpi$1.setInitScale(1);
    // 初始化缩放比例end
    OfdDecompress({ file: ofdfile, ...restOptions })
        .then(res => {
        if (res && res.code === 200) {
            let millWidth = screenWidth;
            if (millWidth) {
                millWidth = UnitCoversion$1.CoversionMill(millWidth);
            }
            parse(res.data, zip, millWidth).then(pres => {
                let container = content;
                if (id) {
                    container = document.querySelector(`#${id}`);
                }
                if (container) {
                    if (isElement(container)) {
                        // 清空 container 防止xml重复渲染
                        container.innerHTML = '';
                        container.appendChild(pres);
                        if (restOptions.success) {
                            restOptions.success(pres);
                        }
                        resolve(pres);
                        return;
                    }
                }
                if (restOptions.fail) {
                    restOptions.fail(new VaildOFDError(403, 'content is not Element 或者 id 为空'));
                }
                reject(new VaildOFDError(403, 'content is not Element 或者 id 为空'));
            });
        }
    })
        .catch(reject);
});
/**
 *  输出格式化OFD JSON
 * @param param0
 * @returns
 */
const OFDParse = ({ file, ...restOptions }) => new Promise((resolve, reject) => {
    if (!file) {
        reject(new VaildOFDError(400));
        return;
    }
    OfdDecompress({ file, ...restOptions })
        .then(res => {
        if (res && res.code === 200) {
            parse(res.data, zip, undefined, true).then(res => {
                if (res) {
                    resolve({ code: 200, data: res });
                }
                else {
                    reject(new VaildOFDError(400));
                }
            });
        }
    })
        .catch(reject);
});

export { OFDParse, xml as XMLRender, getSVGDoms };
