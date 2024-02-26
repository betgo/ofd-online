import { xml2js } from 'xml-js';
import JSZip from 'jszip';
import OFDError from '../errors/OFDErrors';
// import OFDElement from '../core/ofd-core/OFDElement';
import OFDXml from '../core/ofd-core/Ofd/OFDXml';
import { OFDRender } from './render';
import { ResultData } from '../core/ofd-core';

interface OFDXML {
  'OFD.xml': any;
  [key: string]: any;
}

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
const parse: (
  data: OFDXML,
  zip: JSZip,
  defaultWidth?: number,
  isParse?: boolean,
  isSeal?: boolean
) => Promise<HTMLElement | ResultData> = (
  data,
  zip,
  defaultWidth,
  isParse = false,
  isSeal = false
) => {
  return new Promise((resolve, reject) => {
    try {
      if (!data) {
        throw new OFDError(400, 'ofd xml不可为空');
      }
      const XMLMap: { [key: string]: any } = { ...data };
      const zipPromise: Promise<string>[] = [];
      let current = 0;
      Object.entries(data).forEach(([key, val]) => {
        if (!val.dir) {
          XMLMap[key.replace(/^\//, '')] = val;
          // 格式化每一个XML文件
          if (/\.xml$|\.xbrl$/.test(key)) {
            // @ts-ignore
            zipPromise.push(zip.file(key).async('string'));
          } else if (/\.dat$|\.esl$|\.jb2$|\.bmp$/.test(key)) {
            // 签章文件转 binarystring
            // @ts-ignore
            zipPromise.push(zip.file(key).async('uint8array'));
          } else if (/\.ttf$|\.svg$|\.wof$|\.eot$|\.tof$|\.otf$/i.test(key)) {
            // 字体文件转 arraybuffer
            // @ts-ignore
            zipPromise.push(zip.file(key).async('arraybuffer'));
          } else {
            // 图片或资源文件转base64
            // @ts-ignore
            zipPromise.push(zip.file(key).async('base64'));
          }
          XMLMap[current] = key.replace(/^\//, '');
          current += 1;
        } else {
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
          const OFDXML = new OFDXml(XMLMap);

          const data = OFDXML.getData();
          if (isParse) {
            resolve(data);
          } else {
            resolve(OFDRender(data, defaultWidth, isSeal));
          }
        }
      });
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

export default parse;
