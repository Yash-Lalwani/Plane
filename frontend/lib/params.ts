export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
