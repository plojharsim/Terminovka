export type EventType = "TEST" | "HOMEWORK" | "OTHER" | "DEADLINE";

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
  defaultRoom?: string | null;
  teacher?: string | null;
}

export interface StudentGroup {
  id: string;
  name: string;
  code: string;
  isDefaultAll: boolean;
}

export interface ScheduleSlot {
  id: string;
  dayOfWeek: number; // 1 to 5
  period: number; // 1 to 10
  startTime: string;
  endTime: string;
  room?: string | null;
  weekType: "ALL" | "EVEN" | "ODD" | "SELF_STUDY";
  subjectId: string;
  subject: Subject;
  groupId?: string | null;
  group?: StudentGroup | null;
}

export interface EventItem {
  id: string;
  title: string;
  type: EventType;
  date: string; // ISO string
  hasSpecificTime: boolean;
  startTime?: string | null;
  endTime?: string | null;
  period?: number | null;
  weight?: number | null;
  recurringId?: string | null;
  description?: string | null;
  attachmentUrl?: string | null;
  subjectId?: string | null;
  subject?: Subject | null;
  groupId?: string | null;
  group?: StudentGroup | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  createdAt: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
}

export interface MetaData {
  subjects: Subject[];
  groups: StudentGroup[];
  scheduleSlots: ScheduleSlot[];
  periodTimes: Record<number, { startTime: string; endTime: string }>;
  dayNames: Record<number, string>;
  currentWeekNumber: number;
  currentWeekType: "EVEN" | "ODD";
}
