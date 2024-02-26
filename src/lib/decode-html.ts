const REGX_HTML_DECODE = /&\w+;|&#(\d+);/g;

const HTML_DECODE: { [k: string]: string } = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&nbsp;': ' ',
  '&quot;': '"',
  '&copy;': '',
  '&apos;': "'"
  // Add more
};

/**
 * html标签语义转string
 * @param str
 * @returns
 */
const decodeHtml = function (str: string) {
  const htmlStr = str !== undefined ? str : String(str);
  return typeof htmlStr != 'string'
    ? htmlStr
    : htmlStr.replace(REGX_HTML_DECODE, function ($0: string, $1) {
        var c = HTML_DECODE[$0];
        if (c == undefined) {
          // Maybe is Entity Number
          if (!isNaN($1)) {
            c = String.fromCharCode($1 == 160 ? 32 : $1);
          } else {
            c = $0;
          }
        }
        return c;
      });
};

export default decodeHtml;
