import ErrorHandle, { ErrorCode } from './ErrorHandle';
export default class VaildMimeError extends ErrorHandle {
    constructor(code: ErrorCode);
}
