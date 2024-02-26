import { Element } from 'xml-js';
import OFDElement from '../OFDElement';
// import PagesXml from '../Pages/PageXml';
import { NameREG } from '../utils';
import Asn1Utils from '../Asn.1Utils';

// import DocumentResXml from './DocumentResXml';
// import PublicResXml from './PublicResXml';
// import { OFD_Q } from '../constant';
import { Seal, Signature, Signatures, SignedInfo } from '../index.d';

class SignaturesXml extends OFDElement {
  static fileName: string;

  static Signatures: Signatures[];
  //  Doc_0/Signs/Signatures.xml 文件夹路径
  signedPath: string;

  constructor(fileName: string) {
    super();
    SignaturesXml.Signatures = [];
    SignaturesXml.fileName = fileName;
    // 获取 Doc_0/Signs/Signatures.xml 文件夹
    this.signedPath = fileName.substring(0, fileName.lastIndexOf('/') + 1);
    this.getSignatures();
  }

  getDocumentRes() {
    // const res = this.getOFDElements(DocumnetXml.fileName, 'DocumentRes');
    // if (res && res.elements) {
    //   return new DocumentResXml(res.elements);
    // }
    // return null;
  }

  getPublicRes() {
    // const res = this.getOFDElements(DocumnetXml.fileName, 'PublicRes');
    // if (res && res.elements) {
    //   return new PublicResXml(res.elements);
    // }
    return null;
  }

  getSeal(filePath: string) {
    const result: Seal = {};
    const SealInfo = new Asn1Utils(OFDElement.OFDElements[filePath] as string);
    const pictureInfo = SealInfo.getPicture();
    if (pictureInfo) {
      result.picture = { ...pictureInfo };
    }
    return result;
  }

  getSignedInfo(signedInfoElement: Element[]): SignedInfo {
    const result: SignedInfo = {};
    for (let item of signedInfoElement) {
      const { name, attributes, elements } = item;
      if (name) {
        const simpleName = name.replace(NameREG, '');
        // 特殊处理 StampAnnot
        if (simpleName === 'StampAnnot' && attributes) {
          if (!result.StampAnnot) {
            result.StampAnnot = [];
          }
          result.StampAnnot.push({
            ...attributes
          });
          continue;
        }
        if (simpleName === 'Provider' && attributes) {
          result.Provider = { ...attributes };
          continue;
        }
        if (
          (simpleName === 'SignatureMethod' ||
            simpleName === 'SignatureDateTime') &&
          elements
        ) {
          result[simpleName] = String(elements[0].text);
          continue;
        }
        if (simpleName === 'References') {
          result.ReferencesCheckMethod = String(
            attributes?.CheckMethod || 'MD5'
          );
          if (elements?.length) {
            if (!result.References) {
              result.References = [];
            }
            elements.forEach(reference => {
              const FileRef = String(reference.attributes?.FileRef || '');
              if (reference.elements?.length) {
                const CheckValueElement = reference.elements.find(
                  ritem => ritem.name === this.OFDCommonQName('CheckValue')
                );
                if (CheckValueElement?.elements?.length) {
                  result.References?.push({
                    FileRef,
                    CheckValue: String(CheckValueElement?.elements[0].text)
                  });
                }
              }
            });
          }
        }
        // if (
        //   simpleName === 'Seal' &&
        //   elements &&
        //   elements[0].name === this.OFDCommonQName('BaseLoc')
        // ) {
        //   const sealLoc = elements[0].elements
        //     ? String(elements[0].elements[0].text)
        //     : '';
        //   console.log('sealLoc:', sealLoc);
        //   result.Seal = this.getSeal(sealLoc.replace(/^\//, ''));
        // }
      }
    }
    return result;
  }

  getSignature(filePath: string) {
    const res = this.getOFDElements(filePath, 'Signature');
    if (res?.elements) {
      const result: Signature = {};
      for (let item of res?.elements) {
        const { name, elements } = item;
        if (name && elements?.length) {
          const simpleName = name?.replace(NameREG, '');
          if (simpleName === 'SignedValue') {
            result.SignedValueLoc = String(elements[0]?.text || '');
            if (!result.SignedInfo) {
              result.SignedInfo = {};
            }
            // 此路径可能为 相对路径
            const currentPath = filePath.substring(
              0,
              filePath.lastIndexOf('/') + 1
            );
            result.SignedInfo.Seal = this.getSeal(
              currentPath +
                result.SignedValueLoc.replace(
                  new RegExp(currentPath),
                  ''
                ).replace(/^\//, '')
            );
          }
          if (simpleName === 'SignedInfo') {
            if (!result.SignedInfo) {
              result.SignedInfo = {};
            }
            Object.assign(result.SignedInfo, this.getSignedInfo(elements));
          }
        }
      }
      return result;
    }
    return null;
  }

  /**
   * 获取文档区域坐标
   * @returns
   */
  getSignatures() {
    const res = this.getOFDElements(SignaturesXml.fileName, 'Signatures');
    if (res && res.elements) {
      const SignaturesElements = res.elements;
      SignaturesElements.forEach(item => {
        if (item?.name) {
          const { name, attributes } = item;
          const simpleName = name.replace(NameREG, '');
          if (simpleName === 'Signature' && attributes?.BaseLoc) {
            // 获取Signature xml文件
            const { ID, Type, BaseLoc } = attributes as {
              ID: string;
              Type: string;
              BaseLoc: string;
            };
            // 此路径可能为 相对路径
            const signedInfo = this.getSignature(
              this.signedPath +
                BaseLoc.replace(new RegExp(this.signedPath), '').replace(
                  /^\//,
                  ''
                )
            );
            if (!SignaturesXml.Signatures) {
              SignaturesXml.Signatures = [];
            }
            SignaturesXml.Signatures.push({
              ID,
              Type,
              BaseLoc,
              Signature: signedInfo
            });
          }
        }
      });
      if (SignaturesXml.Signatures?.length) {
        // 组装成方便遍历的数据，{[id:pageid]:info}
        const result: { [key: string]: Signatures[] } = {};
        SignaturesXml.Signatures.forEach(item => {
          const { Signature } = item;
          if (Signature?.SignedInfo?.StampAnnot?.length) {
            const StampAnnot = Signature.SignedInfo.StampAnnot.map(sa => ({
              ...sa
            }));
            StampAnnot.forEach(cItem => {
              if (cItem?.PageRef) {
                if (!result[cItem.PageRef]) {
                  result[cItem.PageRef] = [];
                }
                const newItem = {
                  ...item,
                  Signature: {
                    ...item.Signature,
                    SignedInfo: {
                      ...item.Signature?.SignedInfo,
                      StampAnnot: item.Signature?.SignedInfo?.StampAnnot?.map(
                        sa => ({ ...sa })
                      )
                    }
                  }
                };
                if (newItem.Signature?.SignedInfo?.StampAnnot?.length) {
                  newItem.Signature.SignedInfo.StampAnnot = StampAnnot.filter(
                    sItem => sItem.PageRef === cItem.PageRef
                  );
                }
                result[cItem.PageRef].push({
                  ...newItem
                });
              }
            });
          }
        });

        OFDElement.Signatures = SignaturesXml.Signatures;
        OFDElement.PageSignatures = result;
      }
    }
    return null;
  }
}

export default SignaturesXml;
