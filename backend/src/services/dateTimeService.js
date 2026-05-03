const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTime(time) {
  if (!time || typeof time !== "string") return "";
  return time.trim();
}

function addMinutes(date, minutes) {
  return new Date(new Date(date).getTime() + minutes * MS_PER_MINUTE);
}

function isDateInFuture(date) {
  return new Date(date).getTime() > Date.now();
}

function isDateInPast(date) {
  return new Date(date).getTime() < Date.now();
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getDayOfWeek(date) {
  return DAY_KEYS[new Date(date).getDay()];
}

function parseTimeToMinutes(t) {
  const s = String(t).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function parseSlotRange(timeSlot) {
  const parts = String(timeSlot).split("-");
  if (parts.length < 2) return null;
  const start = parseTimeToMinutes(parts[0].trim());
  const end = parseTimeToMinutes(parts[1].trim());
  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

function startOfLocalDay(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0, 0);
}

function combineDateAndMinutes(dateInput, minutesFromMidnight) {
  const day = startOfLocalDay(dateInput);
  return new Date(day.getTime() + minutesFromMidnight * MS_PER_MINUTE);
}

function slotStartDateTime(appointmentDate, timeSlot) {
  const range = parseSlotRange(timeSlot);
  if (!range) return null;
  return combineDateAndMinutes(appointmentDate, range.start);
}

function slotEndDateTime(appointmentDate, timeSlot) {
  const range = parseSlotRange(timeSlot);
  if (!range) return null;
  return combineDateAndMinutes(appointmentDate, range.end);
}

function getTimeSlots(startTime, endTime, durationMinutes) {
  const a = parseTimeToMinutes(startTime);
  const b = parseTimeToMinutes(endTime);
  if (a == null || b == null || b <= a || durationMinutes <= 0) return [];
  const out = [];
  let cur = a;
  while (cur + durationMinutes <= b) {
    const s = minutesToTime(cur);
    const e = minutesToTime(cur + durationMinutes);
    out.push(`${s}-${e}`);
    cur += durationMinutes;
  }
  return out;
}

function hoursUntilAppointment(appointmentDate, timeSlot) {
  const start = slotStartDateTime(appointmentDate, timeSlot);
  if (!start) return null;
  return (start.getTime() - Date.now()) / MS_PER_DAY * 24;
}

module.exports = {
  formatDate,
  formatTime,
  addMinutes,
  isDateInFuture,
  isDateInPast,
  getDayOfWeek,
  getTimeSlots,
  parseSlotRange,
  slotStartDateTime,
  slotEndDateTime,
  startOfLocalDay,
  combineDateAndMinutes,
  parseTimeToMinutes,
  minutesToTime,
  hoursUntilAppointment,
  MS_PER_DAY,
};
