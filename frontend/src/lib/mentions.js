export function mentionQuery(text, caret) {
  const prefix = text.slice(0, caret);
  const match = prefix.match(/(?:^|\s)@([^@\n]*)$/u);
  return match ? { start: prefix.lastIndexOf('@'), end: caret, query: match[1] } : null;
}
export function mentionParts(text, names) {
  const known = [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length);
  const result = [];
  const source = String(text ?? '');
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '@' || (i > 0 && !/\s/u.test(source[i - 1]))) continue;
    const name = known.find((n) => source.startsWith(n, i + 1) && (!source[i + n.length + 1] || /[\s.,!?;:()[\]{}]/u.test(source[i + n.length + 1])));
    if (!name) continue;
    if (i > start) result.push({ text: source.slice(start, i) });
    result.push({ text: '@' + name, name });
    i += name.length;
    start = i + 1;
  }
  if (start < source.length) result.push({ text: source.slice(start) });
  return result;
}
