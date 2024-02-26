import { FILE_TYPE_XML } from '../constant';
import ErrorHandle, { ErrorCode } from './ErrorHandle';

export default class VaildXmlError extends ErrorHandle {
  constructor(code: ErrorCode, msg?: string) {
    super(code, FILE_TYPE_XML);
    if (msg) {
      this.message = msg;
    }
  }
}
