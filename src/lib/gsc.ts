export function pickCol(
  row: Record<string, string> | undefined,
  names: string[]
) {
  if (!row) return undefined;
  const keys = Object.keys(row);
  return keys.find((k) =>
    names.some((n) => k.toLowerCase().includes(n.toLowerCase()))
  );
}
