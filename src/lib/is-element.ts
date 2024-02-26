/**
 * @description 判断是否为DOM节点
 */
export default (n: Element): boolean => {
  if (!n) {
    console.error('n is not Element');
    return false;
  }
  if (n.nodeType === 1) {
    return true;
  }
  return false;
};
