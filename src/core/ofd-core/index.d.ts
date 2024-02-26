import { type } from 'os';
import { Element } from 'xml-js';

/**
 * 自定义 字符串
 * @example
 *
 */
type XSString = string;

/**
 * boolean 类型
 */
type XSBoolean = string;

/**
 * Number 类型 包含 double 以及 int
 */
type XSNumber = string;

/**
 * Date 类型
 */
type XSDate = string;

/**
 * 包结构内文件路径，“.”表示当前路径，“..”表示父路径。
 * 约定：
 *  1、“/”代表根节点
 *  2、未显示指定时代表当前路径
 *  3、路径区分大小写
 * @example
 *  "Pages/P1/Content.xml"
 *  "./Res/Book1.jpg"
 */
type ST_Loc = string;

/**
 * 数组，以空格来分割元素。元素可以是除 ST_Loc、ST_Array外的数据类型，不可嵌套
 * @example
 * "0 25 27 0 3.8"
 */
type ST_Array = string;

/**
 * 标识，无符号整数，应在文档内唯一，0表示无符号标识
 * @example
 *  "1000"
 */
type ST_ID = string;

/**
 * 标识引用，无符号整数，此标识应为文档内已定义的标识
 * @example
 *  "1000"
 */
type ST_RefID = string;

/**
 * 点坐标(x,y)，以空格分割，前者为X值，后者为Y值，可以是浮点型或者整数
 * @example
 *  "0 0"
 */
type ST_Pos = string;

/**
 * 矩形区域，以空格分割，前两个值代表了该矩形左上角坐标，
 * 后两个值依次表示该矩形宽和高，可以是整数或者浮点型。后两个值应大于0
 * @example
 *  "0 0 10 10"
 */
type ST_Box = string;

/**
 * 页面物理区域，左上角的坐标为页面空间坐标系的原点
 * @example
 * "0 0 210 297"
 */
type PhysicalBox = ST_Box;

/**
 * 显示区域，页面内容实际显示或者打印输出的区域，位于页面物理区域内，包含页眉、页脚、版心等内容
 * [例外处理]如果显示区域不完全位于页面物理区域内，页面物理区域外的部分则会忽略。
 *  如果显示区域完全位于页面物理区域外，则该页面为空白
 * @example
 * "0 0 13 14"
 */
type ApplicationBox = ST_Box;

/**
 * 版心区域，即文件的正文区域，位于显示区域内。左上角坐标决定了其在显示区域内的位置
 * [例外处理] 如果版心区域不完全位于显示区域内，显示区域外的部分则被忽略。
 * 如果版心区域完全位于显示区域外，则版心内容不被绘制
 * @example
 * "0 0 10 10"
 */
type ContentBox = ST_Box;

/**
 * 出血区域，即超出设备性能限制的额外出血区域，位于页面物理区域外。
 * 不出现时，默认值为页面物理区域
 * [例外处理]如果出血区域不完全位于页面物理区域外，页面物理区域内部分则被忽略。
 * 如果出血区域完全位于页面物理区域内，则出血区域无效
 */
type BleedBox = ST_Box;

/**
 * 当前文档中所有对象使用标识的最大值，初始值为0。
 * MaxUnitID主要用于文档编辑，在向文档中新增一个对象时，需要分配一个新的标识，
 * 新标识取值宜为MaxUnitID + 1，同时需要修改此MaxUnitID值
 * @example
 * "1"
 */
type MaxUnitID = ST_ID;

/**
 * 公共资源序列，每个节点指向OFD包内一个资源描述文档， 资源描述 详见7.9
 * 字型和颜色空间等宜在公共资源文件中描述
 */
type PublicRes = ST_Loc;

/**
 * 文档资源序列，每个节点指向OFD包内的一个资源描述文档，资源描述详见7.9，
 * 绘制参数、多媒体和矢量图像等宜在文档资源文件描述
 */
type DocumentRes = ST_Loc;

/**
 * 引用在资源文件中定义的颜色空间标识，有关颜色空间的描述见8.3.1.
 * 如果此项不存在，则采用RGB作为默认颜色空间
 */
type DefaultCS = ST_RefID;

/**
 * 模版属性
 * @param  ID 必须 模版页标识，不能与已有标识重复
 * @param BaseLoc 必须 指向模版内容描述文件
 * @param Name 模版页名称
 * @param ZOrder 模版页的默认图层类型，其类型描述和呈现顺序与Layer中Type的描述和处理一致 见表15
 * 如果页面引用的多个模版的此属性相同，则应根据引用顺序来显示，先引用者先绘制
 * 默认值为 Background
 */
interface CT_TemplatePage {
  ID: ST_ID;
  BaseLoc: ST_Loc;
  Name?: XSName;
  ZOrder?: XSName;
}

/**
 * 模版序列，为一系列模版页面集合。模版页内容结构和普通页面相同，描述见7.7
 */
type TemplatePage = CT_TemplatePage;

/**
 * 页面区域属性,指定该文档页面区域位置和大小
 */
interface CT_PageArea {
  PhysicalBox: PhysicalBox;
  ApplicationBox?: ApplicationBox;
  ContentBox?: ContentBox;
  BleedBox?: BleedBox;
}

interface Template {
  TemplateID: string;
  ZOrder: string;
}

interface TextObject {
  Boundary: string;
  Font: string;
  ID: string;
  Size: string;
}

interface PathObject {
  Boundary: string;
  LineWidth: string;
  ID: string;
}

interface ImageObject {
  Boundary: string;
  CTM: string;
  ID: string;
  ResourceID: string;
}

/**
 * 页面结构
 * @param PageBlock 页面块 可以嵌套
 */
interface CT_PageBlock {
  PageBlock?: CT_PageBlock;
  ImageObject?: ImageObject;
  TextObject?: TextObject;
  PathObject?: PathObject;
  CompositeObject?: any;
  // TextObject:
}

/**
 * Layer 转换为JSON的类型
 */
type LayerPageBlockType =
  | 'ImageObject'
  | 'TextObject'
  | 'PathObject'
  | 'CompositeObject';

interface LayerPageBlock {
  Type: LayerPageBlockType;
}

/**
 * Type 取值 默认 "Body"
 * @param Body 正文层
 * @param Foreground 前景层
 * @param Background 背景层
 */
type LayerType = 'Body' | 'Foreground' | 'Background';

/**
 * 图层属性
 * @param Type 层类型描述
 * @param DrawParam 图层绘制参数，引用资源文件中定义的绘制参数标识
 */
interface CT_Layer {
  Type?: LayerType;
  DrawParam?: ST_RefID;
  PageBlock?: LayerPageBlock[] & { [k: string]: unknown }[];
}

/**
 *  资源数据
 * @param ID 必填 资源ID
 * @param Path 资源引用路径
 * @param Type 资源类型 "Image"|"Font"|"Movie"|"Sound"
 * @param Format 资源后缀
 * @param Elements Image DrawParam 额外参数
 */
interface Res {
  ID: string;
  Path?: string;
  Type?: string;
  Format?: string;
  Elements?: Element[];
  OFDType?: string;
  face?: string;
  Relative?: string;
  LineWidth?: string;
  FillColor?: CT_Color;
  StrokeColor?: CT_Color;
  FontName?: string;
  family?: string;
  dataBase?: string;
}

/**
 * 文字对象粗细值，可选值：100，200，300，400，500，600，700，800，900 默认400
 * @example
 * "400"
 */
type Weight =
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';

/**
 * 字形变换属性
 * @param CodePosition 必填 TextCode中字符编码的起私位置，从0开始
 * @param Glyphs 必填 变换后的字形索引列表
 * @param CodeCount 变换关系字符的数量，该数值应大于或等于1，否则属于错误描述，默认1
 * @param GlyphCount 变换关系中字形索引的个数，该数值应大于或等于1，否则属于错误描述，默认1
 */
interface CT_CGTransform {
  CodePosition: XSNumber;
  Glyphs: ST_Array;
  CodeCount?: XSNumber;
  GlyphCount?: XSNumber;
}
/**
 * 文字对象属性
 * @param Font 必填 引用资源文件中定义的字型的标识
 * @param Size 必填 字号 单位为毫米
 * @param TextCode 必填 文字内容，也就是一段字符编码串。
 * 如果字符编码不在XML编码方式，也应采用“\”加4位十六进制的格式转义；
 * 文字内容中出现的空格也需要转义。若TextCode作为占位符使用时，一律采用“”(u00A4)占位
 * @param Stroke 是否勾边 默认 false
 * @param Fill 是否填充 默认 true
 * @param HScale 字形水平方向的缩放比 默认1.0
 * 例如 HScale=0.5 表示实际显示的字宽为原来一半
 * @param ReadDirection 阅读方向，指定了文字排列方向，默认值为0。详见11.3
 * @param CharDirection 字符方向，指定文字放置的方式，默认值0。详见11.3
 * @param Weight 文字对象粗细值，可选值：100，200，300，400，500，600，700，800，900 默认400
 * @param Italic 是否是斜体样式 默认值false
 * @param FillColor 填充颜色 默认黑色
 * @param StorkeColor 勾边颜色 默认透明色
 * @param CGTransform 指定字符编码到字符索引之间的变换关系 具体见11.4
 */
interface CT_Text {
  Font: ST_RefID;
  Size: XSNumber;
  TextCode: XSString;
  Stroke?: XSBoolean;
  Fill?: XSBoolean;
  HScale?: XSNumber;
  ReadDirection?: XSNumber;
  CharDirection?: XSNumber;
  Weight?: Weight;
  Italic?: XSBoolean;
  FillColor?: CT_Color;
  StorkeColor?: CT_Color;
  CGTransform?: CT_CGTransform;
}

/**
 * 文字定位属性
 * @param X 第一个文字的字型原点在对象坐标系下的X坐标
 * 当X不出现，则采用上一个TextCode的X值，文字对象中的第一个TextCode的X属性必选
 * @param Y  第一个文字的字型原点在对象坐标系下的Y坐标
 * 当Y不出现，则采用上一个TextCode的Y值，文字对象中的第一个TextCode的Y属性必选
 * @param DeltaX double类型值队列，队列中的每个值代表后一个文字与前一个文字之间在X方向的偏移值
 * DeltaX 不出现时，表示文字绘制点在X方向不做偏移
 * @param DeltaY double类型值队列，队列中的每个值代表后一个文字与前一个文字之间在Y方向的偏移值
 * DeltaY 不出现时，表示文字绘制点在Y方向不做偏移
 */
interface TextCode {
  X?: XSNumber;
  Y?: XSNumber;
  DeltaX?: ST_Array;
  DeltaY?: ST_Array;
}

interface Page {
  Area: CT_PageArea;
  Content: null | CT_Layer[];
  Template?: Template;
  DrawParam?: any;
  Annot?: {
    Subtype?: string;
    FileLoc?: string;
    Appearance?: { Boundary: string; PageBlock: LayerPageBlock[] }[];
  };
  PageID: string;
}
/**
 * 复合对象基本属性
 * @param ResourceID 引用资源文件中定义的矢量图像标识
 */
interface CT_Composite {
  ResourceID: ST_RefID;
}

/**
 * 矢量图像属性
 * @param Width 必填 矢量图像的宽度，超出部分做剪裁处理
 * @param Height 必填 矢量图像的高度，超出部分做剪裁处理
 * @param Content 必填 内容矢量描述
 * @param Thumbnail 缩略图，指向包内图像资源
 * @param Substitution 替换图像，用于高分辩率输出时将缩略图替换为此高分辨率的图像，指向包内的图像文件
 */
interface CT_VectorG {
  Width: XSNumber;
  Height: XSNumber;
  Content: CT_PageBlock;
  Thumbnail?: ST_RefID;
  Substitution?: ST_RefID;
}

/**
 * 事件类型
 * @param DO 文档打开
 * @param PO 页面打开
 * @param CLICK 单击区域
 */
type Event = 'DO' | 'PO' | 'CLICK';

/**
 *  声明目标区域的描述方法
 * @param XYZ 目标区域由左上角位置（Left,Top）以及页面缩放比例（Zoom）确定
 * @param Fit 适合整个窗口区域
 * @param FitH 适合窗口宽度，目标区域仅由Top确定
 * @param FitV 适合窗口高度，目标区域仅由Left确定
 * @param FitR 适合窗口内的目标区域，目标区域为（Left、Top、Right、Bottom）所确定的矩形区域
 */
type DestType = 'XYZ' | 'Fit' | 'FitH' | 'FitV' | 'FitR';

/**
 * 目标区域属性
 * @param Type 必填 声明目标区域的描述方法
 * @param PageID 必填 引用跳转目标页面的标识
 * @param Left 目标区域左上角X坐标 默认0
 * @param Rigth 目标区域右下角x坐标
 * @param Top 目标区域左上角Y坐标 默认0
 * @param Bottom 目标区域右下角Y坐标
 * @param Zoom 目标区域页面缩放比例，为0或者不出现则按照当前缩放比例跳转，可取值范围[0.1 64.0]
 */
interface CT_Dest {
  Type: DestType;
  PageID: ST_RefID;
  Left?: XSNumber;
  Rigth?: XSNumber;
  Top?: XSNumber;
  Bottom?: XSNumber;
  Zoom?: XSNumber;
}

/**
 * 跳转属性
 * @param Dest 必填 跳转的目标区域
 * @param Bookmark 必填 跳转的目标书签
 * @param Name 必填 目标书签的名称，引用文档书签定义中的名称
 */
interface Goto {
  Dest: CT_Dest;
  Bookmark: unknown;
  Name: XSString;
}

/**
 * 附件动作属性
 * @param AttachID 必填 附件标识
 * @param NewWindow  是否在新窗口中打开
 */
interface GotoA {
  AttachID: XSString;
  NewWindow?: XSBoolean;
}

/**
 * URI动作属性
 * @param URI 必填 目标URI的位置
 * @param Base URI用于相对地址
 */
interface URI {
  URI: XSString;
  Base?: XSString;
}

/**
 * 播放音频动作属性
 * @param ResourcedID 必填 引用资源文件中音频资源标识
 * @param Volume 播放音量，取值范围[0~100] 默认100
 * @param Repeat 此音频是否需要循环播放，如果为true则Synchronous值无效 默认false
 * @param Synchronous 是否同步播放 true表示后续动作应等待此音频播放完毕后才能开始，
 * false表示立刻返回并开始下一个动作 默认false
 */
interface Sound {
  ResourcedID: ST_RefID;
  Volume?: XSNumber;
  Repeat?: XSBoolean;
  Synchronous?: XSBoolean;
}

/**
 * 放映参数
 * @param Play 播放
 * @param Stop 停止
 * @param Pause 暂停
 * @param Resume 继续
 */
type MoveOperator = 'Play' | 'Stop' | 'Pause' | 'Resume';

/**
 * 播放音频动作属性
 * @param ResourcedID 必填 引用资源文件中音频资源标识
 * @param Operator 放映参数 默认Play
 */
interface Movie {
  ResourcedID: ST_RefID;
  Operator?: MoveOperator;
}

/**
 * 移动属性
 * @param Point1 必填 移动后新的当前绘制点
 */
interface Move {
  Point1: ST_Pos;
}

/**
 * 线段属性
 * @param Point1 必填 线段的结束点
 */
interface Line {
  Point1: ST_Pos;
}

/**
 * 二次贝塞尔曲线属性
 * @param Point1 必填 二次贝塞尔曲线的控制点
 * @param Point2 必填 二次贝塞尔曲线的结束点，下一路径的起始点
 */
interface QuadraticBezier {
  Point1: ST_Pos;
  Point2: ST_Pos;
}

/**
 * 三次贝塞尔曲线
 * @param Point1 三次贝塞尔曲线的第一个控制点
 * @param Point2 三次贝塞尔曲线的第二个控制点
 * @param Point3 三次贝塞尔曲线的结束点，下一次路径的起始点
 */
interface CubicBezier {
  Point1?: ST_Pos;
  Point2?: ST_Pos;
  Point3: ST_Pos;
}

/**
 * 圆弧属性
 * @param EndPoint 必填 圆弧的结束点，下个路径的起始点。不能与当前的绘制起始点为同一位置
 * @param EllipseSize 必填 形如[200 100]的数组,2个正浮点数值依次对应椭圆的长、短轴长度，较大的一个为长轴
 * [异常处理]如果数组长度超过2,则只取前两个数值
 * [异常处理]如果数组长度为1,则认为这是一个圆,该数值为圆半径
 * [异常处理]如果数组前两个数值中有一个为0,或者数组为空,则圆弧退化为-条从当前点到EndPoint的线段
 * [异常处理]如果数组数值为负值,则取其绝对值
 * @param RotationAngle 必填 表示按EllipseSize绘制的椭圆在当前坐标系下旋转的角度,正值为顺时针,负值为逆时针
 * [异常处理]如果角度大于360° ,则以360取模
 * @param LargeArc 必填 是否是大圆弧，true表示此线型对应的为度数大于180°的弧,false表示对应度数小于180的弧。
 * 对于一个给定长、短轴的椭圆以及起始点和结束点,有一大一小两条圆弧，
 * 如果所描述线型恰好为180°的弧，则此属性的值不被参考，可由SweepDirection属性确定圆弧的形状
 * @param SweepDirection 必填 弧线方向是否为顺时针
 * true表示由圆弧起始点到结束点是顺时针旋转,false表示由圆弧起始点到结束点是逆时针旋转
 * 对于经过坐标系上指定两点,给定旋转角度和长短轴长度的椭圆，满足条件的可能有2个，对应圆弧有4条，
 * 通过LargeArc属性可以排除2条,由此属性从余下的2条圆弧中确定一条
 */
interface Arc {
  EndPoint: ST_Pos;
  EllipseSize: ST_Array;
  RotationAngle: XSNumber;
  LargeArc: XSBoolean;
  SweepDirection: XSBoolean;
}

/**
 * 区域属性
 * @param Start 必填 定义图形的起始坐标
 * @param Move 必填 从当前点移动到新的当前点
 * @param Line 必填 从当前点连接一条到指定点的线段，并将当前点移动到指定点
 * @param QuadraticBezier 必填 从当前点连接一条到Point2的二次贝塞尔曲线，并将当前点移动到Point2,
 * 此贝塞尔曲线使用Point1作为其控制点
 * @param CubicBezier 必填 从当前点连接一条到Point3的二次贝塞尔曲线，并将当前点移动到Point3,
 * 此贝塞尔曲线使用Point2作为其控制点
 * @param Arc 必填 从当前点连接到一条EndPoint点的圆弧，并将当前点移动到EndPoint点
 * @param Close 必填 自动闭合到当期分路径的起始点，并以该点为当前点
 */
interface CT_Region {
  Start: ST_Pos;
  Move: Move;
  Line: Line;
  QuadraticBezier: QuadraticBezier;
  CubicBezier: CubicBezier;
  Arc: unknown;
  Close: unknown;
}

/**
 * 动作属性
 */
interface CT_Action {
  Event: Event;
  Goto: Goto;
  URI: URI;
  GotoA: GotoA;
  Sound: Sound;
  Movie: Movie;
  Region?: CT_Region;
}

/**
 * 底纹
 * @param Width 必填 底纹单元的宽度
 * @param Height 必填 底纹单元的高度
 * @param CellContent 必填 底纹单元，用底纹填充目标区域时,所使用的单元对象
 * @param XStep X方向底纹单元间距, 默认值为底纹单元的宽度。若设定值小于底纹单元的宽度时，应按默认值处理.
 * @param YStep Y方向底纹单元间距,默认值底纹单元的高度。若设定值小于底纹单元的高度时,应按默认值处理
 * @param ReflectMethod 描述底纹单元的映像翻转方式,枚举值,默认值为Normal
 * @param RelativeTo 底纹单元起始绘制位置,默认值为Object 可取值如下
 * Page:相对于页面坐标系的原点
 * Object:相对于对象坐标系的原点
 * @param CTM 底纹单元的变换矩阵,用于某些需要对底纹单元进行平移旋转变换的场合，默认为单位矩阵;
 * 底纹呈现时先做XStep、YStep排列,然后-起做CTM处理
 * @param Thumbnail 引用资源文件中缩略图图像的标识
 */
interface CT_Pattern {
  Width: XSNumber;
  Height: XSNumber;
  CellContent: CT_PageBlock;
  XStep?: XSNumber;
  YStep?: XSNumber;
  ReflectMethod?: XSString;
  RelativeTo?: XSString;
  CTM?: ST_Array;
  Thumbnail?: ST_RefID;
}

/**
 * 轴向渐变
 * @param MapType 渐变绘制的方式，默认Direct 可选值为Direct、Repeat、Reflect
 * @param MapUnit 轴线一个渐变区间的长度,默认轴线长度 当MapType的值不等于Direct 时出现
 * @param Extend 轴线延长线方向是否继续绘制渐变。默认值0 可选值为0、1.2、3
 * 0:不向两侧继续绘制渐变
 * 1:在结束点至起始点延长线方向绘制渐变
 * 2:在起始点至结束点延长线方向绘制渐变
 * 3:向两侧延长线方向绘制渐变
 * @param Position 用于确定StartPoint和EndPoint中的各颜色的位置值,取值范围是[0，1.0],
 * 各段颜色的Position值应根据颜色出现的顺序递增
 * 第一个Segment的Position 属性默认值为0,最后一个Segment的Position属性默认值为1.0,
 * 当不存在时,在空缺区间内平均分配。举例:Segment个数等于2且不出现Position属性时,
 * 按照“0 1.0”处理;Segment个数等于3且不出现Position属性时,
 * 按照“00.5 1.0”处理; Segment个数等于5且不出现Position属性时,按照“00.250.5 0.75 1.0"处理
 * @param StartPoint 必填 轴线的起始点
 * @param EndPoint 必填 轴线的结束点
 * @param Segment 必填 颜色段,至少出现两个
 * @param Color 必填 该段的颜色,应是基本颜色
 */
interface CT_AxialShd {
  StartPoint: ST_Pos;
  EndPoint: ST_Pos;
  Segment: unknown;
  Color: CT_Color;
  MapType?: XSString;
  MapUnit?: XSNumber;
  Extend?: XSNumber;
  Position?: XSNumber;
}

/**
 * 径向渐变
 */
interface CT_RadialShd {}

/**
 * 高洛德渐变
 */
interface CT_GouraudShd {}

/**
 * 格构高洛德渐变
 */
interface CT_LaGouraudShd {}

/**
 * 颜色属性
 * @parma Value 颜色值,指定了当前颜色空间下各通道的取值。Value的取值应符合"通道1通道2通道3..."格式。
 * 此属性不出现时,应采用Index
 * 属性从颜色空间的调色板中的取值。当二者都不出现时,该颜色各通道的值全部为0
 * @param Index 调色板中颜色的编号,非负整数,将从当前颜色空间的调色板中取出相应索引的预定义颜色用来绘制。索引从0开始
 * @param ColorSpace 引用资源文件中颜色空间的标识 默认值为文档设定的颜色空间
 * @param Alpha 颜色透明度,在0~255之间取值。默认为255,表示完全不透明
 * @param Pattern 底纹填充，复杂颜色的一种。描述见8.3.3
 * @param AxialShd 轴向渐变,复杂颜色的一种。描述见8.3.4.2
 * @param RadialShd 径向渐变,复杂颜色的一种。描述见8.3.4.3
 * @param GouraudShd 高洛德渐变,复杂颜色的一种。描述见8.3.4.4
 * @param LaGouraudShd 格构高洛德渐变,复杂颜色的一种。描述见8.3.4.5
 */
interface CT_Color {
  Value?: ST_Array;
  Index?: XSNumber;
  ColorSpace?: ST_RefID;
  Alpha?: XSNumber;
  Pattern?: CT_Pattern;
  AxialShd?: CT_AxialShd;
  RadialShd?: CT_RadialShd;
  GouraudShd?: CT_GouraudShd;
  LaGouraudShd?: CT_LaGouraudShd;
}

/**
 * 图像对象属性
 * @param ResouseID 必填 引用资源文件中定义的多媒体的标识
 * @param Substitution 可替换图像,引用资源文件中定义的多媒体的标识,用于某些情况如高分辨率输出时进行图像替换
 * @param ImageMask 图像蒙版,引用资源文件中定义的多媒体的标识,用作蒙版的图像应是与ResoueID指向的图像相同大小的二值图
 * @param Border 图像边框设置
 * @param LineWidth 边框线宽,如果为0则表示边框不进行绘制默认值为0.353 mm
 * @param HorizonalCornerRadius 边框水平角半径默认值为0
 * @param VerticalCornerRadius 边框垂直角半径默认值为0
 * @param DashOffset 边框虚线重复样式开始的位置,边框的起始点位置为左上角,绕行方向为顺时针 默认值为0
 * @param DashPattern 边框虚线重复样式,边框的起始点位置为左上角,绕行方向为顺时针
 * @param BorderColor 边框颜色,有关边框颜色描述见8.3.2基本颜色默认为黑色
 */
interface CT_Image {
  ResouseID: ST_RefID;
  Substitution?: ST_RefID;
  ImageMask?: ST_RefID;
  Border?: Border;
  LineWidth?: XSNumber;
  HorizonalCornerRadius?: XSNumber;
  VerticalCornerRadius?: XSNumber;
  DashPattern?: ST_Array;
  BorderColor?: CT_Color;
}

/**
 * 字型属性
 * @param FontName 必填 字型名
 * @param FamilyName 字型族名，用于匹配替代字型
 * @param Charset 字型适用的字符分类，用于匹配替代字型。默认值unicode;可取值为 sysmbol、prc、big5、unicode等
 * @param Serif 是否是带衬线字型,用于匹配替代字型 默认值是false
 * @param Bold 是否是粗体字型,用于匹配替代字型 默认值是false
 * @param Italic 是否是斜体字型,用于匹配替代字型 默认值是false
 * @param FixedWidth 是否是等宽字型,用于匹配替代字型 默认值是false
 * @param FontFile 指向内嵌字型文件,嵌入字型文件应使用OpenType格式
 */
interface CT_Font {
  FontName: XSString;
  FamilyName?: XSString;
  Charset?: XSString;
  Serif?: XSBoolean;
  Bold?: XSBoolean;
  Italic?: XSBoolean;
  FixedWidth?: XSBoolean;
  FontFile?: ST_Loc;
}

/**
 * 注释类型取值
 * @param Link 链接注释
 * @param Path 路径注释，一般为图形对象比如矩形、多边形、贝塞尔曲线等
 * @param Highlight  高亮注释
 * @param Stamp 签章注释
 * @param Watermark 水印注释
 */
type AnnotType = 'Link' | 'Path' | 'Highlight' | 'Stamp' | 'Watermark';

interface Parameters {
  Name: XSString;
}

/**
 * 注释信息结构
 * @param ID 必填 注释标识
 * @param Type 必填 注释类型
 * @param Creator 必填 注释创建者
 * @param LastModDate 必填 最近一次修改的时间
 * @param Subtype 注释子类型
 * @param Visible 表示该注释是否显示 默认 true
 * @param Print 对象的Remark信息是否随页面一起打印 默认true
 * @param NoZoom 对象的Remark信息是否不随页面缩放而同步缩放 默认false
 * @param NoRotate 对象的Remark信息是否不随页面旋转而同步旋转 默认false
 * @param ReadOnly 对象的Remark信息是否不能被用户修改 默认true
 * @param Remark 注释说明内容
 * @param Parameter 一组注释参数
 * @param
 */
interface PageAnnot {
  ID: ST_ID;
  Type: AnnotType;
  Creator: XSString;
  LastModDate: XSDate;
  Subtype?: XSString;
  Visible?: XSBoolean;
  Print?: XSBoolean;
  NoZoom?: XSBoolean;
  NoRotate?: XSBoolean;
  ReadOnly?: XSBoolean;
  Remark?: XSString;
  Parameters: Parameters;
  Appearance: CT_PageBlock;
}

interface Reference {
  CheckValue?: string;
  FileRef?: string;
}

interface Cert {
  Version?: string;
  Subject?: string;
  Issuer?: string;
  NotAfter?: string;
  NotBefore?: string;
  PublicKeyHex?: string;
  PublicKeyType?: string;
  SerialNumber?: string;
  SignAlgType?: string;
  SignHex?: string;
}

interface Provider {
  Company?: string;
  ProviderName?: string;
  Version?: string;
}

interface SealHeader {
  ID?: string;
  Vid?: string;
  version?: 4;
}

interface SealProperty {
  createDate?: string;
  name?: string;
  type?: string;
  validEnd?: string;
  validStart?: string;
}

interface StampAnnot {
  Boundary?: string;
  Clip?: string;
  ID?: string;
  PageRef?: string;
}
interface Seal {
  Header?: SealHeader;
  esID?: string;
  Property?: SealProperty;
  picture?: { type: string; data?: Uint8Array; width: string; height: string };
}

interface SignedInfo {
  Provider?: Provider;
  References?: Reference[];
  ReferencesCheckMethod?: string;
  Seal?: Seal;
  SignatureDateTime?: string;
  SignatureMethod?: string;
  StampAnnot?: StampAnnot[];
}
interface Signature {
  HashHex?: string;
  HashValid?: boolean;
  PicType?: string;
  PicValue?: string;
  SealCert?: Cert;
  SignCert?: Cert;
  SignatureValid?: boolean;
  SignedInfo?: SignedInfo;
  SignedValueLoc?: string;
  height?: string;
  signatureHex?: string;
  width?: string;
}
interface Signatures {
  ID: string;
  BaseLoc: string;
  Type?: string;
  Signature?: Signature | null;
}

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
