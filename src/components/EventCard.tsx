"use client";

import React, { useState } from "react";
import { EventItem, UserSession } from "@/types";
import {
  formatCzechDate,
  getRelativeTimeCzech,
  EVENT_TYPE_CONFIG,
} from "@/lib/formatters";
import {
  ArrowRight,
  Clock,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  MapPin,
  Users,
} from "lucide-react";

interface EventCardProps {
  event: EventItem;
  currentUser: UserSession | null;
  onEdit: (event: EventItem) => void;
  onDelete: (eventId: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  currentUser,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeConfig = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.OTHER;
  const relative = getRelativeTimeCzech(event.date);

  const canManage =
    currentUser &&
    (currentUser.role === "ADMIN" || currentUser.userId === event.createdById);

  return (
    <div className="bg-white dark:bg-[#131738] rounded-xl border border-slate-200 dark:border-[#222752] p-6 sm:p-7 flex flex-col justify-between transition-all duration-150 hover:border-slate-400 dark:hover:border-[#DDA300]/60 shadow-xs hover:shadow-md">
      <div>
        {/* Top meta row: Subject, Type & Group */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Subject badge with school color */}
            {event.subject ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: event.subject.color }}
                />
                <span>{event.subject.name}</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  ({event.subject.code})
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                Bez předmětu
              </span>
            )}

            {/* Event Type label */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${
                event.type === "TEST"
                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                  : event.type === "HOMEWORK"
                  ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                  : event.type === "DEADLINE"
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {typeConfig.label}
            </span>

            {/* Group badge */}
            {event.group && !event.group.isDefaultAll && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                <Users className="w-3 h-3 text-[#DDA300]" />
                <span>{event.group.name}</span>
              </span>
            )}
          </div>

          {/* Urgency indicator */}
          <span
            className={`text-xs font-bold ${
              relative.isUrgent
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {relative.text}
          </span>
        </div>

        {/* Title: Big, bold and confident like ssps.cz cards */}
        <h3 className="text-lg sm:text-xl font-bold text-[#0D0F26] dark:text-white leading-snug tracking-tight mb-2.5">
          {event.title}
        </h3>

        {/* Date, Time & Location line */}
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-3.5">
          <div className="flex items-center space-x-1.5 font-medium">
            <Calendar className="w-4 h-4 text-[#DDA300]" />
            <span>{formatCzechDate(event.date)}</span>
          </div>

          {/* Time & Period: Only shown when event is tied to a timetable lesson or has deliberate time */}
          {event.period && (
            <div className="flex items-center space-x-1 font-semibold text-slate-800 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {event.period}. hodina
                {event.startTime && ` (${event.startTime} – ${event.endTime})`}
              </span>
            </div>
          )}

          {!event.period && event.hasSpecificTime && event.startTime && (
            <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {event.startTime}
                {event.endTime ? ` – ${event.endTime}` : ""}
              </span>
            </div>
          )}

          {/* Room: Only show room if the event has a period (i.e. tied to a scheduled timetable lesson) */}
          {event.period && event.subject?.defaultRoom && (
            <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>uč. {event.subject.defaultRoom}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed cursor-pointer mb-4 ${
              isExpanded ? "whitespace-pre-line" : "line-clamp-2"
            }`}
          >
            {event.description}
          </p>
        )}
      </div>

      {/* Card Footer: 'Zobrazit →' link matching the ssps.cz card button & actions */}
      <div className="pt-3.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs sm:text-sm">
        <div>
          {event.attachmentUrl ? (
            <a
              href={event.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 font-bold text-[#0D0F26] dark:text-[#DDA300] hover:underline group"
            >
              <span>Zobrazit zadání</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Vložil(a): {event.createdBy.name}
            </span>
          )}
        </div>

        {canManage && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onEdit(event)}
              className="p-1.5 text-slate-400 hover:text-[#0D0F26] dark:hover:text-white rounded-lg transition"
              title="Upravit událost"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
              title="Smazat událost"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
