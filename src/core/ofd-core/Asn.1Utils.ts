import { Asn1 } from '../../lib/asn1';
import { ASN1Tag } from '../../lib/asn1/Asn.1';
import Stream from '../../lib/asn1/Stream';

interface ASN1 {
  tagLen: number;
  tag: ASN1Tag;
  stream: Stream;
  header: number;
  length: number;
  value: string;
  tagName: string;
  sub: ASN1[] | undefined | null;
}
// asn.1 节点标识相当于 xml element
export const STATIC_TAG_SEQUENCE = 'SEQUENCE';
// asn.1 节点标识相当于 xml element

export const STATIC_TAG_OCTET_STRING = 'OCTET_STRING';

export const STATIC_TAG_IA5STRING = 'IA5String';

//INTEGER
export const STATIC_TAG_INTEGER = 'INTEGER';

/**
 * utf8 string 转Uint8Array
 * @param str
 * @returns
 */
export function toUint8Arr(str: string) {
  const buffer = [];
  for (let i of str) {
    const _code = i.charCodeAt(0);
    if (_code < 0x80) {
      buffer.push(_code);
    } else if (_code < 0x800) {
      buffer.push(0xc0 + (_code >> 6));
      buffer.push(0x80 + (_code & 0x3f));
    } else if (_code < 0x10000) {
      buffer.push(0xe0 + (_code >> 12));
      buffer.push(0x80 + ((_code >> 6) & 0x3f));
      buffer.push(0x80 + (_code & 0x3f));
    }
  }
  return Uint8Array.from(buffer);
}

function loopAsn1(sub: ASN1[]): ASN1[] | undefined {
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
  static asn1ESealHeader: ASN1;
  static asn1ESealEsID: ASN1;
  static asn1ESealPictureInfo: ASN1;
  static asn1ESealExtDatas: ASN1;
  static asn1ESealProperty: ASN1;
  asn1: string;
  static pricuteInfo: {
    data: Uint8Array | null | string;
    type: string;
    width: string;
    height: string;
  } = {
    data: null,
    type: '',
    width: '',
    height: ''
  };
  constructor(str: string) {
    this.asn1 = str;
    this.init();
  }

  init() {
    try {
      // 参考 [电子密码规范](http://c.gb688.cn/bzgk/gb/showGb?type=online&hcno=EBF1360C272E40E7A8B9B32ED0724AB1)
      const asn1 = Asn1.decode(this.asn1, 0);
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
          sub: loopAsn1(asn1.sub as ASN1[])
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
    } catch (e) {
      console.error('Cannot decode string. :', e);
    }
  }
  decodeUTCTime(str: string) {
    let strs = str.replace('Unrecognized time: ', '');
    // const UTC = strs.indexOf('Z') > 0;
    strs = strs.replace('Z', '');
    strs = strs.substring(0, 1) < '5' ? '20' + strs : '19' + strs;
    return strs;
  }
  parsePricuter(ans: ASN1) {
    if (ans?.sub?.length) {
      // 图片类型
      Asn1Parse.pricuteInfo.type = ans?.sub[0].value;
      // 图片数据
      if (ans.sub[1].stream) {
        // 获取 Uint8Array
        const unit8arrs = ans.sub[1].stream.enc as Uint8Array;
        const bytes = unit8arrs.subarray(
          ans.sub[1].stream.pos + ans.sub[1].header,
          ans.sub[1].stream.pos + ans.sub[1].header + ans.sub[1].length
        );
        // console.log(toUint8Arr(hex));
        Asn1Parse.pricuteInfo.data = bytes;
      }
      // 图片宽度
      Asn1Parse.pricuteInfo.width = ans?.sub[2].value;
      // 图片高度
      Asn1Parse.pricuteInfo.height = ans?.sub[3].value;
    }
  }

  getPicture(): {
    type: string;
    data: Uint8Array;
    width: string;
    height: string;
  } | null {
    if (Asn1Parse.pricuteInfo && Asn1Parse.pricuteInfo.data) {
      return Asn1Parse.pricuteInfo as {
        type: string;
        data: Uint8Array;
        width: string;
        height: string;
      };
    }
    return null;
  }
}

export default Asn1Parse;
