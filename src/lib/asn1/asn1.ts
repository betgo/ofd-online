// ASN.1 JavaScript decoder
// Copyright (c) 2008-2021 Lapo Luchini <lapo@lapo.it>

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

import Stream from './Stream';
import ASN1, { ASN1Tag } from './Asn.1';

export function decodeLength(stream: Stream) {
  let buf = stream.get(),
    len = buf & 0x7f;
  if (len == buf)
    // first bit was 0, short form
    return len;
  if (len === 0)
    // long form with length 0 is a special case
    return null; // undefined length
  if (len > 6)
    // no reason to use Int10, as it would be a huge buffer anyways
    throw 'Length over 48 bits not supported at position ' + (stream.pos - 1);
  buf = 0;
  for (var i = 0; i < len; ++i) buf = buf * 256 + stream.get();
  return buf;
}

export function decode(pStream: Stream | string, offset?: number): any {
  let stream: Stream =
    pStream instanceof Stream ? pStream : new Stream(pStream, offset || 0);
  const streamStart = new Stream(stream);
  let tag = new ASN1Tag(stream);
  const tagLen = stream.pos - streamStart.pos;
  let len = decodeLength(stream);
  let start = stream.pos;
  const header = start - streamStart.pos;
  let sub: any = null;
  const getSub = () => {
    sub = [];
    if (len !== null) {
      // definite length
      var end = start + len;
      // @ts-ignore
      if (end > stream.enc.length)
        throw (
          'Container at offset ' +
          start +
          ' has a length of ' +
          len +
          ', which is past the end of the stream'
        );
      while (stream.pos < end) {
        sub[sub.length] = decode(stream);
      }
      if (stream.pos != end)
        throw 'Content size is not correct for container at offset ' + start;
    } else {
      // undefined length
      try {
        for (;;) {
          var s = decode(stream);
          if (s.tag.isEOC()) break;
          sub[sub.length] = s;
        }
        len = start - stream.pos; // undefined lengths are represented as negative values
      } catch (e) {
        throw (
          'Exception while decoding undefined length content at offset ' +
          start +
          ': ' +
          e
        );
      }
    }
  };
  if (tag.tagConstructed) {
    // must have valid content
    getSub();
  } else if (
    tag.isUniversal() &&
    (tag.tagNumber == 0x03 || tag.tagNumber == 0x04)
  ) {
    // sometimes BitString and OctetString are used to encapsulate ASN.1
    try {
      if (tag.tagNumber == 0x03)
        if (stream.get() != 0)
          throw 'BIT STRINGs with unused bits cannot encapsulate.';
      getSub();
      if (sub) {
        for (var i = 0; i < sub.length; ++i)
          if (sub[i].tag.isEOC())
            throw 'EOC is not supposed to be actual content.';
      }
    } catch (e) {
      // but silently ignore when they don't
      sub = null;
      //DEBUG console.log('Could not decode structure at ' + start + ':', e);
    }
  }
  if (sub === null) {
    if (len === null)
      throw (
        "We can't skip over an invalid tag with undefined length at offset " +
        start
      );
    stream.pos = start + Math.abs(len);
  }

  return new ASN1(streamStart, header, len as number, tag, tagLen, sub);
}

export default decode;
