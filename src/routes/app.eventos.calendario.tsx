import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/detail/DetailSection";
import { EVENT_TYPE_LABEL, useEventsInRange, type Event } from "@/lib/api/production";
import { cn } from "@/lib/utils";

// "Calendário": the month's events. On the phone, a compact grid with a dot
// per event and the chosen day's list below; on wider screens the grid shows
// the titles too. Everyone sees the events they can see anywhere else.
export const Route = createFileRoute("/app/eventos/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Redis" }] }),
  component: CalendarPage,
});

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** The 6 weeks shown for a month, from the Sunday on/before the 1st. */
function gridDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from(
    { length: 42 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

function CalendarPage() {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(dayKey(today));
  const days = useMemo(() => gridDays(cursor.year, cursor.month), [cursor]);
  const { data: events, isLoading } = useEventsInRange(dayKey(days[0]), dayKey(days[41]));

  const byDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events ?? []) {
      const key = dayKey(new Date(e.starts_at));
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    for (const list of map.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return map;
  }, [events]);

  const move = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(
      dayKey(
        d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() ? today : d,
      ),
    );
  };

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const selectedDate = new Date(`${selected}T12:00:00`);
  const dayEvents = byDay.get(selected) ?? [];

  return (
    <div className="space-y-4" data-testid="calendar">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold capitalize" data-testid="calendar-month">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCursor({ year: today.getFullYear(), month: today.getMonth() });
              setSelected(dayKey(today));
            }}
          >
            Hoje
          </Button>
          <Button size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => move(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => move(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="py-1.5">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const key = dayKey(d);
            const list = byDay.get(key) ?? [];
            const inMonth = d.getMonth() === cursor.month;
            const isToday = key === dayKey(today);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-label={`${d.getDate()}, ${list.length} evento(s)`}
                aria-pressed={key === selected}
                data-testid="calendar-day"
                data-date={key}
                className={cn(
                  "flex min-h-14 flex-col items-center gap-1 border-b border-r p-1 text-left transition-colors sm:min-h-24 sm:items-stretch",
                  !inMonth && "bg-muted/30 text-muted-foreground",
                  key === selected ? "bg-primary/10" : "hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-xs tabular-nums",
                    isToday && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {d.getDate()}
                </span>
                {/* Phone: dots. Wider: the first titles. */}
                {list.length > 0 && (
                  <span className="flex gap-0.5 sm:hidden">
                    {list.slice(0, 3).map((e) => (
                      <span key={e.id} className="h-1.5 w-1.5 rounded-full bg-primary" />
                    ))}
                  </span>
                )}
                <span className="hidden w-full space-y-0.5 sm:block">
                  {list.slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      className="block truncate rounded bg-primary/10 px-1 py-0.5 text-[11px] text-foreground"
                    >
                      {time(e.starts_at)} {e.title}
                    </span>
                  ))}
                  {list.length > 2 && (
                    <span className="block px-1 text-[11px] text-muted-foreground">
                      +{list.length - 2}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium capitalize text-muted-foreground">
          {selectedDate.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h3>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : dayEvents.length === 0 ? (
          <EmptyState>Nenhum evento neste dia.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {dayEvents.map((e) => (
              <li key={e.id}>
                <Link
                  to="/app/eventos/$id"
                  params={{ id: e.id }}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
                  data-testid="calendar-event"
                >
                  <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">
                    {time(e.starts_at)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {e.title}
                      {e.series && (
                        <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.campus?.name ?? "Todos os campi"}
                    </span>
                  </span>
                  <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                    {EVENT_TYPE_LABEL[e.event_type]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
