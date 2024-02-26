import errorMsg from './error-msg';

export type ErrorCode = 400 | 404 | 403 | 500 | 9999;

export default class ErrorHandle extends Error {
  code: ErrorCode;
  type: string;
  constructor(code: ErrorCode, type: string) {
    super();
    this.code = code;
    this.type = type;
    this.message = errorMsg[code];
  }
}
