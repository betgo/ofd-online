import { ERROR_TYPE_MAGIC } from '../constant';

import ErrorHandle, { ErrorCode } from './ErrorHandle';

export default class VaildMimeError extends ErrorHandle {
  constructor(code: ErrorCode) {
    super(code, ERROR_TYPE_MAGIC);
  }
}
