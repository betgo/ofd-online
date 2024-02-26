import ErrorHandle, { ErrorCode } from './ErrorHandle';
export default class VaildFetchError extends ErrorHandle {
    constructor(code: ErrorCode);
}
