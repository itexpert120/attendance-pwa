export type AttendanceStatus = "P" | "A" | "L";
export type SessionNumber = 1 | 2;
export type InstallmentNumber = 1 | 2 | 3;

export interface SchoolSettings {
  id: "school";
  schoolName: string;
  academicYearStartMonth: number;
  currencyLabel: string;
  classInchargeName: string;
  logoDataUrl?: string;
  /** Optional so backups created before custom messaging remain compatible. */
  absenceMessageTemplate?: string;
  /** Kept optional so older device backups can be migrated without data loss. */
  headmasterName?: string;
  updatedAt: string;
}

export interface ClassGroup {
  id: string;
  className: string;
  section: string;
  createdAt: string;
}

export interface Student {
  id: string;
  admissionNumber: string;
  name: string;
  phone: string;
  dateOfBirth?: string;
  photoDataUrl?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  normalizedName: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classGroupId: string;
  rollNumber: string;
  admittedOn: string;
  struckOffOn?: string;
}

export interface TestRecord {
  id: string;
  name: string;
  normalizedName: string;
  subjectId: string;
  classGroupId: string;
  date: string;
  totalMarks: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestRosterEntry {
  id: string;
  testId: string;
  enrollmentId: string;
  createdAt: string;
}

export type TestResultStatus = "marks" | "absent";
export type TestProgress = "not-started" | "in-progress" | "complete";
export type SubjectReportPeriodType = "daily" | "weekly" | "monthly";

export interface TestResult {
  id: string;
  testId: string;
  enrollmentId: string;
  status: TestResultStatus;
  marks?: number;
  updatedAt: string;
}

export interface TestRosterRow extends EnrollmentRow {
  rosterEntry: TestRosterEntry;
  result?: TestResult;
}

export interface HomeworkItem {
  subjectId: string;
  details: string;
  order: number;
}

export interface DailyHomeworkReport {
  id: string;
  classGroupId: string;
  date: string;
  inchargeName: string;
  parentNote: string;
  items: HomeworkItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Register {
  id: string;
  classGroupId: string;
  year: number;
  month: number;
  createdAt: string;
}

export interface AttendanceMark {
  id: string;
  registerId: string;
  enrollmentId: string;
  day: number;
  session: SessionNumber;
  status: AttendanceStatus;
}

export interface Holiday {
  id: string;
  registerId: string;
  day: number;
  title: string;
}

export interface FeeAmounts {
  ftf: number;
  ff: number;
  arrears: number;
  lateCertificate: number;
  slc: number;
  dcf: number;
}

export interface FeeEntry extends FeeAmounts {
  id: string;
  registerId: string;
  enrollmentId: string;
  installment: InstallmentNumber;
}

export interface InstallmentMeta {
  id: string;
  registerId: string;
  installment: InstallmentNumber;
  rate: number;
  receiverName: string;
}

export interface StudentRemark {
  id: string;
  registerId: string;
  enrollmentId: string;
  text: string;
}

export interface EnrollmentRow {
  enrollment: Enrollment;
  student: Student;
}

export type ReportPeriodType = "daily" | "weekly" | "monthly";

export interface AttendanceReportStudent extends EnrollmentRow {
  present: number;
  absent: number;
  leave: number;
  unmarked: number;
  absentSessions: SessionNumber[];
}

export interface AttendanceReport {
  type: ReportPeriodType;
  startDay: number;
  endDay: number;
  label: string;
  possible: number;
  present: number;
  absent: number;
  leave: number;
  unmarked: number;
  students: AttendanceReportStudent[];
}

export const EMPTY_FEES: FeeAmounts = {
  ftf: 0,
  ff: 0,
  arrears: 0,
  lateCertificate: 0,
  slc: 0,
  dcf: 0,
};

export const FEE_FIELDS: Array<{
  key: keyof FeeAmounts;
  label: string;
  shortLabel: string;
}> = [
  { key: "ftf", label: "F.T.F", shortLabel: "F.T.F" },
  { key: "ff", label: "Fine Fund", shortLabel: "F.F" },
  { key: "arrears", label: "Arrears", shortLabel: "Arrears" },
  {
    key: "lateCertificate",
    label: "Late Certificate Fee",
    shortLabel: "Late Cert.",
  },
  { key: "slc", label: "S.L.C", shortLabel: "S.L.C" },
  { key: "dcf", label: "D.C.F", shortLabel: "D.C.F" },
];
