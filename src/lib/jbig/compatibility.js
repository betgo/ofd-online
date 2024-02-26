/* Copyright 2017 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals __non_webpack_require__ */

import { isNodeJS } from './is_node.js';

// Skip compatibility checks for modern builds and if we already ran the module.
if (
  // @ts-ignore
  (typeof PDFJSDev === 'undefined' || !PDFJSDev.test('SKIP_BABEL')) &&
  !globalThis._pdfjsCompatibilityChecked
) {
  globalThis._pdfjsCompatibilityChecked = true;

  // Support: Node.js<16.0.0
  (function checkNodeBtoa() {
    // @ts-ignore
    if (globalThis.btoa || !isNodeJS) {
      return;
    }
    globalThis.btoa = function (chars) {
      // eslint-disable-next-line no-undef
      return Buffer.from(chars, 'binary').toString('base64');
    };
  })();

  // Support: Node.js<16.0.0
  (function checkNodeAtob() {
    // @ts-ignore
    if (globalThis.atob || !isNodeJS) {
      return;
    }
    globalThis.atob = function (input) {
      // eslint-disable-next-line no-undef
      return Buffer.from(input, 'base64').toString('binary');
    };
  })();

  // Support: Node.js
  (function checkDOMMatrix() {
    if (globalThis.DOMMatrix || !isNodeJS) {
      return;
    }
    // @ts-ignore
    globalThis.DOMMatrix = __non_webpack_require__(
      'dommatrix/dist/dommatrix.js'
    );
  })();

  // Support: Node.js
  (function checkReadableStream() {
    if (globalThis.ReadableStream || !isNodeJS) {
      return;
    }
    // @ts-ignore
    globalThis.ReadableStream = __non_webpack_require__(
      'web-streams-polyfill/dist/ponyfill.js'
    ).ReadableStream;
  })();

  // Support: Firefox<90, Chrome<92, Safari<15.4, Node.js<16.6.0
  (function checkArrayAt() {
    // @ts-ignore
    if (Array.prototype.at) {
      return;
    }
    // @ts-ignore
    require('core-js/es/array/at.js');
  })();

  // Support: Firefox<90, Chrome<92, Safari<15.4, Node.js<16.6.0
  (function checkTypedArrayAt() {
    // @ts-ignore
    if (Uint8Array.prototype.at) {
      return;
    }
    // @ts-ignore
    require('core-js/es/typed-array/at.js');
  })();

  // Support: Firefox<94, Chrome<98, Safari<15.4, Node.js<17.0.0
  (function checkStructuredClone() {
    // @ts-ignore
    if (typeof PDFJSDev !== 'undefined' && PDFJSDev.test('IMAGE_DECODERS')) {
      // The current image decoders are synchronous, hence `structuredClone`
      // shouldn't need to be polyfilled for the IMAGE_DECODERS build target.
      return;
    }
    // @ts-ignore
    if (globalThis.structuredClone) {
      return;
    }
    // @ts-ignore
    require('core-js/web/structured-clone.js');
  })();
}
