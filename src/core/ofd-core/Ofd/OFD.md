# OFD.xml 文件描述

## Version

必填 xs:string 文件格式的版本号，取值为“1.0”

## DocType

必须 xs:string 文件格式子集类型，取值为“OFD”，表明此文件符合本标准。取值为“OFD-A”，表明此文件符合OFD存档规范

## DocBody

必填 文件对象入口，可以存在多个，以便在一个文档中包含多个板式文档

### DocInfo

必填 CT_DocInfo 文档元数据信息描述，文档元数据信息具体结构见图 CT_DocInfo.km

#### DocID
 
可选 xs:string 采用UUID算法生成的由32个字符组成文件标识。每个DocID在文档创建或生成的时候进行分配

#### Title

可选 xs:string 文档标题。标题可以与文件名不同

#### Author

可选 xs:string 文档作者

#### Subject

可选 xs:string 文档主题

#### Abstract

可选 xs:string 文档摘要与注释

#### CreationDate

可选 xs:date 文档创建日期

#### ModDate

可选 xs:date 文档最近修改日期

#### DocUsage

可选 xs:string 文档分类，默认值Normal，可取值如下：

1. Normal ----- 普通文档
2. EBook ----- 电子书
3. ENewsPaper ----- 电子报纸
4. EMagzine ----- 电子期刊杂志

#### Cover 

可选 ST_Loc 文档封面，此路径指向一个图片文件

#### Keywords

关键词集合，每个关键词用1个“Keyword”子节点表达

##### Keyword

必填 xs:string 关键词

#### Creator
 
可选 xs:string 创建文档的应用程序

#### CreatorVersion

可选 xs:string 创建文档的应用程序的版本信息

#### CustomDatas

用户自定义元数据集合，其子节点为CustomData

##### CustomData

必选 xs:string 用户定义元数据集合，可以指定用一个名称及其对应的值

###### Name

必选 xs:string 用户自定义元数据名称

### DocRoot

可选 ST_Loc 指向文档根节点，有关文档跟节点描述见7.5

### Versions

包含多个版本描述节点，用于定义文件因注释和其他改动产生的版本信息，见第19章

### Signatures

可选 ST_Loc 指向该文档中签名和签章结构，见第18章

