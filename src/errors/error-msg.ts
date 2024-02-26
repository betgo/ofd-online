interface ErrorMsg {
  400: string;
  403: string;
  404: string;
  500: string;
  9999: string;
}

const errorMsg: ErrorMsg = {
  '400': '参数传递错误',
  '403': '类型不支持',
  '404': '文件不存在',
  '500': '文件解析错误',
  '9999': '未知错误'
};

export default errorMsg;
