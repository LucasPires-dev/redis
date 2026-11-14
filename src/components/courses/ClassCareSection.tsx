import { HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useClassCare, type CareStudent, type CourseClass } from "@/lib/api/courses";

function shortDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function reasonLabels(s: CareStudent) {
  return s.reasons.map((r) =>
    r === "absences_in_a_row"
      ? `${s.absences_in_a_row} faltas seguidas`
      : `Abaixo do mínimo (${s.attendance.percent}%)`,
  );
}

/**
 * Students who need a call or a visit: absences in a row in the latest
 * lessons, or attendance below the class's minimum. Hidden when nobody does.
 */
export function ClassCareSection({ courseClass }: { courseClass: CourseClass }) {
  const { data: students } = useClassCare(courseClass.id, courseClass.can_manage);
  if (!courseClass.can_manage || !students?.length) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5" data-testid="class-care">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <div>
            <h4 className="text-sm font-semibold">Alunos para cuidar ({students.length})</h4>
            <p className="text-xs text-muted-foreground">
              Uma ligação ou mensagem agora ajuda a não perder o aluno.
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {students.map((s) => (
            <li
              key={s.person.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-2"
              data-testid="care-student"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.person.name}</div>
                <div className="text-xs text-muted-foreground">
                  Presença {s.attendance.percent}% ({s.attendance.present} de {s.attendance.counted}
                  ) ·{" "}
                  {s.last_present_on
                    ? `última presença em ${shortDate(s.last_present_on)}`
                    : "nenhuma presença ainda"}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {reasonLabels(s).map((label) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
