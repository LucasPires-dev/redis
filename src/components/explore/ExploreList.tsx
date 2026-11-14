import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, GraduationCap, MapPin, Sparkles, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useExplore,
  type ExploreEvent,
  type PublicCell,
  type PublicClass,
} from "@/lib/api/explore";
import { WEEKDAY_LABEL } from "@/lib/api/courses";
import { formatTicketPrice } from "@/lib/api/payments";
import { formatDateTime } from "@/lib/utils";

const ALL = "all";

/** Everything churches opened to everyone: events, course classes and cells. */
export function ExploreList() {
  const [church, setChurch] = useState(ALL);
  const { data, isLoading } = useExplore(church === ALL ? undefined : church);

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const empty = !data.events.length && !data.classes.length && !data.cells.length;
  return (
    <div className="space-y-6" data-testid="explore">
      {(data.churches.length > 1 || church !== ALL) && (
        <Select value={church} onValueChange={setChurch}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Igreja">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as igrejas</SelectItem>
            {data.churches.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {empty && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nada aberto ao público por enquanto.
        </p>
      )}

      <Section title="Eventos" icon={CalendarDays} count={data.events.length}>
        {data.events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </Section>
      <Section title="Cursos" icon={GraduationCap} count={data.classes.length}>
        {data.classes.map((c) => (
          <ClassCard key={c.id} item={c} />
        ))}
      </Section>
      <Section title="Células" icon={Sparkles} count={data.cells.length}>
        {data.cells.map((c) => (
          <CellCard key={c.id} cell={c} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof CalendarDays;
  count: number;
  children: React.ReactNode;
}) {
  if (!count) return null;
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        <span className="text-muted-foreground">({count})</span>
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ItemCard({
  to,
  id,
  testId,
  children,
}: {
  to: "/evento/$id" | "/turma/$id" | "/celula/$id";
  id: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} params={{ id }} className="block" data-testid={testId}>
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardContent className="space-y-1 p-4">{children}</CardContent>
      </Card>
    </Link>
  );
}

function Line({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{children}</span>
    </p>
  );
}

function EventCard({ event }: { event: ExploreEvent }) {
  return (
    <ItemCard to="/evento/$id" id={event.id} testId="explore-event">
      <div className="font-medium">{event.title}</div>
      <Line icon={CalendarDays}>{formatDateTime(event.starts_at)}</Line>
      <Line icon={MapPin}>
        {[event.church?.name, event.campus?.name].filter(Boolean).join(" · ")}
      </Line>
      {event.registration && (
        <Line icon={Ticket}>
          Inscrição: {formatTicketPrice(event.registration.price_from_cents)}
        </Line>
      )}
    </ItemCard>
  );
}

function ClassCard({ item }: { item: PublicClass }) {
  const when = [item.weekday ? WEEKDAY_LABEL[item.weekday] : null, item.start_time]
    .filter(Boolean)
    .join(", ");
  return (
    <ItemCard to="/turma/$id" id={item.id} testId="explore-class">
      <div className="font-medium">{item.course_name}</div>
      <div className="text-xs text-muted-foreground">{item.name}</div>
      {when && <Line icon={Clock}>{when}</Line>}
      <Line icon={MapPin}>{[item.church.name, item.campus?.name].filter(Boolean).join(" · ")}</Line>
      <Line icon={Ticket}>{formatTicketPrice(item.base_price_cents)}</Line>
    </ItemCard>
  );
}

function CellCard({ cell }: { cell: PublicCell }) {
  return (
    <ItemCard to="/celula/$id" id={cell.id} testId="explore-cell">
      <div className="font-medium">Célula · {cell.church.name}</div>
      <Line icon={Clock}>
        {[cell.meeting_day_display, cell.meeting_time].filter(Boolean).join(", ")}
      </Line>
    </ItemCard>
  );
}
