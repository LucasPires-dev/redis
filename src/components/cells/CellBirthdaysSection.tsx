import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cake, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailSection } from "@/components/detail/DetailSection";
import { apiFetch } from "@/lib/api/client";

interface Birthday {
  id: string;
  name: string;
  day: number;
  cells: string[];
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Birthdays of the month in the cell, for its leadership (day and month only). */
export function CellBirthdaysSection({ cellId }: { cellId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data: rows } = useQuery({
    queryKey: ["birthdays", cellId, month],
    queryFn: () => apiFetch<Birthday[]>(`/api/birthdays/?cell=${cellId}&month=${month}`),
  });
  const step = (delta: number) => setMonth((m) => ((m - 1 + delta + 12) % 12) + 1);
  const today = month === now.getMonth() + 1 ? now.getDate() : null;

  return (
    <DetailSection title="Aniversariantes">
      <Card>
        <CardContent className="space-y-3 p-4" data-testid="cell-birthdays">
          <div className="flex items-center justify-between">
            <Button size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => step(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">{MONTHS[month - 1]}</div>
            <Button size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => step(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {rows && rows.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Ninguém faz aniversário neste mês (ou ainda não informou a data).
            </p>
          )}
          <ul className="space-y-1">
            {rows?.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm"
                data-testid="birthday"
              >
                <span className="flex items-center gap-2">
                  {r.day === today && <Cake className="h-4 w-4 text-primary" aria-label="Hoje" />}
                  {r.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {String(r.day).padStart(2, "0")}/{String(month).padStart(2, "0")}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </DetailSection>
  );
}
