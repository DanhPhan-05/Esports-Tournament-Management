export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);
export const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
