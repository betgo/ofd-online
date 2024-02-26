import { Element } from 'xml-js';
import decodeHtml from '../lib/decode-html';

const TYPE_ELEMENT = 'element';
const TYPE_TEXT = 'text';
const TYPE_CDATA = 'cdata';

const closeSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="#909090" width="10" height="10"><path d="M0 0 L0 8 L7 4 Z"/></svg>`;
const openSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="#909090" width="10" height="10"><path d="M0 0 L8 0 L4 7 Z"/></svg>`;
const attrTemplate: (
  k: { [k: string]: string } | undefined
) => string = attributes => {
  let attr = '';
  if (attributes) {
    Object.entries(attributes).forEach(([keys, val]) => {
      attr += `&nbsp;<span style="color:rgb(153, 69, 0)"><span>${keys}</span>="<span style="color:rgb(26, 26, 166)">${val}</span>"</span>`;
    });
  }
  return attr;
};

const tagTemplate: (
  a: string,
  attributes: { [k: string]: string } | undefined,
  elements: Element[] | undefined
) => string = (name, attributes, elements) => {
  let htmlTag = '';
  if (elements) {
    htmlTag += `<span class="folder-button" style="position:absolute;left:-10px;top:3px;user-select: none;cursor: pointer;width: 10px;height: 10px;">${openSvg}</span>`;
  }
  htmlTag += `<span class="html-tag" style="color:rgb(136, 18, 128);">&lt;${name}${attrTemplate(
    attributes
  )}${!elements ? '&nbsp;/' : ''}&gt;</span>`;

  return htmlTag;
};

const findParentNode: (className: string, b: Node) => Node | null = (
  className,
  currentDom
) => {
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

export const elementRender: (w: Element[], d: HTMLElement) => boolean = (
  elements,
  dom
) => {
  if (!elements || !elements.length) {
    return false;
  }
  elements.forEach(item => {
    const { name, attributes, elements, type } = item;
    if (type === TYPE_ELEMENT && name) {
      const divLine = document.createElement('div');
      const divOpen = document.createElement('div');

      const htmlTmp = tagTemplate(
        name,
        attributes as { [k: string]: string },
        elements
      );
      divLine.setAttribute('class', 'f-line');
      divLine.setAttribute(
        'style',
        'position:relative;cursor: pointer;user-select: none;margin-left: 1em;font-family: monospace;font-size: 13px;'
      );
      divLine.innerHTML = htmlTmp;
      divOpen.setAttribute('style', 'margin-left: 1em;');
      divOpen.setAttribute('class', 'opened');
      dom.appendChild(divLine);
      dom.appendChild(divOpen);
      if (elements && elements.length) {
        divLine.addEventListener('click', function (e) {
          const currentDom = e.target as HTMLElement;
          const className = currentDom?.getAttribute('class');
          let openDom = null;
          if (className !== 'f-line') {
            openDom = findParentNode('f-line', currentDom) as HTMLElement;
          } else {
            openDom = currentDom;
          }
          const closeDom = openDom?.nextSibling as HTMLElement;
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
              } else {
                btnDom.innerHTML = closeSvg;
                styles += 'display:none;';
              }
            }
          }
          closeDom.setAttribute('style', styles as string);
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
    } else if (type === TYPE_CDATA) {
      cdataRender(item, dom);
    } else {
      if (type) {
        // @ts-ignore
        const elemHtml = item[type];
        if (elemHtml !== undefined && typeof elemHtml === 'string') {
          const divLine = document.createElement('div');
          divLine.setAttribute('style', 'margin-left: 1em;');
          divLine.innerHTML = `<span>${decodeHtml(
            String(elemHtml || '')
          )}<span>`;
          dom.appendChild(divLine);
        }
      }
    }
  });
  return true;
};

export const textRender: (a: Element, d: HTMLElement) => void = (info, dom) => {
  const { text } = info;
  const divLine = document.createElement('div');
  divLine.setAttribute('style', 'margin-left: 1em;');
  divLine.innerHTML = `<span>${decodeHtml(String(text || ''))}<span>`;
  dom.appendChild(divLine);
};

export const cdataRender: (a: Element, d: HTMLElement) => void = (
  info,
  dom
) => {
  const { cdata } = info;
  const divLine = document.createElement('div');
  divLine.setAttribute('style', 'margin-left: 1em;');
  divLine.innerHTML = `<span>&lt;![CDATA[ ${decodeHtml(
    String(cdata || '')
  )} ]]&gt;<span>`;
  dom.appendChild(divLine);
};

const render: (a: any) => HTMLDivElement = xmlParse => {
  const div = document.createElement('div');
  div.setAttribute('class', 'm-xml-pre');
  div.setAttribute('style', 'text-align:left;font-size:12px');
  elementRender(xmlParse.elements, div);

  return div;
};

export default render;
