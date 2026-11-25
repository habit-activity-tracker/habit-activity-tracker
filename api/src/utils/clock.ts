export interface Clock {
  today(timezone: string): string;
  now?(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
  today(timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  },
};
