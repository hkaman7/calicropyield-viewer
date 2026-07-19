// Daymet uses a fixed 365-day calendar: in leap years, February 29 is kept
// but December 31 is dropped instead, so every year's time axis has
// exactly 365 entries (https://daymet.ornl.gov, "Daymet leap year" note).
// This converts a (year, month, day) picked in the UI to the 0-based index
// into that 365-length time axis.
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year, month) {
  const standard = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) return 29;
  if (month === 12 && isLeapYear(year)) return 30; // Dec 31 dropped
  return standard[month - 1];
}

export function dayOfYearIndex(year, month, day) {
  let index = day - 1;
  for (let m = 1; m < month; m++) {
    index += daysInMonth(year, m);
  }
  return index;
}
