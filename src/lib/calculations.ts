import type {
  AttendanceMark,
  AttendanceReport,
  ClassGroup,
  Enrollment,
  EnrollmentRow,
  FeeAmounts,
  FeeEntry,
  Holiday,
  InstallmentNumber,
  Register,
  ReportPeriodType,
  SchoolSettings,
  Student,
  TestProgress,
  SubjectReportPeriodType,
} from './types'
import { EMPTY_FEES } from './types'

export const ATTENDANCE_MARK_VALUE = 0.5

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

export function isAttendanceDateEditable(
  register: Register,
  day: number,
  currentDate = new Date(),
) {
  const attendanceDate = Date.UTC(register.year, register.month - 1, day)
  const today = Date.UTC(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  )
  const daysAgo = Math.floor((today - attendanceDate) / 86_400_000)
  return daysAgo >= 0 && daysAgo <= 7
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

export function academicYearStartYearForDate(date: string, settings: SchoolSettings) {
  const [year, month] = date.split('-').map(Number)
  return month >= settings.academicYearStartMonth ? year : year - 1
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
  ).length * ATTENDANCE_MARK_VALUE
}

export function presentAttendanceByEnrollment(
  marks: AttendanceMark[],
  registerIds: ReadonlySet<string>,
) {
  const totals = new Map<string, number>()
  for (const mark of marks) {
    if (mark.status !== 'P' || !registerIds.has(mark.registerId)) continue
    totals.set(
      mark.enrollmentId,
      (totals.get(mark.enrollmentId) ?? 0) + ATTENDANCE_MARK_VALUE,
    )
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
  ).length * ATTENDANCE_MARK_VALUE
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

export function reportPeriod(
  register: Register,
  type: ReportPeriodType,
  selectedDay: number,
) {
  const lastDay = daysInMonth(register.year, register.month)
  const safeDay = Math.max(1, Math.min(lastDay, selectedDay))
  if (type === 'monthly') {
    return {
      startDay: 1,
      endDay: lastDay,
      label: monthLabel(register.month, register.year),
    }
  }
  if (type === 'weekly') {
    const date = new Date(register.year, register.month - 1, safeDay)
    const mondayOffset = (date.getDay() + 6) % 7
    const startDay = Math.max(1, safeDay - mondayOffset)
    const endDay = Math.min(lastDay, startDay + 6)
    const formatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })
    return {
      startDay,
      endDay,
      label: `${formatter.format(new Date(register.year, register.month - 1, startDay))} – ${formatter.format(new Date(register.year, register.month - 1, endDay))}`,
    }
  }
  return {
    startDay: safeDay,
    endDay: safeDay,
    label: new Intl.DateTimeFormat('en', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(register.year, register.month - 1, safeDay)),
  }
}

export function attendanceReport(
  rows: EnrollmentRow[],
  marks: AttendanceMark[],
  holidays: Holiday[],
  register: Register,
  type: ReportPeriodType,
  selectedDay: number,
): AttendanceReport {
  const period = reportPeriod(register, type, selectedDay)
  const marksByCell = new Map(
    marks
      .filter((mark) => mark.registerId === register.id)
      .map((mark) => [`${mark.enrollmentId}:${mark.day}:${mark.session}`, mark.status]),
  )
  const students = rows.map((row) => {
    let present = 0
    let absent = 0
    let leave = 0
    let unmarked = 0
    const absentSessions: Array<1 | 2> = []

    for (let day = period.startDay; day <= period.endDay; day += 1) {
      const date = dateKey(register.year, register.month, day)
      if (isHolidayDay(holidays, register, day) || !isEnrollmentActiveOn(row.enrollment, date)) {
        continue
      }
      for (const session of [1, 2] as const) {
        const status = marksByCell.get(`${row.enrollment.id}:${day}:${session}`)
        if (status === 'P') present += ATTENDANCE_MARK_VALUE
        else if (status === 'A') {
          absent += ATTENDANCE_MARK_VALUE
          if (type === 'daily') absentSessions.push(session)
        } else if (status === 'L') leave += ATTENDANCE_MARK_VALUE
        else unmarked += ATTENDANCE_MARK_VALUE
      }
    }

    return { ...row, present, absent, leave, unmarked, absentSessions }
  })
  return {
    type,
    ...period,
    possible: students.reduce(
      (total, student) => total + student.present + student.absent + student.leave + student.unmarked,
      0,
    ),
    present: students.reduce((total, student) => total + student.present, 0),
    absent: students.reduce((total, student) => total + student.absent, 0),
    leave: students.reduce((total, student) => total + student.leave, 0),
    unmarked: students.reduce((total, student) => total + student.unmarked, 0),
    students,
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

export function testSummary(
  test: { id: string; totalMarks: number },
  roster: Array<{ testId: string; enrollmentId: string }>,
  results: Array<{
    testId: string
    enrollmentId: string
    status: 'marks' | 'absent'
    marks?: number
  }>,
) {
  const members = roster.filter((entry) => entry.testId === test.id)
  const memberIds = new Set(members.map((entry) => entry.enrollmentId))
  const testResults = results.filter(
    (result) => result.testId === test.id && memberIds.has(result.enrollmentId),
  )
  const numericMarks = testResults
    .filter((result) => result.status === 'marks')
    .map((result) => result.marks ?? 0)
  const absentCount = testResults.filter((result) => result.status === 'absent').length
  const notEnteredCount = members.length - testResults.length
  const progress: TestProgress =
    testResults.length === 0
      ? 'not-started'
      : notEnteredCount === 0
        ? 'complete'
        : 'in-progress'

  return {
    progress,
    numericCount: numericMarks.length,
    absentCount,
    notEnteredCount,
    average: numericMarks.length
      ? numericMarks.reduce((total, marks) => total + marks, 0) / numericMarks.length
      : null,
    highest: numericMarks.length ? Math.max(...numericMarks) : null,
    lowest: numericMarks.length ? Math.min(...numericMarks) : null,
  }
}

export function marksPercentage(marks: number, totalMarks: number) {
  return totalMarks > 0 ? (marks / totalMarks) * 100 : 0
}

export function testCountsBySubject(
  subjects: Array<{ id: string; name?: string; archivedAt?: string }>,
  tests: Array<{ subjectId: string }>,
) {
  return {
    total: tests.length,
    bySubject: subjects
      .filter((subject) => !subject.archivedAt)
      .map((subject) => ({
        subjectId: subject.id,
        count: tests.filter((test) => test.subjectId === subject.id).length,
      })),
  }
}

export function subjectReportPeriod(type: SubjectReportPeriodType, anchorDate: string) {
  const anchor = new Date(`${anchorDate}T00:00:00`)
  if (!anchorDate || Number.isNaN(anchor.getTime())) {
    return { startDate: '', endDate: '', label: 'Choose a report date' }
  }
  if (type === 'daily') {
    return {
      startDate: anchorDate,
      endDate: anchorDate,
      label: new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(anchor),
    }
  }
  if (type === 'monthly') {
    const year = anchor.getFullYear()
    const month = anchor.getMonth() + 1
    return {
      startDate: dateKey(year, month, 1),
      endDate: dateKey(year, month, daysInMonth(year, month)),
      label: new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(anchor),
    }
  }

  const mondayOffset = (anchor.getDay() + 6) % 7
  const start = new Date(anchor)
  start.setDate(anchor.getDate() - mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
  const shortDateWithYear = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return {
    startDate: dateKey(start.getFullYear(), start.getMonth() + 1, start.getDate()),
    endDate: dateKey(end.getFullYear(), end.getMonth() + 1, end.getDate()),
    label: `${shortDate.format(start)} – ${shortDateWithYear.format(end)}`,
  }
}

export function testReportAggregate(
  tests: Array<{ id: string; totalMarks: number }>,
  roster: Array<{ testId: string; enrollmentId: string }>,
  results: Array<{
    testId: string
    enrollmentId: string
    status: 'marks' | 'absent'
    marks?: number
  }>,
) {
  const testIds = new Set(tests.map((test) => test.id))
  const rosterKeys = new Set(
    roster
      .filter((entry) => testIds.has(entry.testId))
      .map((entry) => `${entry.testId}:${entry.enrollmentId}`),
  )
  const relevantResults = results.filter(
    (result) =>
      testIds.has(result.testId) && rosterKeys.has(`${result.testId}:${result.enrollmentId}`),
  )
  const testMap = new Map(tests.map((test) => [test.id, test]))
  const percentages = relevantResults
    .filter((result) => result.status === 'marks')
    .map((result) => {
      const test = testMap.get(result.testId)
      return test ? marksPercentage(result.marks ?? 0, test.totalMarks) : 0
    })
  const rosterCount = roster.filter((entry) => testIds.has(entry.testId)).length

  return {
    totalTests: tests.length,
    numericCount: percentages.length,
    absentCount: relevantResults.filter((result) => result.status === 'absent').length,
    notEnteredCount: rosterCount - relevantResults.length,
    averagePercentage: percentages.length
      ? percentages.reduce((total, percentage) => total + percentage, 0) / percentages.length
      : null,
  }
}
