import type {
  AttendanceMark,
  ClassGroup,
  Enrollment,
  EnrollmentRow,
  FeeAmounts,
  FeeEntry,
  Holiday,
  InstallmentNumber,
  Register,
  SchoolSettings,
  Student,
} from './types'
import { EMPTY_FEES } from './types'

export const pad = (value: number) => String(value).padStart(2, '0')

export function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function monthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  )
}

export function shortMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  )
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function daysForRegister(register: Register) {
  return Array.from({ length: daysInMonth(register.year, register.month) }, (_, index) => index + 1)
}

export function weekdayLabel(year: number, month: number, day: number) {
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(year, month - 1, day))
}

export function isWeekend(year: number, month: number, day: number) {
  const weekday = new Date(year, month - 1, day).getDay()
  return weekday === 0 || weekday === 6
}

export function isEnrollmentActiveOn(enrollment: Enrollment, date: string) {
  return enrollment.admittedOn <= date && (!enrollment.struckOffOn || enrollment.struckOffOn >= date)
}

export function isEnrollmentInMonth(enrollment: Enrollment, register: Register) {
  const start = dateKey(register.year, register.month, 1)
  const end = dateKey(register.year, register.month, daysInMonth(register.year, register.month))
  return enrollment.admittedOn <= end && (!enrollment.struckOffOn || enrollment.struckOffOn >= start)
}

export function rowsForClass(
  enrollments: Enrollment[],
  students: Student[],
  classGroupId: string,
  register?: Register,
): EnrollmentRow[] {
  const studentMap = new Map(students.map((student) => [student.id, student]))
  return enrollments
    .filter(
      (enrollment) =>
        enrollment.classGroupId === classGroupId && (!register || isEnrollmentInMonth(enrollment, register)),
    )
    .map((enrollment) => ({ enrollment, student: studentMap.get(enrollment.studentId)! }))
    .filter((row) => Boolean(row.student))
    .sort((a, b) =>
      a.enrollment.rollNumber.localeCompare(b.enrollment.rollNumber, undefined, { numeric: true }),
    )
}

export function academicYearStartYear(register: Register, settings: SchoolSettings) {
  return register.month >= settings.academicYearStartMonth ? register.year : register.year - 1
}

export function isRegisterEarlierInAcademicYear(
  candidate: Register,
  current: Register,
  settings: SchoolSettings,
) {
  if (candidate.classGroupId !== current.classGroupId) return false
  const academicStart = academicYearStartYear(current, settings)
  const candidateStart = academicYearStartYear(candidate, settings)
  if (candidateStart !== academicStart) return false
  return candidate.year * 12 + candidate.month < current.year * 12 + current.month
}

export function customHolidayForDay(holidays: Holiday[], registerId: string, day: number) {
  return holidays.find((holiday) => holiday.registerId === registerId && holiday.day === day)
}

export function isHolidayDay(holidays: Holiday[], register: Register, day: number) {
  return isWeekend(register.year, register.month, day) || Boolean(customHolidayForDay(holidays, register.id, day))
}

export function markForCell(
  marks: AttendanceMark[],
  registerId: string,
  enrollmentId: string,
  day: number,
  session: 1 | 2,
) {
  return marks.find(
    (mark) =>
      mark.registerId === registerId &&
      mark.enrollmentId === enrollmentId &&
      mark.day === day &&
      mark.session === session,
  )
}

export function currentAttendance(
  marks: AttendanceMark[],
  registerId: string,
  enrollmentId?: string,
) {
  return marks.filter(
    (mark) =>
      mark.registerId === registerId &&
      mark.status === 'P' &&
      (!enrollmentId || mark.enrollmentId === enrollmentId),
  ).length
}

export function presentAttendanceByEnrollment(
  marks: AttendanceMark[],
  registerIds: ReadonlySet<string>,
) {
  const totals = new Map<string, number>()
  for (const mark of marks) {
    if (mark.status !== 'P' || !registerIds.has(mark.registerId)) continue
    totals.set(mark.enrollmentId, (totals.get(mark.enrollmentId) ?? 0) + 1)
  }
  return totals
}

export function broughtForwardAttendance(
  marks: AttendanceMark[],
  registers: Register[],
  current: Register,
  settings: SchoolSettings,
  enrollmentId?: string,
) {
  const earlierRegisterIds = new Set(
    registers
      .filter((register) => isRegisterEarlierInAcademicYear(register, current, settings))
      .map((register) => register.id),
  )
  return marks.filter(
    (mark) =>
      earlierRegisterIds.has(mark.registerId) &&
      mark.status === 'P' &&
      (!enrollmentId || mark.enrollmentId === enrollmentId),
  ).length
}

export function workingTimings(register: Register, holidays: Holiday[]) {
  return daysForRegister(register).filter((day) => !isHolidayDay(holidays, register, day)).length * 2
}

export function monthlyMovement(rows: EnrollmentRow[], register: Register) {
  const start = dateKey(register.year, register.month, 1)
  const end = dateKey(register.year, register.month, daysInMonth(register.year, register.month))
  return {
    beginning: rows.filter((row) => isEnrollmentActiveOn(row.enrollment, start)).length,
    end: rows.filter((row) => isEnrollmentActiveOn(row.enrollment, end)).length,
    admitted: rows.filter(
      (row) => row.enrollment.admittedOn >= start && row.enrollment.admittedOn <= end,
    ).length,
    struckOff: rows.filter(
      (row) =>
        Boolean(row.enrollment.struckOffOn) &&
        row.enrollment.struckOffOn! >= start &&
        row.enrollment.struckOffOn! <= end,
    ).length,
  }
}

export function addFees(...amounts: FeeAmounts[]): FeeAmounts {
  return amounts.reduce<FeeAmounts>(
    (total, item) => ({
      ftf: total.ftf + item.ftf,
      ff: total.ff + item.ff,
      arrears: total.arrears + item.arrears,
      lateCertificate: total.lateCertificate + item.lateCertificate,
      slc: total.slc + item.slc,
      dcf: total.dcf + item.dcf,
    }),
    { ...EMPTY_FEES },
  )
}

export function feesForStudent(entries: FeeEntry[], registerId: string, enrollmentId: string) {
  return addFees(
    ...entries.filter(
      (entry) => entry.registerId === registerId && entry.enrollmentId === enrollmentId,
    ),
  )
}

export function feesByEnrollment(entries: FeeEntry[], registerId: string) {
  const totals = new Map<string, FeeAmounts>()
  for (const entry of entries) {
    if (entry.registerId !== registerId) continue
    const current = totals.get(entry.enrollmentId) ?? EMPTY_FEES
    totals.set(entry.enrollmentId, {
      ftf: current.ftf + entry.ftf,
      ff: current.ff + entry.ff,
      arrears: current.arrears + entry.arrears,
      lateCertificate: current.lateCertificate + entry.lateCertificate,
      slc: current.slc + entry.slc,
      dcf: current.dcf + entry.dcf,
    })
  }
  return totals
}

export function feesForInstallment(
  entries: FeeEntry[],
  registerId: string,
  installment: InstallmentNumber,
) {
  return addFees(
    ...entries.filter(
      (entry) => entry.registerId === registerId && entry.installment === installment,
    ),
  )
}

export function feeGrandTotal(amounts: FeeAmounts) {
  return (
    amounts.ftf +
    amounts.ff +
    amounts.arrears +
    amounts.lateCertificate +
    amounts.slc +
    amounts.dcf
  )
}

export function installmentStudentCount(
  entries: FeeEntry[],
  registerId: string,
  installment: InstallmentNumber,
) {
  return new Set(
    entries
      .filter(
        (entry) =>
          entry.registerId === registerId &&
          entry.installment === installment &&
          feeGrandTotal(entry) > 0,
      )
      .map((entry) => entry.enrollmentId),
  ).size
}

export function registerLabel(register: Register, classGroups: ClassGroup[]) {
  const group = classGroups.find((item) => item.id === register.classGroupId)
  return `${group?.className ?? 'Class'} · ${group?.section ?? 'Section'} · ${monthLabel(register.month, register.year)}`
}

export function minorToDisplay(value: number) {
  return (value / 100).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function displayToMinor(value: string | number) {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value || '0')
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric * 100) : 0
}
