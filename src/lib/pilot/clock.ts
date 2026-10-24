/**
 * Service clock. MBG kitchens run roughly 02:00–13:00 local time on school days.
 * Outside those hours the dashboards replay today's (or the last school day's)
 * operation at a fixed time so a visitor always sees a live-looking pilot.
 */

export interface SimClock {
  now: number; // epoch ms the whole app evaluates against
  mode: "live" | "replay";
  serviceDate: string; // YYYY-MM-DD (WIB calendar day)
  /** Human label, WIB. */
  label: string;
}

const WIB = 7 * 3.6e6;
export const DEFAULT_REPLAY = "10:15";

export function wibParts(epoch: number) {
  const d = new Date(epoch + WIB);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

export function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Epoch for a local wall time on a service date in a given UTC offset. */
export function localToEpoch(serviceDate: string, minutesAfterMidnight: number, tzOffsetH: number): number {
  const [y, m, d] = serviceDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, 0) + minutesAfterMidnight * 60_000 - tzOffsetH * 3.6e6;
}

export function previousSchoolDay(serviceDate: string): string {
  const [y, m, d] = serviceDate.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  do t.setUTCDate(t.getUTCDate() - 1);
  while (t.getUTCDay() === 0 || t.getUTCDay() === 6);
  return dateKey(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

export function isSchoolDay(serviceDate: string) {
  const [y, m, d] = serviceDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow !== 0 && dow !== 6;
}

function parseHHMM(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

export function resolveClock(override?: string | null, realNow = Date.now()): SimClock {
  const p = wibParts(realNow);
  const today = dateKey(p.y, p.m, p.d);
  const forced = parseHHMM(override);
  if (forced !== null) {
    const date = isSchoolDay(today) ? today : previousSchoolDay(today);
    const now = localToEpoch(date, forced, 7);
    return { now, mode: "replay", serviceDate: date, label: fmtLabel(date, forced) };
  }
  const minutes = p.h * 60 + p.min;
  if (isSchoolDay(today) && minutes >= 5 * 60 && minutes < 14 * 60) {
    return { now: realNow, mode: "live", serviceDate: today, label: fmtLabel(today, minutes) };
  }
  const date = isSchoolDay(today) && minutes >= 14 * 60 ? today : previousSchoolDay(today);
  const at = parseHHMM(DEFAULT_REPLAY)!;
  return { now: localToEpoch(date, at, 7), mode: "replay", serviceDate: date, label: fmtLabel(date, at) };
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function fmtDateLong(serviceDate: string) {
  const [y, m, d] = serviceDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${HARI[dow]}, ${d} ${BULAN[m - 1]} ${y}`;
}

function fmtLabel(serviceDate: string, minutes: number) {
  return `${fmtDateLong(serviceDate)} · ${fmtHM(minutes)} WIB`;
}

export function fmtHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

/** "07.24" for an epoch in a given tz offset. */
export function fmtClock(epoch: number, tzOffsetH = 7) {
  const d = new Date(epoch + tzOffsetH * 3.6e6);
  return `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function fmtDuration(min: number) {
  if (!Number.isFinite(min)) return "> 12 jam";
  if (min <= 0) return "habis";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} menit`;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}
