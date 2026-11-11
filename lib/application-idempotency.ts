const fields = ['name','phone','birth','job','tenure','industry','overdue','card','amount','rate','term','consent','consentVersion'] as const;

export function validApplicationKey(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function sameApplication(left: Record<string,unknown>, right: Record<string,unknown>): boolean {
  return fields.every(field => left[field] === right[field]);
}
