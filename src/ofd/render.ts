import VaildOFDError from '../errors/OFDErrors';
import {
  ResultData,
  Page,
  LayerPageBlock,
  Signatures
  // Res
} from '../core/ofd-core/index.d';
// import ParseFile from '../lib/ParseFile';
import {
  parseColor,
  getDrawParam,
  setStyle,
  formatSTBox,
  pageZIndex
} from './ofd-utils';
import ConverterDpi from './ConverterDpi';
import renderTextObject from './svg-text';
import renderPathObject from './svg-path';
import renderImageObject, { renderBitImage } from './svg-image';

/**
 * 渲染OFD
 * @param data OFD元数据
 * @param zip 解压
 * @param defaultWall 最大宽度
 * @param isSeal 是否是签章渲染
 */
export const OFDRender = (
  data: ResultData,
  defaultWidth?: number,
  isSeal = false
) => {
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
      if (
        (!Template || !data?.Tpls || !data.Tpls[Template.TemplateID]) &&
        !PhysicalBox
      ) {
        return;
      }
    }
    // 根据规则查找 页面坐标
    let PageBox = Area.PhysicalBox;

    if (
      !PageBox &&
      Template?.TemplateID &&
      data.Tpls &&
      data.Tpls[Template.TemplateID]
    ) {
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
      ConverterDpi.setInitScale(scale);
    }

    // 设置缩放比例
    ConverterDpi.setScale(scale, isSeal);

    const {
      left: pageLeft,
      // top: pageTop,
      width: pageWidth,
      height: pageHeight
    } = formatSTBox(PageBox);
    //
    let {
      width: physicalWidth
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
      const ZOrder = String(Template.ZOrder || 'Background') as
        | 'Background'
        | 'Body'
        | 'Foreground';
      if (data.Tpls && data.Tpls[Template.TemplateID]) {
        const TplsDivs = renderTplsPage(
          data.Tpls[Template.TemplateID],
          data,
          pageZIndex[ZOrder] - 1
        ) as HTMLElement[];
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
export const renderTplsPage = (
  pages: Page[],
  data: ResultData,
  zIndex: number
) => {
  const result: any[] = [];
  if (pages?.length) {
    pages.forEach(item => {
      const { Area } = item;
      // if (!Area || !Area.PhysicalBox) {
      //   // Template Page 未确定起点坐标不绘制
      //   return;
      // }
      const {
        left: tplLeft,
        top: tplTop,
        width: tplWidth,
        height: tplHeight
      } = formatSTBox(Area.PhysicalBox);
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

export const renderPage = (
  page: Page,
  data: ResultData,
  content?: HTMLElement
) => {
  const { Area, Content: PageContent, Annot } = page;
  const {
    left: pageLeft,
    top: pageTop,
    width: pageWidth,
    height: pageHeight
  } = formatSTBox(Area.PhysicalBox);
  const pageContents: any[] = [];

  let drawFillColor: string = '';
  let drawStrokeColor: string = '';
  let drawLineWidth: number = 2;

  if (PageContent?.length) {
    PageContent.forEach(item => {
      const { Type = 'Body', PageBlock, DrawParam: drawParam } = item;
      const ZIndex = pageZIndex[Type as 'Background' | 'Body' | 'Foreground'];
      if (drawParam && getDrawParam(data.Res, drawParam)) {
        let currentDrawParam = getDrawParam(data.Res, drawParam);
        if (currentDrawParam?.Relative) {
          currentDrawParam = getDrawParam(
            data.Res,
            currentDrawParam['Relative']
          );
        }
        if (currentDrawParam?.FillColor && currentDrawParam?.FillColor?.Value) {
          drawFillColor = parseColor(currentDrawParam.FillColor['Value']);
        }
        if (
          currentDrawParam?.StrokeColor &&
          currentDrawParam?.StrokeColor?.Value
        ) {
          drawStrokeColor = parseColor(
            currentDrawParam['StrokeColor']['Value']
          );
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
            renderTextObject(
              item as LayerPageBlock & { [k: string]: unknown },
              data,
              div,
              drawFillColor,
              drawStrokeColor
            );
          }
          if (Type === 'PathObject') {
            renderPathObject(
              item as LayerPageBlock & { [k: string]: unknown },
              data,
              div,
              drawLineWidth,
              // 线条填充颜色去除，防止签章纯色
              '',
              drawStrokeColor
            );
          }
          if (Type === 'ImageObject') {
            renderImageObject(
              item as LayerPageBlock & { [k: string]: unknown },
              data,
              div
            );
          }
        });
        if (content) {
          // Tpls 插入节点
          content.appendChild(div);
        } else {
          pageContents.push(div);
        }
      }
    });
  }
  if (Annot && Annot.Subtype === 'Watermark' && Annot.Appearance?.length) {
    Annot.Appearance.forEach(aItem => {
      if (aItem.PageBlock?.length) {
        const annotPageBlock = aItem.PageBlock as LayerPageBlock[];
        const annotDiv = document.createElement('div');
        const {
          left: annotPageLeft,
          top: annotPageTop,
          width: annotPageWidth,
          height: annotPageHeight
        } = formatSTBox(aItem.Boundary);
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
            renderTextObject(
              item as LayerPageBlock & { [k: string]: unknown },
              data,
              annotDiv,
              drawFillColor,
              drawStrokeColor
            );
          }
          if (Type === 'PathObject') {
            renderPathObject(
              item as LayerPageBlock & { [k: string]: unknown },
              data,
              annotDiv,
              drawLineWidth,
              drawFillColor,
              drawStrokeColor
            );
          }
          if (Type === 'ImageObject') {
            renderImageObject(
              item as LayerPageBlock & { [k: string]: unknown },
              data,
              annotDiv
            );
          }
        });
        if (content) {
          content.appendChild(annotDiv);
        } else {
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
const renderSignature = (signedInfo: Signatures[], content: HTMLElement) => {
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
          renderBitImage(
            pictureInfo as {
              type: string;
              data: Uint8Array;
              width: string;
              height: string;
            },
            cItem,
            content
          );
        }
      });
    }
  });

  // if (content) {
  //   content.appendChild(div);
  // }
  // return div;
};
