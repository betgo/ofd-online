
# Signatures

签名节点

## MaxSignId

xs:ID 可选 安全标识的最大值,作用与文档人口文件Document. xml中的MaxID相同,为了避免在签名时影响文档入口文件,采用了与ST, _ID不一样的ID编码方式。推荐使用“sNNN”的编码方式,NNN从1开始

## Signature

 数字签名或安全签章在列表中的注册信息,一次签名或签章对应一个

### ID

xs:ID 必选 签名或签章的标识

### Type

xs:string 可选 签名节点的类型,目前规定了两个可选值,Seal表示是安全签章,Sign表示是纯数字签名

### BaseLoc

ST_Loc 必选 指向包内的签名描述文件
