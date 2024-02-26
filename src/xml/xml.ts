import { xml2js } from 'xml-js';
import XmlErrors from '../errors/XmlErrors';
import fetchs from '../lib/fetch';
import getMime from '../lib/mime';
import isElement from '../lib/is-element';
import render from './render';

interface Options {
  file: string | File | ArrayBuffer;
  content?: Element;
  id?: string;
  success?: (k: Element) => any;
  fail?: (e: Error) => any;
  requestOptions?: undefined | { [key: string]: any };
  requestData?: undefined | { [key: string]: any };
  responseFilter?: (key: { [key: string]: string | number }) => string;
}

const xmlOptions = { compact: false, spaces: 4 };

const xmlParse = ({
  file,
  requestData,
  requestOptions,
  responseFilter
}: Options): Promise<{ code: number; data: any }> => {
  return new Promise((resolve, reject) => {
    //
    if (typeof file === 'string') {
      if (
        file.indexOf('<') > -1 &&
        file.indexOf('>') > -1 &&
        /<[^>]+>/g.test(file)
      ) {
        // xml需要使用string格式化
        const xmlJSON = xml2js(file, xmlOptions);
        if (xmlJSON) {
          resolve({
            code: 200,
            data: xmlJSON
          });
          return { code: 200, data: xmlJSON };
        }
      } else {
        fetchs(file, { ...requestData }, { ...requestOptions }).then(res => {
          let xmlStr = '';
          if (res) {
            if (responseFilter) {
              xmlStr = responseFilter(res);
            } else if (typeof res === 'string') {
              xmlStr = res;
            }
          }
          if (xmlStr) {
            // xml需要使用string格式化
            const xmlJSON = xml2js(xmlStr, xmlOptions);
            if (xmlJSON) {
              resolve({
                code: 200,
                data: xmlJSON
              });
            }
          } else {
            reject(new XmlErrors(404));
          }
        });
      }
    }
    if (file instanceof File) {
      // 优先获取魔数判断文件类型
      getMime(file).then(fileType => {
        if (fileType === 'xml') {
          const fileReader = new FileReader();
          fileReader.onload = () => {
            if (fileReader.result && typeof fileReader.result === 'string') {
              const xmlJSON = xml2js(fileReader.result, xmlOptions);
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
      reject(
        new XmlErrors(
          403,
          'file 参数只能为string或者File，不允许使用ArrayBuffer'
        )
      );
    }
  });
};

export default ({ file, content, id, ...restOptions }: Options) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new XmlErrors(400));
      return;
    }
    xmlParse({ file, ...restOptions })
      .then(res => {
        if (res && res.code === 200) {
          let container = content;
          if (id) {
            container = document.querySelector(`#${id}`) as HTMLElement;
          }
          if (container) {
            if (isElement(container)) {
              // 清空 container 防止xml重复渲染
              container.innerHTML = '';
              const pres = render(res.data);
              container.appendChild(pres);
              if (restOptions.success) {
                restOptions.success(pres as HTMLElement);
              }
              resolve(pres as HTMLElement);
              return;
            }
          }
          if (restOptions.fail) {
            restOptions.fail(
              new XmlErrors(403, 'content is not Element 或者 id 为空')
            );
          }
          reject(new XmlErrors(403, 'content is not Element 或者 id 为空'));
        }
      })
      .catch(reject);
  });
