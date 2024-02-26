import OFDElement from '../OFDElement';
import PagesXml from '../Pages/PageXml';
import AnnotationsXml from '../Annotations/AnnotationsXml';
import TemplatePages from '../TemplatePages/TemplatePages';
import DocumentResXml from './DocumentResXml';
import PublicResXml from './PublicResXml';
declare class DocumnetXml extends OFDElement {
    static fileName: string;
    constructor(fileName: string);
    /**
     * 获取 TemplatePage
     * @returns
     */
    getTemplatePage(): TemplatePages | null;
    getDocumentRes(): DocumentResXml | null;
    getPublicRes(): PublicResXml | null;
    getPages(): PagesXml | null;
    /**
     * 获取文档区域坐标
     * @returns
     */
    getPageArea(): null;
    getAnnotation(): AnnotationsXml | null;
}
export default DocumnetXml;
