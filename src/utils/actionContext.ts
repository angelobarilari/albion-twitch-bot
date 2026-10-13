import type { ActionContext } from "../types/actions.js";

/**
 * Formats action origin details for concise operational logs.
 *
 * @param context Optional action source, event, and user.
 * @returns A safe-to-log context suffix, or an empty string.
 */
export function formatActionContext(context?: ActionContext): string {
  if (!context) return "";
  return ` [source=${context.source} event=${JSON.stringify(context.event)} user=${JSON.stringify(context.user)}]`;
}
