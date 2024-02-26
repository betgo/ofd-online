import Stream from './Stream';
import Int10 from './int10';
import stringCut from './string-cut';

function recurse(el: Asn1, parser: string | number, maxLength: number) {
  let avoidRecurse = true;
  if (el.tag.tagConstructed && el.sub) {
    avoidRecurse = false;
    el.sub.forEach(function (e1: any) {
      if (
        e1.tag.tagClass != el.tag.tagClass ||
        e1.tag.tagNumber != el.tag.tagNumber
      )
        avoidRecurse = true;
    });
  }
  if (avoidRecurse) {
    return el.stream[parser](
      el.posContent(),
      el.posContent() + Math.abs(el.length),
      maxLength
    );
  }
  const d = { size: 0, str: '' };
  el.sub.forEach(function (el: any) {
    const d1 = recurse(el, parser, maxLength - d.str.length);
    d.size += d1.size;
    d.str += d1.str;
  });
  return d;
}

export class ASN1Tag {
  tagClass: number;
  tagNumber: number;
  tagConstructed: boolean;
  constructor(stream: Stream) {
    let buf = stream.get();
    this.tagClass = buf >> 6;
    this.tagConstructed = (buf & 0x20) !== 0;
    this.tagNumber = buf & 0x1f;
    if (this.tagNumber == 0x1f) {
      // long tag

      const int10 = new Int10();
      do {
        buf = stream.get();
        int10.mulAdd(128, buf & 0x7f);
      } while (buf & 0x80);
      this.tagNumber = int10.simplify() as number;
    }
  }
  isUniversal() {
    return this.tagClass === 0x00;
  }
  isEOC() {
    return this.tagClass === 0x00 && this.tagNumber === 0x00;
  }
}

export class Asn1 {
  stream: { [k: string | number]: any };
  header: number;
  length: number;
  tag: ASN1Tag;
  tagLen: number;
  sub: any[];
  constructor(
    stream: { [k: string | number]: any },
    header: number,
    length: number,
    tag: ASN1Tag,
    tagLen: number,
    sub: any[]
  ) {
    if (!(tag instanceof ASN1Tag)) throw 'Invalid tag value.';
    this.stream = stream;
    this.header = header;
    this.length = length;
    this.tag = tag;
    this.tagLen = tagLen;
    this.sub = sub;
  }
  typeName() {
    switch (this.tag.tagClass) {
      case 0: // universal
        switch (this.tag.tagNumber) {
          case 0x00:
            return 'EOC';
          case 0x01:
            return 'BOOLEAN';
          case 0x02:
            return 'INTEGER';
          case 0x03:
            return 'BIT_STRING';
          case 0x04:
            return 'OCTET_STRING';
          case 0x05:
            return 'NULL';
          case 0x06:
            return 'OBJECT_IDENTIFIER';
          case 0x07:
            return 'ObjectDescriptor';
          case 0x08:
            return 'EXTERNAL';
          case 0x09:
            return 'REAL';
          case 0x0a:
            return 'ENUMERATED';
          case 0x0b:
            return 'EMBEDDED_PDV';
          case 0x0c:
            return 'UTF8String';
          case 0x10:
            return 'SEQUENCE';
          case 0x11:
            return 'SET';
          case 0x12:
            return 'NumericString';
          case 0x13:
            return 'PrintableString'; // ASCII subset
          case 0x14:
            return 'TeletexString'; // aka T61String
          case 0x15:
            return 'VideotexString';
          case 0x16:
            return 'IA5String'; // ASCII
          case 0x17:
            return 'UTCTime';
          case 0x18:
            return 'GeneralizedTime';
          case 0x19:
            return 'GraphicString';
          case 0x1a:
            return 'VisibleString'; // ASCII subset
          case 0x1b:
            return 'GeneralString';
          case 0x1c:
            return 'UniversalString';
          case 0x1e:
            return 'BMPString';
        }

        return 'Universal_' + this.tag.tagNumber.toString();
      case 1:
        return 'Application_' + this.tag.tagNumber.toString();
      case 2:
        return '[' + this.tag.tagNumber.toString() + ']'; // Context
      case 3:
        return 'Private_' + this.tag.tagNumber.toString();
    }
  }

  content(maxLength?: number) {
    if (this.tag === undefined) return null;
    if (maxLength === undefined) maxLength = Infinity;
    const content = this.posContent();
    const len = Math.abs(this.length);
    if (!this.tag.isUniversal()) {
      if (this.sub !== null) return '(' + this.sub.length + ' elem)';
      const d1 = this.stream.parseOctetString(
        content,
        content + len,
        maxLength
      );
      return '(' + d1.size + ' byte)\n' + d1.str;
    }
    switch (this.tag.tagNumber) {
      case 0x01: // BOOLEAN
        return this.stream.get(content) === 0 ? 'false' : 'true';
      case 0x02: // INTEGER
        return this.stream.parseInteger(content, content + len);
      case 0x03: // BIT_STRING
        var d = recurse(this, 'parseBitString', maxLength);
        return '(' + d.size + ' bit)\n' + d.str;
      case 0x04: // OCTET_STRING
        d = recurse(this, 'parseOctetString', maxLength);
        return '(' + d.size + ' byte)\n' + d.str;
      //case 0x05: // NULL
      case 0x06: // OBJECT_IDENTIFIER
        return this.stream.parseOID(content, content + len, maxLength);
      //case 0x07: // ObjectDescriptor
      //case 0x08: // EXTERNAL
      //case 0x09: // REAL
      case 0x0a: // ENUMERATED
        return this.stream.parseInteger(content, content + len);
      //case 0x0B: // EMBEDDED_PDV
      case 0x10: // SEQUENCE
      case 0x11: // SET
        if (this.sub !== null) return '(' + this.sub.length + ' elem)';
        else return '(no elem)';
      case 0x0c: // UTF8String
        return stringCut(
          this.stream.parseStringUTF(content, content + len),
          maxLength
        );
      case 0x12: // NumericString
      case 0x13: // PrintableString
      case 0x14: // TeletexString
      case 0x15: // VideotexString
      case 0x16: // IA5String
      case 0x1a: // VisibleString
      case 0x1b: // GeneralString
        //case 0x19: // GraphicString
        //case 0x1C: // UniversalString
        return stringCut(
          this.stream.parseStringISO(content, content + len),
          maxLength
        );
      case 0x1e: // BMPString
        return stringCut(
          this.stream.parseStringBMP(content, content + len),
          maxLength
        );
      case 0x17: // UTCTime
      case 0x18: // GeneralizedTime
        return this.stream.parseTime(
          content,
          content + len,
          this.tag.tagNumber == 0x17
        );
    }
    return null;
  }

  toString() {
    return (
      this.typeName() +
      '@' +
      this.stream.pos +
      '[header:' +
      this.header +
      ',length:' +
      this.length +
      ',sub:' +
      (this.sub === null ? 'null' : this.sub.length) +
      ']'
    );
  }

  toPrettyString(indent: any) {
    if (indent === undefined) indent = '';
    let s = indent + this.typeName() + ' @' + this.stream.pos;
    if (this.length >= 0) s += '+';
    s += this.length;
    if (this.tag.tagConstructed) s += ' (constructed)';
    else if (
      this.tag.isUniversal() &&
      (this.tag.tagNumber == 0x03 || this.tag.tagNumber == 0x04) &&
      this.sub !== null
    )
      s += ' (encapsulates)';
    const content = this.content();
    if (content) s += ': ' + content.replace(/\n/g, '|');
    s += '\n';
    if (this.sub !== null) {
      indent += '  ';
      for (let i = 0, max = this.sub.length; i < max; ++i)
        s += this.sub[i].toPrettyString(indent);
    }
    return s;
  }
  posStart() {
    return this.stream.pos;
  }
  posContent() {
    return this.stream.pos + this.header;
  }
  posEnd() {
    return this.stream.pos + this.header + Math.abs(this.length);
  }
  /** Position of the length. */
  posLen() {
    return this.stream.pos + this.tagLen;
  }
  toHexString() {
    return this.stream.hexDump(this.posStart(), this.posEnd(), true);
  }
  toB64String() {
    return this.stream.b64Dump(this.posStart(), this.posEnd());
  }
}

export default Asn1;
