/**
 * Timezone utilities for Algeria deployment
 * Algeria uses Africa/Algiers (CET, UTC+1, no DST since 2008)
 */

export const ALGIERS_TZ = 'Africa/Algiers';

/** Format a date/time string in Algeria timezone */
export function formatInTZ(date: string | Date, format: string = 'datetime'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  try {
    return d.toLocaleString('fr-DZ', {
      timeZone: ALGIERS_TZ,
      ...(format === 'date'
        ? { year: 'numeric', month: 'short', day: 'numeric' }
        : format === 'time'
          ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
          : { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    });
  } catch {
    return d.toLocaleString('fr-DZ');
  }
}

/** Get current time in Algeria */
export function getAlgiersTime(): Date {
  return new Date();
}

/** Format date for display (short) */
export function formatDate(date: string | Date): string {
  return formatInTZ(date, 'date');
}

/** Format datetime for display */
export function formatDatetime(date: string | Date): string {
  return formatInTZ(date, 'datetime');
}
