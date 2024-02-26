import { ERROR_TYPE_FETCH } from '../constant';
import ErrorHandle, { ErrorCode } from './ErrorHandle';

export default class VaildFetchError extends ErrorHandle {
  constructor(code: ErrorCode) {
    super(code, ERROR_TYPE_FETCH);
  }
}
