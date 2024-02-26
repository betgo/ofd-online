# Page 结构

## Area

### CT_PageArea

定义该页面页面区域的大小和位置，仅对该页有效，该节点不出现时只使用模版页中的定义，如果模版页不存在或模版页中没有定义页面区域，则使用文件CommonData中的定义

## Template

该页使用的模版页，模版页的内容结构和普通页相同，定义在CommonData指定的XMl文件中。一个页可以使用多个模版页。该节点使用时通过TemplateID来引用具体的模版，并通过ZOrder属性来控制模版在页面中的呈现顺序。
注：在模版页内的内容描述中该属性无效

### TemplatePage

#### ID 模版标识

#### BaseLoc 指向模版页内容描述文件

#### Name 模版页名称

#### ZOrder 模版页的默认图层类型

其类型描述和呈显顺序与Layer中Type的描述和处理一致，见表15，如果页面引用的多个模版的此属性相同，则应根据引用的顺序来显示，先引用者先绘制 默认Background

1. Body 正文层
2. Foreground 前景层
3. Background 背景层

## PageRes

页资源，指向该页使用的资源文件

## Content

页面内容描述，该节点不存在时表示空白页

## Actions

与页面关联的动作，事件类型应为PO（页面打开动作）