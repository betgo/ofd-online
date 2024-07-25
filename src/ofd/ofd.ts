import JSZip from 'jszip';
import OFDErrors from '../errors/OFDErrors';
import fetchs from '../lib/fetch';
import getMime from '../lib/mime';
import isElement from '../lib/is-element';
import parseOfd from './parse-ofd';
import { ResultData } from '../core/ofd-core';
import UnitCoversion from '../lib/UnitCoversion';
import LoadFontType from '../lib/load-opentype';
import ConverterDpi from './ConverterDpi';

// import render from './render';

interface Options {
  file: string | File | ArrayBuffer;
  ofd?: string | File | ArrayBuffer;
  // dom节点
  content?: Element;
  // 节点ID
  id?: string;
  // 不建议使用
  fail?: (err: Error) => undefined;
  // 不建议使用
  success?: (s: HTMLElement) => undefined;
  // 显示宽度
  screenWidth?: number;
  // Ftech请求配置
  requestOptions?: undefined | { [key: string]: any };
  // 请求额外参数（用户自定义，签名或者token）
  requestData?: undefined | { [key: string]: any };
  // 暂时未使用
  responseFilter?: (key: { [key: string]: string | number }) => string;
}
const zip = new JSZip();
const OfdDecompress = ({
  file,
  requestData,
  requestOptions
}: Options): Promise<{ code: number; data: any }> => {
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
            .catch(err =>
              reject(new OFDErrors(500, err.message || 'OFD解析失败'))
            );
        } else {
          reject(new OFDErrors(404));
        }
      });
    }
    if (file instanceof File) {
      // 优先获取魔数判断文件类型
      getMime(file).then(fileType => {
        if (
          fileType === 'application/ofd' ||
          fileType === 'ofd' ||
          fileType === 'zip' ||
          fileType === 'application/dicom'
        ) {
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
              reject(new OFDErrors(500, err.message || 'OFD解析失败'));
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
        .catch(err => reject(new OFDErrors(500, err.message || 'OFD解析失败')));
    }
  });
};

/**
 * 直接输出渲染节点
 * @param param0
 * @returns
 */
export const getSVGDoms: (r: Options) => Promise<HTMLElement> = ({
  file,
  ofd,
  content,
  id,
  screenWidth,
  ...restOptions
}: Options) =>
  new Promise((resolve, reject) => {
    LoadFontType.destroy();
    // 兼容ofd老版本
    if (!ofd && !file) {
      reject(new OFDErrors(400, 'file 参数不可为空'));
      return;
    }
    if (ofd) {
      console.warn('注意1.0.4之后版本建议使用file替换ofd参数！');
    }
    const ofdfile = ofd || file;
    if (id && content) {
      reject(new OFDErrors(500, 'id 和 content不能同时出现'));
      return;
    }
    // 初始化缩放比例
    ConverterDpi.setInitScale(1);
    // 初始化缩放比例end
    OfdDecompress({ file: ofdfile, ...restOptions })
      .then(res => {
        if (res && res.code === 200) {
          let millWidth = screenWidth;
          if (millWidth) {
            millWidth = UnitCoversion.CoversionMill(millWidth);
          }
          parseOfd(res.data, zip, millWidth).then(pres => {
            let container = content;
            if (id) {
              container = document.querySelector(`#${id}`) as HTMLElement;
            }
            if (container) {
              if (isElement(container)) {
                // 清空 container 防止xml重复渲染
                container.innerHTML = '';
                container.appendChild(pres as HTMLElement);
                if (restOptions.success) {
                  restOptions.success(pres as HTMLElement);
                }
                resolve(pres as HTMLElement);
                return;
              }
            }
            if (restOptions.fail) {
              restOptions.fail(
                new OFDErrors(403, 'content is not Element 或者 id 为空')
              );
            }
            reject(new OFDErrors(403, 'content is not Element 或者 id 为空'));
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
const OFDParse: (p: Options) => Promise<{ code: number; data: ResultData }> = ({
  file,
  ...restOptions
}: Omit<Options, 'fail' | 'success'>) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new OFDErrors(400));
      return;
    }
    OfdDecompress({ file, ...restOptions })
      .then(res => {
        if (res && res.code === 200) {
          parseOfd(res.data, zip, undefined, true).then(res => {
            if (res) {
              resolve({ code: 200, data: res as ResultData });
            } else {
              reject(new OFDErrors(400));
            }
          });
        }
      })
      .catch(reject);
  });

export default OFDParse;
