# OFD 文档结构说明

## ofd.xml

### ofd.xml 文件主入口属性说明

| 名称       | 类型       | 说明                                                                                | 备注 |
| ---------- | ---------- | ----------------------------------------------------------------------------------- | ---- |
| Version    | xs:string  | 文件格式版本号，取值为 1.0                                                          | 必填 |
| DocType    | xs:string  | 文件格式子集类型，取值为“OFD”表明此文档符合标准，取值为“OFD-A”表明符合 OFD 存档规范 |
| DocBody    |            | 文件对象入口，可以存在多个。以便在一个文档中存在多个版式文档                        | 必选 |
| DocInfo    | CT_DocInfo | 文档元数据信息描述，文档元数据信息描述如[文档元数据属性描述](#文档元数据属性描述)   | 必选 |
| DocRoot    | ST_Loc     | 指向文档根节点文档，                                                                | 可选 |
| Versions   |            | 包含多个版本描述节点，用于定义文件因注释或修改产生的版本信息                        | 可选 |
| Singnature | ST_Loc     | 指向给文档中签名和签章结构                                                          | 可选 |

### 文档元数据属性描述

| 名称           | 类型      | 说明                                                                                                         | 备注 |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------ | ---- |
| DocID          | xs:string | 采用 UUID 算法生成的由 32 位字符组成文件标识，每个 DocId 在文档创建或生产的时候分配                          | 可选 |
| Title          | xs:string | 文档标题，标题可与文件名不同                                                                                 | 可选 |
| Author         | xs:string | 文档作者                                                                                                     | 可选 |
| Subject        | xs:string | 文档主题                                                                                                     | 可选 |
| Abstract       | xs:string | 文档摘要和注释                                                                                               | 可选 |
| CreationDate   | xs:string | 文档创建日期                                                                                                 | 可选 |
| ModDate        | xs:string | 文档最近修改日期                                                                                             | 可选 |
| DocUsage       | xs:string | 文档分类，可取值（Normal—普通电子文档（default）；Ebook—电子书；ENewsPaper—电子报纸；EMagzine—电子期刊杂志） | 可选 |
| Cover          | ST_Loc    | 文档封面，此路径指向一个图片文件                                                                             | 可选 |
| keywords       |           | 关键词集合，每一个关键词用一个 Keyword 子节点表示                                                            | 可选 |
| Keyword        | xs:string | 关键词                                                                                                       | 必选 |
| Creator        | xs:string | 创建文档应用程序                                                                                             | 可选 |
| CreatorVersion | xs:string | 创建文档应用程序版本                                                                                         | 可选 |
| CustomDatas    |           | 用户自定义元数据集合，其子节点为 CustomData                                                                  | 可选 |
| CustomData     | xs:string | 用户自定义元数据，可以指定一个名称和对应的值                                                                 | 必选 |
| Name           | xs:string | 用户自定义元数据名称                                                                                         | 必选 |

### 文档根节点
