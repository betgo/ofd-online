const ellipsis = '\u2026';

function stringCut(str: string, len: number): string {
  if (str.length > len) str = str.substring(0, len) + ellipsis;
  return str;
}

export default stringCut;
