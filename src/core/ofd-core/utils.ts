import { Element } from 'xml-js';
import { OFD_Q } from './constant';

export const reHex = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;

export function recursion(
  elements: Array<Element>,
  result: { [key: string]: any },
  flatResult: { [key: string]: any }
) {
  if (elements && elements.length) {
    elements.forEach(item => {
      const { type, name, elements } = item;
      if (name) {
        // 获取子集是否是text
        result[name] = null;
        flatResult[name] = null;
        if (type === 'element') {
          if (
            elements &&
            elements.length === 1 &&
            elements[0].type === 'text'
          ) {
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

export function recursionGet(
  elements: Array<Element>,
  qName: string
): Element | null {
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

export const NameREG = new RegExp(OFD_Q);
