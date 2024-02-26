import { ResultData, LayerPageBlock, Res } from '../core/ofd-core/index.d';
import {
  parseColor,
  calTextPoint,
  converterDpi,
  getFont,
  getDrawParam,
  getFontFamily,
  formatSTBox
} from './ofd-utils';
import LoadFontType from '../lib/load-opentype';

/**
 * 绘制Text
 */
const renderTextObject = (
  info: LayerPageBlock & { [k: string]: any },
  data: ResultData,
  content: HTMLElement,
  drawFillColor?: string,
  drawStrokeColor?: string
) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('version', '1.1');
  const {
    TextCode = {},
    CTM,
    Boundary = '',
    ID,
    Fill = true,
    FillColor,
    Size,
    Font,
    HScale,
    CGTransform,
    DrawParam,
    Weight: weight
  } = info;
  //
  const boundary = formatSTBox(String(Boundary));

  // // 字体大小
  const size = converterDpi(String(Size || 0));
  const fillColor = FillColor as null | { [k: string]: any };
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

    const AxialShd = fillColor['AxialShd'] as null | { [k: string]: any };
    if (alpha) {
      defaultFillOpacity = alpha > 1 ? alpha / 255 : alpha;
    }

    if (!Fill) {
      defaultFillOpacity = 0;
    }

    let xsize = size;
    let ysize = size;

    if (CTM) {
      const [a, b, c, d] = String(CTM)
        .split(' ')
        .map(i => Number(i));
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
        xsize = xsize * sx;
        ysize = ysize * sy;
      }
      if (angel === 0) {
        hScale = a / d;
        if (hScale > 0) {
          xsize = xsize * hScale;
        }
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
            stop.setAttribute(
              'style',
              `stop-color:${parseColor(
                segment['Color']['Value']
              )};stop-opacity:1`
            );
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
    LoadFontType.setFontFile(
      fontObj.ID,
      data.OFDElements[fontObj.Path] as unknown as ArrayBuffer,
      res => {
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
          const resultFont = LoadFontType.getFontFile(
            fontObj.ID,
            str,
            fontTypeX,
            fontTypeY,
            size
          );
          let svgG = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'g'
          );
          let transform = '';
          if (CTM) {
            const [a, b, c, d, e, f] = CTM.split(' ');
            transform = `matrix(${a} ${b} ${c} ${d} ${converterDpi(
              e
            )} ${converterDpi(f)})`;
          }

          if (hScale) {
            transform = `${transform} matrix(${hScale}, 0, 0, 1, ${
              (1 - hScale) * fontTypeX
            }, 0)`;
          }
          svgG.setAttribute('transform', transform);
          if (isAxialShd && defaultFillColor) {
            svgG.setAttribute('fill', defaultFillColor);
          } else {
            defaultStrokeColor && svgG.setAttribute('fill', defaultStrokeColor);
            defaultFillColor && svgG.setAttribute('fill', defaultFillColor);
            defaultFillOpacity &&
              svgG.setAttribute('fill-opacity', `${defaultFillOpacity}`);
          }
          svgG.innerHTML = resultFont;
          svgG.setAttribute('transform', transform);
          if (isAxialShd && defaultFillColor) {
            svgG.setAttribute('fill', defaultFillColor);
          } else {
            defaultStrokeColor && svgG.setAttribute('fill', defaultStrokeColor);
            defaultFillColor && svgG.setAttribute('fill', defaultFillColor);
            defaultFillOpacity &&
              svgG.setAttribute('fill-opacity', `${defaultFillOpacity}`);
          }
          svgG.setAttribute(
            'style',
            `font-weight: ${weight};font-size:${size}px;font-family: ${getFontFamily(
              fontObj as Res
            )};`
          );

          svg.appendChild(svgG);
        } else {
          for (const textCodePoint of textCodePointList) {
            let svgTxt = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'text'
            );
            svgTxt.innerHTML = textCodePoint.text;
            svgTxt.setAttribute('x', textCodePoint.x);
            svgTxt.setAttribute('y', textCodePoint.y);

            let transform = '';
            if (CTM) {
              const [a, b, c, d, e, f] = CTM.split(' ');
              transform = `matrix(${a} ${b} ${c} ${d} ${converterDpi(
                e
              )} ${converterDpi(f)})`;
            }

            if (hScale) {
              transform = `${transform} matrix(${hScale}, 0, 0, 1, ${
                (1 - hScale) * textCodePoint.x
              }, 0)`;
            }
            svgTxt.setAttribute('transform', transform);
            if (isAxialShd && defaultFillColor) {
              svgTxt.setAttribute('fill', defaultFillColor);
            } else {
              defaultStrokeColor &&
                svgTxt.setAttribute('fill', defaultStrokeColor);
              defaultFillColor && svgTxt.setAttribute('fill', defaultFillColor);
              defaultFillOpacity &&
                svgTxt.setAttribute('fill-opacity', `${defaultFillOpacity}`);
            }
            svgTxt.setAttribute(
              'style',
              `font-weight: ${weight};font-size:${size}px;font-family: ${getFontFamily(
                fontObj as Res
              )};`
            );

            svg.appendChild(svgTxt);
          }
        }

        const width = boundary.width;
        const height = boundary.height;
        const left = boundary.left;
        const top = boundary.top;
        svg.setAttribute(
          'style',
          `overflow:hidden;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;`
        );
        if (content) {
          content.appendChild(svg);
        }
      }
    );
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
      transform = `matrix(${a} ${b} ${c} ${d} ${converterDpi(e)} ${converterDpi(
        f
      )})`;
    }
    // if (compositeObjectCTM) {
    //   transform = `${transform} matrix(${compositeObjectCTM.a} ${
    //     compositeObjectCTM.b
    //   } ${compositeObjectCTM.c} ${compositeObjectCTM.d} ${converterDpi(
    //     compositeObjectCTM.e
    //   )} ${converterDpi(compositeObjectCTM.f)})`;
    // }
    if (hScale) {
      transform = `${transform} matrix(${hScale}, 0, 0, 1, ${
        (1 - hScale) * textCodePoint.x
      }, 0)`;
    }
    text.setAttribute('transform', transform);

    if (isAxialShd && defaultFillColor) {
      text.setAttribute('fill', defaultFillColor);
    } else {
      defaultStrokeColor && text.setAttribute('fill', defaultStrokeColor);
      defaultFillColor && text.setAttribute('fill', defaultFillColor);
      defaultFillOpacity &&
        text.setAttribute('fill-opacity', `${defaultFillOpacity}`);
    }
    text.setAttribute(
      'style',
      `font-weight: ${weight};font-size:${size}px;font-family: ${getFontFamily(
        fontObj as Res
      )};`
    );
    svg.appendChild(text);
  }
  const width = boundary.width;
  const height = boundary.height;
  const left = boundary.left;
  const top = boundary.top;
  svg.setAttribute(
    'style',
    `overflow:hidden;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;`
  );
  // svg.innerText = String(TextCode);
  if (content) {
    content.appendChild(svg);
  }
};

export default renderTextObject;
