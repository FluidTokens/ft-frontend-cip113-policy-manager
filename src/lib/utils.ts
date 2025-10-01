import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// first letter uppercase
export function firstLetterUppercase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Truncate string
export function truncateString(str: string, length: number, middle?: boolean): string {
  if (!str || str.length <= length) return str;

  if (middle) {
    const halfLength = Math.floor(length / 2);
    return `${str.slice(0, halfLength)}...${str.slice(-halfLength)}`;
  } else {
    return `${str.slice(0, length - 3)}...`;
  }
}

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);

  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};