import Int10 from './int10';
import oids from './oids';
import stringCut from './string-cut';

const b64Safe =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const reTimeS =
  /^(\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
const reTimeL =
  /^(\d\d\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
const ellipsis = '\u2026';
function ex(c: number) {
  // must be 10xxxxxx
  if (c < 0x80 || c >= 0xc0)
    throw new Error('Invalid UTF-8 continuation byte: ' + c);

  return c & 0x3f;
}

function surrogate(cp: number) {
  if (cp < 0x10000)
    throw new Error(
      'UTF-8 overlong encoding, codepoint encoded in 4 bytes: ' + cp
    );
  // we could use String.fromCodePoint(cp) but let's be nice to older browsers and use surrogate pairs

  cp -= 0x10000;

  return String.fromCharCode((cp >> 10) + 0xd800, (cp & 0x3ff) + 0xdc00);
}

class Stream {
  enc: string | Uint8Array;
  pos: number;
  static hexDigits: '0123456789ABCDEF';
  constructor(streams: Stream | string, pos?: number) {
    if (streams instanceof Stream) {
      this.enc = streams.enc;
      this.pos = streams.pos;
    } else {
      // enc should be an array or a binary string
      this.enc = streams;
      this.pos = pos as number;
    }
  }

  hexDigits = '0123456789ABCDEF';

  get(pos?: number): number {
    let cPos = pos;
    if (cPos === undefined) {
      cPos = this.pos++;
    }
    if (!this.enc || !this.enc.length) {
      return 0;
    }
    if (this.enc && cPos >= this.enc.length)
      throw (
        'Requesting byte offset ' +
        pos +
        ' on a stream of length ' +
        this.enc.length
      );
    return typeof this.enc == 'string'
      ? this.enc.charCodeAt(cPos)
      : this.enc[cPos];
  }
  hexByte(b: number): string {
    return (
      this.hexDigits.charAt((b >> 4) & 0xf) + this.hexDigits.charAt(b & 0xf)
    );
  }
  hexDump(start: number, end: number, raw?: boolean) {
    let s = '';
    for (let i = start; i < end; ++i) {
      s += this.hexByte(this.get(i));
      if (raw !== true)
        switch (i & 0xf) {
          case 0x7:
            s += '  ';
            break;
          case 0xf:
            s += '\n';
            break;
          default:
            s += ' ';
        }
    }
    return s;
  }
  b64Dump(start: number, end: number) {
    const extra = (end - start) % 3;
    let s = '';
    let i;
    let c;
    for (i = start; i + 2 < end; i += 3) {
      c = (this.get(i) << 16) | (this.get(i + 1) << 8) | this.get(i + 2);
      s += b64Safe.charAt((c >> 18) & 0x3f);
      s += b64Safe.charAt((c >> 12) & 0x3f);
      s += b64Safe.charAt((c >> 6) & 0x3f);
      s += b64Safe.charAt(c & 0x3f);
    }
    if (extra > 0) {
      c = this.get(i) << 16;
      if (extra > 1) c |= this.get(i + 1) << 8;
      s += b64Safe.charAt((c >> 18) & 0x3f);
      s += b64Safe.charAt((c >> 12) & 0x3f);
      if (extra === 2) s += b64Safe.charAt((c >> 6) & 0x3f);
    }
    return s;
  }
  isASCII(start: number, end: number) {
    for (let i = start; i < end; ++i) {
      var c = this.get(i);
      if (c < 32 || c > 176) return false;
    }
    return true;
  }

  parseStringISO(start: number, end: number) {
    let s = '';
    for (let i = start; i < end; ++i) {
      s += String.fromCharCode(this.get(i));
    }
    return s;
  }
  parseStringUTF(start: number, end: number) {
    let s = '';
    for (let i = start; i < end; ) {
      const c = this.get(i++);
      if (c < 0x80)
        // 0xxxxxxx (7 bit)
        s += String.fromCharCode(c);
      else if (c < 0xc0) throw new Error('Invalid UTF-8 starting byte: ' + c);
      else if (c < 0xe0)
        // 110xxxxx 10xxxxxx (11 bit)
        s += String.fromCharCode(((c & 0x1f) << 6) | ex(this.get(i++)));
      else if (c < 0xf0)
        // 1110xxxx 10xxxxxx 10xxxxxx (16 bit)
        s += String.fromCharCode(
          ((c & 0x0f) << 12) | (ex(this.get(i++)) << 6) | ex(this.get(i++))
        );
      else if (c < 0xf8)
        // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx (21 bit)
        s += surrogate(
          ((c & 0x07) << 18) |
            (ex(this.get(i++)) << 12) |
            (ex(this.get(i++)) << 6) |
            ex(this.get(i++))
        );
      else
        throw new Error(
          'Invalid UTF-8 starting byte (since 2003 it is restricted to 4 bytes): ' +
            c
        );
    }
    return s;
  }
  parseStringBMP(start: number, end: number): string {
    let str = '';
    let hi;
    let lo;
    for (let i = start; i < end; ) {
      hi = this.get(i++);
      lo = this.get(i++);
      str += String.fromCharCode((hi << 8) | lo);
    }
    return str;
  }
  parseTime(start: number, end: number, shortYear: boolean) {
    let s = this.parseStringISO(start, end);
    const t = (shortYear ? reTimeS : reTimeL).exec(s);
    if (!t) return 'Unrecognized time: ' + s;
    const m: (number | string)[] = t;
    if (shortYear) {
      // to avoid querying the timer, use the fixed range [1970, 2069]
      // it will conform with ITU X.400 [-10, +40] sliding window until 2030

      m[1] = +Number(m[1]);
      m[1] += Number(m[1]) < 70 ? 2000 : 1900;
    }
    s = m[1] + '-' + m[2] + '-' + m[3] + ' ' + m[4];
    if (m[5]) {
      s += ':' + m[5];
      if (m[6]) {
        s += ':' + m[6];
        if (m[7]) s += '.' + m[7];
      }
    }
    if (m[8]) {
      s += ' UTC';
      if (m[8] != 'Z') {
        s += m[8];
        if (m[9]) s += ':' + m[9];
      }
    }
    return s;
  }
  parseInteger(start: number, end: number) {
    let v = this.get(start),
      neg = v > 127,
      pad = neg ? 255 : 0,
      len,
      s = null;
    // skip unuseful bits (not allowed in DER)
    while (v === pad && ++start < end) {
      v = this.get(start);
    }
    len = end - start;
    if (len === 0) return neg ? '-1' : '0';
    // show bit length of huge integers
    if (len > 4) {
      s = v;
      len <<= 3;
      while (((s ^ pad) & 0x80) === 0) {
        s <<= 1;
        --len;
      }
      s = '(' + len + ' bit)\n';
    }
    // decode the integer
    if (neg) v = v - 256;

    const n = new Int10(v);
    for (let i = start + 1; i < end; ++i) {
      n.mulAdd(256, this.get(i));
    }

    return s ? s + n.toString() : n.toString();
  }
  parseBitString(start: number, end: number, maxLength: number) {
    var unusedBits = this.get(start);
    if (unusedBits > 7) throw 'Invalid BitString with unusedBits=' + unusedBits;
    var lenBit = ((end - start - 1) << 3) - unusedBits,
      s = '';
    for (var i = start + 1; i < end; ++i) {
      var b = this.get(i),
        skip = i == end - 1 ? unusedBits : 0;
      for (var j = 7; j >= skip; --j) s += (b >> j) & 1 ? '1' : '0';
      if (s.length > maxLength) s = stringCut(s, maxLength);
    }
    return { size: lenBit, str: s };
  }
  parseOctetString(start: number, end: number, maxLength: number) {
    var len = end - start,
      s;
    try {
      s = this.parseStringUTF(start, end);
      var v;
      for (i = 0; i < s.length; ++i) {
        v = s.charCodeAt(i);
        if (v < 32 && v != 9 && v != 10 && v != 13)
          // [\t\r\n] are (kinda) printable
          throw new Error(
            'Unprintable character at index ' +
              i +
              ' (code ' +
              s.charCodeAt(i) +
              ')'
          );
      }
      return { size: len, str: s };
    } catch (e) {
      // ignore
    }
    maxLength /= 2; // we work in bytes
    if (len > maxLength) end = start + maxLength;
    s = '';
    for (var i = start; i < end; ++i) s += this.hexByte(this.get(i));
    if (len > maxLength) s += ellipsis;
    return { size: len, str: s };
  }
  parseOID(start: number, end: number, maxLength: number) {
    let s = '';
    let n = new Int10();
    let bits = 0;
    for (let i = start; i < end; ++i) {
      var v = this.get(i);
      n.mulAdd(128, v & 0x7f);
      bits += 7;
      if (!(v & 0x80)) {
        // finished
        if (s === '') {
          n = n.simplify() as Int10;
          if (n instanceof Int10) {
            n.sub(80);

            s = '2.' + n.toString();
          } else {
            const m = n < 80 ? (n < 40 ? 0 : 1) : 2;
            s = m + '.' + (n - m * 40);
          }
        } else s += '.' + n.toString();
        if (s.length > maxLength) return stringCut(s, maxLength);

        n = new Int10();
        bits = 0;
      }
    }
    if (bits > 0) s += '.incomplete';
    if (typeof oids === 'object') {
      const oid = oids[s];
      if (oid) {
        if (oid.d) s += '\n' + oid.d;
        if (oid.c) s += '\n' + oid.c;
        if (oid.w) s += '\n(warning!)';
      }
    }
    return s;
  }
}

export default Stream;
