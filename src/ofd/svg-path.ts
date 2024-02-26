import { ResultData, LayerPageBlock } from '../core/ofd-core/index.d';

import {
  formatSTBox,
  converterDpi,
  parseColor,
  getDrawParam,
  parseCtm,
  parseAbbreviatedData
} from './ofd-utils';

const renderPathObject = function (
  pathObject: LayerPageBlock & { [k: string]: any },
  data: ResultData,
  content: HTMLElement,
  drawLineWidth?: number,
  drawFillColor?: string,
  drawStrokeColor?: string,
  isStampAnnot?: boolean,
  compositeObjectAlpha?: any,
  compositeObjectBoundary?: any,
  compositeObjectCTM?: any
  //   isStampAnnot,
  //   compositeObjectAlpha,
  //   compositeObjectBoundary,
  //   compositeObjectCTM
) {
  let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('version', '1.1');
  const {
    Boundary,
    AbbreviatedData,
    CTM,
    LineWidth: lineWidth,
    DrawParam: pathDrawParam
  } = pathObject;
  if (!Boundary) return svg;
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
    path.setAttribute(
      'transform',
      `matrix(${a} ${b} ${c} ${d} ${converterDpi(e)} ${converterDpi(f)})`
    );
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
            stop.setAttribute(
              'style',
              `stop-color:${parseColor(
                segment['Color']['Value']
              )};stop-opacity:1`
            );
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
            stop.setAttribute(
              'style',
              `stop-color:${parseColor(
                segment['Color']['Value']
              )};stop-opacity:1`
            );
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
  } else {
    path.setAttribute(
      'fill',
      `${isStampAnnot ? 'none' : defaultFillColor ? defaultFillColor : 'none'}`
    );
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
      path.setAttribute(
        'stroke-dasharray',
        `${converterDpi(dashs[0])},${converterDpi(dashs[1])}`
      );
    }
    path.setAttribute('stroke-dashoffset', `${converterDpi(offset)}px`);
  }
  if (AbbreviatedData?.text) {
    const abbreviatedData = parseAbbreviatedData(
      AbbreviatedData.text
    ) as string;
    path.setAttribute('d', abbreviatedData);
  }
  svg.appendChild(path);
  let width = isStampAnnot ? boundary.width : Math.ceil(boundary.width);
  let height = isStampAnnot ? boundary.height : Math.ceil(boundary.height);
  let left = boundary.left;
  let top = boundary.top;
  svg.setAttribute(
    'style',
    `overflow:hidden;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;`
  );
  if (compositeObjectBoundary) {
    let comSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    comSvg.setAttribute('version', '1.1');

    // let width = Math.ceil(boundary.width);
    // let height = Math.ceil(boundary.height);
    // let left = boundary.left;
    // let top = boundary.top;
    comSvg.setAttribute(
      'style',
      `overflow:hidden;position:absolute;width:${width}px;height:${height}px;left:${left}px;top:${top}px;`
    );
    if (compositeObjectCTM) {
      const ctms = parseCtm(compositeObjectCTM);
      if (ctms) {
        svg.setAttribute(
          'transform',
          `matrix(${ctms[0]} ${ctms[1]} ${ctms[2]} ${ctms[3]} ${converterDpi(
            ctms[4]
          )} ${converterDpi(ctms[5])})`
        );
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

export default renderPathObject;
