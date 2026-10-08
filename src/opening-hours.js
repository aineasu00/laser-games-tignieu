// Zone A 2026–2027. Source: calendrier-scolaire on education.gouv.fr.
// Dates inclusive; the business opens from the first Saturday at 10:30.
export const HOLIDAYS = [
  ['2026-10-17','2026-11-01','Toussaint'],
  ['2026-12-19','2027-01-03','Noël'],
  ['2027-02-13','2027-02-28','Hiver'],
  ['2027-04-10','2027-04-25','Printemps'],
  ['2027-07-03','2027-09-01','Été'],
];
const NORMAL = {0:[['10:30','12:00'],['13:30','20:00']],3:[['10:30','12:00'],['13:30','20:00']],4:[['17:00','22:00']],5:[['17:00','22:00']],6:[['10:30','12:00'],['13:30','22:00']]};
export const holidayFor = date => HOLIDAYS.find(([from,to])=>date>=from && date<=to) || null;
export function openingWindows(date, birthday=false) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (day===1 || (birthday && [2,4].includes(day))) return [];
  return holidayFor(date) ? [['10:30','20:00']] : NORMAL[day] || [];
}
