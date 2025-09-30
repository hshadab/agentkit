// Deterministic JSON stringifier (keys sorted)
export function canonicalStringify(obj) {
  return JSON.stringify(sortObject(obj));
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortObject(value[k]);
        return acc;
      }, {});
  }
  return value;
}

