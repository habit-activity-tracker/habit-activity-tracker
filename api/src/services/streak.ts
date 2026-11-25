export interface StreakRange {
  startDate: string;
  endDate: string;
}

const dateValue = (value: string): number => {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const dateString = (value: number): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));

export const calculateStreak = (activityDates: string[], today: string, range: StreakRange): number => {
  const validDates = new Set(activityDates.filter((date) => date >= range.startDate && date <= range.endDate && date <= today));
  const yesterday = dateString(dateValue(today) - 86_400_000);
  let cursor = validDates.has(today) ? today : yesterday;
  if (cursor < range.startDate || cursor > range.endDate || !validDates.has(cursor)) return 0;

  let streak = 0;
  while (validDates.has(cursor)) {
    streak += 1;
    cursor = dateString(dateValue(cursor) - 86_400_000);
  }
  return streak;
};
