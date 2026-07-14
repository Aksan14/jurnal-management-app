import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the backend base URL (no trailing slash, no /api suffix).
 * Reads from NEXT_PUBLIC_API_URL which already includes /api/v1 or /api,
 * so we strip that suffix to get the origin.
 */
export function getBackendUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  return apiUrl.replace(/\/api(\/v\d+)?$/, "");
}
