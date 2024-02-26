# ofd-online

## 更新说明

1. 1.0.0 ofd项目初始化


## ofd-online 文挡结构

| 名称                                | 说明                                                          |
| :---------------------------------- | :------------------------------------------------------------ |
| OFD.xml                             | 文档主入口文件，一个包内有且只有一个 OFD.xml,此文件名不可修改 |
| Doc_N                               | 第 N 个文档的文件夹                                           |
| Doc_N/Documnet.xml                  | 文档的根节点                                                  |
| Doc_N/PublicRes.xml                 | 文档公共资源索引                                              |
| Doc_N/DocumnetRes.xml               | 文档自身资源索引                                              |
| Doc_N/Pages                         | 文档的分页文件夹                                              |
| Doc_N/Pages/Page_N                  | 第 N 页文件夹                                                 |
| Doc_N/Pages/Page_N/Content.xml      | 第 N 页描述文件                                               |
| Doc_N/Signs                         | 数字签名存储目录                                              |
| Doc_N/Signs/Signatures.xml          | 签名列表文件                                                  |
| Doc_N/Signs/Signs_N                 | 第 N 个数字签名存储目录                                       |
| Doc_N/Signs/Signs_N/Signature.xml   | 签名/签章描述文件                                             |
| Doc_N/Signs/Signs_N/Seal.esl        | 电子印章文件                                                  |
| Doc_N/Signs/Signs_N/SignedValue.dat | 签名值文件                                                    |
| Doc_N/Res                           | 资源文件夹                                                    |

## ofd 使用

全新 OFD 文档解析,使用 jszip+xml-js 解压 ofd 文件，以及对 ofd 文件 xml 解析
抛出方法 {getSVGDoms , OFDParse}

1. 参数说明

| name        | 类型        | 是否必填 | 默认值 | 描述                                            |
| ----------- | ----------- | -------- | ------ | ----------------------------------------------- |
| file        | url 或 File | 必填     | 无     | ofd 文件对象或者 url 地址                       |
| screenWidth | number      | 否       | 无     | ofd 渲染宽度，未传默认浏览器 mm 转 px。1:1 大小 |
| id          | string      | 否       | 无     | dom 节点 id                                     |
| content     | Element     | 否       | 无     | dom 节点，PS:id 和 content 传入一项即可         |
| requestData | object      | 否       | 无     | 请求 ofd 文件接口自定义参数                     |

```javascript
// xml 文件预览
    import {XMLRender} from 'ofd-online';
    // 返回Promise 兼容老的API回调success和fail 但不建议使用

    XMLRender({
        file:File|url,
        content:Element,
    }).then(e:Element=>{

    })
    // PS id和content参数只能使用一个
    XMLRender({
        file:File|url,
        id:'test',
    }).then(e:Element=>{

    })
```

```javascript
    import {getSVGDoms} from 'ofd-online';
    // 返回Promise 兼容老的API回调success和fail 但不建议使用

    getSVGDoms({
        file:File|url,
        content:Element,
    }).then(e:Element=>{

    })
    // PS id和content参数只能使用一个
    getSVGDoms({
        file:File|url,
        id:'test',
    }).then(e:Element=>{

    })
```

```javascript

    import {OFDParse} from 'ofd-online';
    // 返回Promise 兼容老的API回调success和fail 但不建议使用
    interface ResultData {
        Pages: Page[] | null;
        Res: Res[] | null;
        DocumnetResRoot: string;
        PublicResRoot: string;
        Tpls: { [k: string]: Page[] } | null;
        STLoc: string;
        OFDElements: { [key: string]: Element };
        PageArea: null | CT_PageArea;
        ResImages?: Res[] | null;
        Signatures?: Signatures[] | null;
        PageSignatures?: null | { [k: string]: Signatures[] };
    }
    OFDParse({
        file:File|url,
    }).then(r:ResultData=>{

    })
```
