// import { xml2js } from 'xml-js';
import JSZip from 'jszip';
import parseOfd from './parse-ofd';
// @ts-ignore
import { Jbig2Image } from '../lib/jbig/jbig2.js';

import {
  ResultData,
  LayerPageBlock,
  StampAnnot
} from '../core/ofd-core/index.d';
import OFDErrors from '../errors/OFDErrors';

import {
  formatSTBox,
  getMultiMedia,
  converterDpi,
  setStyle,
  drawBMPImage
} from './ofd-utils';

interface PictureInfo {
  type: string;
  data: Uint8Array;
  width: string;
  height: string;
}

/**
 * uint8array 转base64
 * @param u8Arr
 * @returns
 */
function uint8arrayToBase64(u8Arr: Uint8Array) {
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

const renderImageObject = (
  imageObject: LayerPageBlock & { [k: string]: any },
  data: ResultData,
  content: HTMLElement,
  isStampAnnot?: boolean,
  StampId?: string,
  PageRef?: string,
  compositeObjectCTM?: any
) => {
  const { Boundary, ResourceID, CTM } = imageObject;
  const media = getMultiMedia(data.Res, ResourceID);
  let left = 0,
    top = 0,
    width = 0,
    height = 0;
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
      renderBitImage(
        {
          type: mime,
          // @ts-ignore
          data: data.OFDElements[media.Path],
          width: String(width),
          height: String(height)
        },
        imageObject,
        content
      );
      return;
    }
    const baseStr = data.OFDElements[media.Path] as string;
    if (!baseStr) {
      return false;
    }
    const imgSrc = `data:image/${mime};base64,` + baseStr;

    // const imgSrc = ParseFile.parseImageFromZip(media as { Path: string });
    if (imgSrc) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const img = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'image'
      );
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
          transform = `matrix(${converterDpi(a) / width} ${
            converterDpi(b) / width
          } ${converterDpi(c) / height} ${
            converterDpi(d) / height
          } ${converterDpi(e)} ${converterDpi(f)})`;
        }
      }
      if (compositeObjectCTM) {
        transform = `${transform} matrix(${compositeObjectCTM.a} ${
          compositeObjectCTM.b
        } ${compositeObjectCTM.c} ${compositeObjectCTM.d} ${converterDpi(
          compositeObjectCTM.e
        )} ${converterDpi(compositeObjectCTM.f)})`;
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
        const sx =
          a > 0
            ? Math.sign(a) * Math.sqrt(a * a + c * c)
            : Math.sqrt(a * a + c * c);
        const sy =
          d > 0
            ? Math.sign(d) * Math.sqrt(b * b + d * d)
            : Math.sqrt(b * b + d * d);
        const angel = Math.atan2(-b, d);
        if (!(angel == 0 && a != 0 && d == 1)) {
          top *= sy;
          left *= sx;
        }
      }
      svg.setAttribute(
        'style',
        `cursor: pointer; overflow: visible; position: absolute; left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px; `
      );
      if (content) {
        content.appendChild(svg);
      }
    }

    // return svg;
  }
};

export const renderBitImage = (
  pictureInfo: PictureInfo,
  Box: StampAnnot,
  content: HTMLElement
) => {
  if (!Box.Boundary) return;
  const { type, data } = pictureInfo;
  const {
    left,
    top,
    width: boundaryWidth,
    height: boundaryHeight
  } = formatSTBox(Box.Boundary);
  if (
    type.toLocaleLowerCase() === 'png' ||
    /gif|png|jpeg|bmp|jpg/i.test(type)
  ) {
    const img = document.createElement('img');
    let imgSrc =
      `data:image/${type.toLocaleLowerCase()};base64,` +
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
        const signedOfd = r as any;
        if (signedOfd.files) {
          const wh = pictureInfo.width;
          parseOfd(signedOfd.files, zip, Number(wh), undefined, true).then(
            res => {
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
              div.appendChild(res as HTMLElement);
              if (content) {
                content.appendChild(div);
              }
            }
          );
        } else {
          console.error('渲染OFD类型签章错误！！');
        }
      })
      .catch(err => new OFDErrors(500, err.message || 'OFD解析失败'));
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
      const context = canvas.getContext('2d') as CanvasRenderingContext2D;

      context.putImageData(bitImageData, 0, 0, 0, 0, jbig2.width, jbig2.height);
      canvas.setAttribute(
        'style',
        `left: ${left}px; top: ${top}px; width: ${boundaryWidth}px; height: ${boundaryHeight}px;`
      );
      canvas.style.position = 'absolute';
      content.appendChild(canvas);
      return canvas;
    }
  }
};

export default renderImageObject;
