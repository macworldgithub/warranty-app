export function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';

  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return '';

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function formatDateTimeForInput(date: Date | string | null | undefined): string {
  if (!date) return '';

  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return '';

  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return formatDateForInput(parsed);
}
