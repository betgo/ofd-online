import ErrorHandle, { ErrorCode } from './ErrorHandle';
export default class VaildOFDError extends ErrorHandle {
    constructor(code: ErrorCode, msg?: string);
}
