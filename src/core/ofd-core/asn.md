# ASN.1 说明

Abstract Syntax Notation One，抽象语法标记，ASN.1是描述数据格式的标准方法，它不管语言是如何执行、这些数据具体指什么、用什么类型的编码规则，是一种抽象的语法

ASN.1由两部分组成：

一部分描述信息内数据，数据类型及序列格式
另一部分描述如何将各部分组成消息

## 语法

### 例如

```C++
 Report ::= SEQUENCE {
author OCTET STRING,
title OCTET STRING,
body OCTET STRING,
biblio Bibliography
} 
```

### Report是结构体名称

1. SEQUENCE表示消息是由许多数据单元构成的
2. 中括号{}里面是各种类型的数据单元
3. 前三个数据单元author/title/body的类型是OCTET STRING
4. 最后一个数据单元biblio的类型是另一个ASN.1结构体

``` C++
Bibliography ::= SEQUENCE {
author OCTET STRING
title OCTET STRING
publisher OCTET STRING
year OCTET STRING
}  
```

## 数据类型

| 类型                          | 含义       |
| ----------------------------- | ---------- |
| NULL                          | 空         |
| BOOLEAN                       | 布尔类型   |
| INTEGER                       | 整型       |
| REAL                          | 实数类型   |
| BIT STRING                    | 比特串     |
| OCTEC STRING                  | 字节串     |
| OBJECT IDENTIFIER             | 实体标识符 |
| ENUMERATED                    | 枚举类型   |
| SEQUENCE                      | 序列       |
| SEQUENCE OF                   | 类型的序列 |
| SET                           | 集合       |
| SET OF                        | 类型的集合 |
| CHOICE                        | CHOICE类型 |
| …STRING（有很多就不一一列举） | 字符串类型 |
| UTCTime                       | 时间类型   |
| GeneralizedTime               | 时间类型   |


