import { ERROR_TYPE_UNZIP } from '../constant';

import ErrorHandle, { ErrorCode } from './ErrorHandle';

export default class VaildUnzipError extends ErrorHandle {
  constructor(code: ErrorCode) {
    super(code, ERROR_TYPE_UNZIP);
  }
}
