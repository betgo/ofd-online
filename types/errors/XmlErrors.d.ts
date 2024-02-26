import ErrorHandle, { ErrorCode } from './ErrorHandle';
export default class VaildXmlError extends ErrorHandle {
    constructor(code: ErrorCode, msg?: string);
}
