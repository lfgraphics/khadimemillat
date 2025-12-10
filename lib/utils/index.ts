import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import moment from 'moment';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (dateInput: string | Date | null): string => {
  if (dateInput == null) return ""
  const date = moment(dateInput);
  if (!date || !date.isValid()) return "no date provided";
  return `${date.format('DD-MM-YY')}, ${date.format('hh:mm A')}`;
};

export function camelToWords(str: string) {
  return str
    .replace(/([A-Z])/g, " $1")   // insert space before capital letters
    .replace(/^./, (s) => s.toUpperCase()); // capitalize first letter
}

// Safely parse a fetch Response as JSON with status and content-type guards
export async function safeJson<T = any>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || ''
  const text = await res.text().catch(() => '')
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`)
  }
  if (!ct.includes('application/json')) {
    throw new Error(`Non-JSON response (${ct}): ${text.slice(0, 200)}`)
  }
  try {
    return JSON.parse(text) as T
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${String(e)} | payload: ${text.slice(0, 200)}`)
  }
}
