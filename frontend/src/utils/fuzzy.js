import Fuse from "fuse.js";

export const fuzzySearch = (list, pattern, keys, opts = {}) => {
  if (!pattern || !pattern.toString().trim()) return list;
  const fuse = new Fuse(list, { includeScore: true, threshold: 0.4, keys, ...opts });
  return fuse.search(pattern).map(r => r.item);
};
