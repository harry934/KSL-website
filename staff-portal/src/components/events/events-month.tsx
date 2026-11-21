"use client";

import { useMemo, useState } from "react";
import { calendarDay, type EventRow } from "@/lib/events";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function isoFrom(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A month view of events. Choosing a day opens that event. */
export function EventsMonth({ items, onOpen }: { items: EventRow[]; onOpen: (item: EventRow) => void }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const start = new Date(first);
    const mondayOffset = (first.getDay() + 6) % 7;
    start.setDate(1 - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const item of items) {
      const key = calendarDay(item.event_date);
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  function shift(amount: number) {
    const date = new Date(cursor.year, cursor.month + amount, 1);
    setCursor({ year: date.getFullYear(), month: date.getMonth() });
  }

  return (
    <div className="border border-[#e3e8ee] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#eef1f4] px-4 py-3">
        <button type="button" className="text-[13px] font-semibold text-[#0b1f3a]" onClick={() => shift(-1)}>
          Previous
        </button>
        <p className="m-0 text-[15px] font-bold text-[#0b1f3a]">{monthLabel(cursor.year, cursor.month)}</p>
        <button type="button" className="text-[13px] font-semibold text-[#0b1f3a]" onClick={() => shift(1)}>
          Next
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-[#eef1f4] text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7785]">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const iso = isoFrom(date);
          const events = byDay.get(iso) ?? [];
          const inMonth = date.getMonth() === cursor.month;
          return (
            <div key={iso} className={`min-h-[88px] border-b border-r border-[#eef1f4] p-1.5 ${inMonth ? "bg-white" : "bg-[#f7f8fa]"}`}>
              <p className={`m-0 text-[12px] font-semibold ${inMonth ? "text-[#0b1f3a]" : "text-[#98a3b1]"}`}>{date.getDate()}</p>
              <div className="mt-1 space-y-1">
                {events.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onOpen(event)}
                    className="block w-full truncate bg-[#eef3fb] px-1 py-0.5 text-left text-[11px] font-semibold text-[#0b1f3a]"
                    title={event.title}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
