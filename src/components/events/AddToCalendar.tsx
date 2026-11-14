// "Adicionar à agenda": Google Calendar link, or an .ics file (iPhone, Outlook
// and most calendar apps open it). Built in the browser: nothing to log into.
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string | null;
  location?: string;
}

const TWO_HOURS = 2 * 60 * 60 * 1000;

/** 2026-11-14T22:00:00.000Z → 20261114T220000Z */
function utcStamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function range(e: CalendarEvent) {
  const start = new Date(e.starts_at);
  const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + TWO_HOURS);
  return { start, end };
}

/** Escapes text for an iCalendar property value (RFC 5545). */
function icsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/[,;]/g, (c) => `\\${c}`);
}

function googleCalendarUrl(e: CalendarEvent, link: string) {
  const { start, end } = range(e);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
    details: [e.description, link].filter(Boolean).join("\n\n"),
  });
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsContent(e: CalendarEvent, link: string) {
  const { start, end } = range(e);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Redis//Eventos//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@redis`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText([e.description, link].filter(Boolean).join("\n\n"))}`,
    ...(e.location ? [`LOCATION:${icsText(e.location)}`] : []),
    `URL:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function download(e: CalendarEvent, link: string) {
  const blob = new Blob([icsContent(e, link)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "evento"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AddToCalendar({ event }: { event: CalendarEvent }) {
  const link =
    typeof window === "undefined" ? "" : `${window.location.origin}/app/eventos/${event.id}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <CalendarPlus className="h-4 w-4" /> Adicionar à agenda
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={googleCalendarUrl(event, link)} target="_blank" rel="noopener noreferrer">
            Google Agenda
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => download(event, link)}>
          iPhone, Outlook e outros (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
