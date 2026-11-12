import type { AttendanceSummary } from "@/lib/api/courses";

/** "75% (3 de 4 aulas)", or a note while no lesson counted. */
export function attendanceLabel(a: AttendanceSummary | null) {
  if (!a || a.percent == null) return "Sem presença registrada";
  return `${a.percent}% (${a.present} de ${a.counted} ${a.counted === 1 ? "aula" : "aulas"})`;
}

/** Text colour for an attendance figure against the class's minimum. */
export function attendanceTone(meets: boolean | null, a: AttendanceSummary | null) {
  if (!a || a.percent == null) return "text-muted-foreground";
  return meets ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400";
}
