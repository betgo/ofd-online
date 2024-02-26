import ErrorHandle, { ErrorCode } from './ErrorHandle';
export default class VaildUnzipError extends ErrorHandle {
    constructor(code: ErrorCode);
}
