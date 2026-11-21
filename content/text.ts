/** Tiny text helpers for content files (no server imports, safe anywhere). */
export const fmt = (x: number) => x.toLocaleString("en-US");
export const plural = (x: number, one: string, many: string) => `${fmt(x)} ${x === 1 ? one : many}`;
