import { FILE_TYPE_OFD } from '../constant';
import ErrorHandle, { ErrorCode } from './ErrorHandle';

export default class VaildOFDError extends ErrorHandle {
  constructor(code: ErrorCode, msg?: string) {
    super(code, FILE_TYPE_OFD);
    if (msg) {
      this.message = msg;
    }
  }
}
