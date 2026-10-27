// All coordinates use integer rows in the original image, never preview pixels.
export function validatePlan(plan, size) {
  if (!plan || plan.app !== 'LongPicCutter' || plan.version !== 1 || !Array.isArray(plan.lines)) throw new Error('不支持的切割方案格式');
  if (plan.image?.width !== size.width || plan.image?.height !== size.height) throw new Error('方案原图尺寸与当前图片不同，不能直接套用');
  if (plan.lines.length > 10000 || plan.lines.some(y => !Number.isInteger(y) || y <= 0 || y >= size.height)) throw new Error('方案包含无效或过多的切割位置');
  return [...new Set(plan.lines)];
}
export function boundaries(lines, height) {
  return [0, ...[...new Set(lines)].filter(y => Number.isInteger(y) && y > 0 && y < height).sort((a, b) => a - b), height];
}
export function pixelAtPointer(pointer, rect, height) {
  if (!rect.width || !rect.height || pointer.x < rect.left || pointer.x >= rect.right || pointer.y < rect.top || pointer.y >= rect.bottom) return null;
  const y = Math.round((pointer.y - rect.top) / rect.height * height);
  return y > 0 && y < height ? y : null;
}
