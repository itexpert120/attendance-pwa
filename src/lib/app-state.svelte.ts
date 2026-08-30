import { db, exportAttendanceDatabase, inspectAttendanceBackup, restoreAttendanceDatabase } from './db'
import { SvelteSet } from 'svelte/reactivity'
import {
  dateKey,
  daysInMonth,
  isAttendanceDateEditable,
  isEnrollmentActiveOn,
  isHolidayDay,
  rowsForClass,
} from './calculations'
import type {
  AttendanceMark,
  AttendanceStatus,
  ClassGroup,
  Enrollment,
  FeeAmounts,
  FeeEntry,
  Holiday,
  InstallmentMeta,
  InstallmentNumber,
  Register,
  SchoolSettings,
  SessionNumber,
  Student,
  StudentRemark,
} from './types'
import { normalizePhoneNumber } from './phone'

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()

export class AttendanceState {
  ready = $state(false)
  busy = $state(false)
  error = $state('')
  storagePersistent = $state<boolean | null>(null)
  settings = $state<SchoolSettings | null>(null)
  classGroups = $state<ClassGroup[]>([])
  students = $state<Student[]>([])
  enrollments = $state<Enrollment[]>([])
  registers = $state<Register[]>([])
  marks = $state<AttendanceMark[]>([])
  holidays = $state<Holiday[]>([])
  feeEntries = $state<FeeEntry[]>([])
  installmentMeta = $state<InstallmentMeta[]>([])
  remarks = $state<StudentRemark[]>([])
  selectedRegisterId = $state<string | null>(null)

  selectedRegister = $derived(
    this.registers.find((register) => register.id === this.selectedRegisterId) ?? null,
  )

  async initialize() {
    if (this.ready || this.busy) return
    this.busy = true
    this.error = ''
    try {
      await db.open()
      await this.refresh()
      if ('storage' in navigator && navigator.storage.persisted) {
        this.storagePersistent = await navigator.storage.persisted()
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not open the offline database.'
    } finally {
      this.busy = false
      this.ready = true
    }
  }

  async refresh() {
    const [
      settings,
      classGroups,
      students,
      enrollments,
      registers,
      marks,
      holidays,
      feeEntries,
      installmentMeta,
      remarks,
    ] = await Promise.all([
      db.settings.get('school'),
      db.classGroups.toArray(),
      db.students.toArray(),
      db.enrollments.toArray(),
      db.registers.toArray(),
      db.attendance.toArray(),
      db.holidays.toArray(),
      db.feeEntries.toArray(),
      db.installmentMeta.toArray(),
      db.remarks.toArray(),
    ])
    this.settings = settings
      ? {
          ...settings,
          classInchargeName: settings.classInchargeName ?? settings.headmasterName ?? '',
        }
      : null
    this.classGroups = classGroups.sort((a, b) =>
      `${a.className}${a.section}`.localeCompare(`${b.className}${b.section}`, undefined, {
        numeric: true,
      }),
    )
    const normalizedStudents = students.map((student) => {
      try {
        const normalizedPhone = normalizePhoneNumber(student.phone)
        return normalizedPhone === student.phone ? student : { ...student, phone: normalizedPhone }
      } catch {
        return student
      }
    })
    const migratedStudents = normalizedStudents.filter(
      (student, index) => student.phone !== students[index]?.phone,
    )
    if (migratedStudents.length) await db.students.bulkPut(migratedStudents)
    this.students = normalizedStudents
    this.enrollments = enrollments
    this.registers = registers.sort(
      (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month),
    )
    this.marks = marks
    this.holidays = holidays
    this.feeEntries = feeEntries
    this.installmentMeta = installmentMeta
    this.remarks = remarks
  }

  async completeSetup(input: {
    schoolName: string
    className: string
    section: string
    academicYearStartMonth: number
    currencyLabel: string
    classInchargeName: string
    logoDataUrl?: string
  }) {
    const group: ClassGroup = {
      id: id(),
      className: input.className.trim(),
      section: input.section.trim(),
      createdAt: now(),
    }
    const settings: SchoolSettings = {
      id: 'school',
      schoolName: input.schoolName.trim(),
      academicYearStartMonth: input.academicYearStartMonth,
      currencyLabel: input.currencyLabel.trim() || 'Rs.',
      classInchargeName: input.classInchargeName.trim(),
      logoDataUrl: input.logoDataUrl,
      updatedAt: now(),
    }
    await db.transaction('rw', [db.settings, db.classGroups], async () => {
      await db.settings.put(settings)
      await db.classGroups.add(group)
    })
    await this.requestPersistentStorage()
    await this.refresh()
  }

  async saveSettings(settings: Omit<SchoolSettings, 'id' | 'updatedAt'>) {
    await db.settings.put({ ...settings, id: 'school', updatedAt: now() })
    await this.refresh()
  }

  async addClass(className: string, section: string) {
    const normalizedClass = className.trim()
    const normalizedSection = section.trim()
    const exists = this.classGroups.some(
      (group) =>
        group.className.toLowerCase() === normalizedClass.toLowerCase() &&
        group.section.toLowerCase() === normalizedSection.toLowerCase(),
    )
    if (exists) throw new Error('That class and section already exists.')
    await db.classGroups.add({
      id: id(),
      className: normalizedClass,
      section: normalizedSection,
      createdAt: now(),
    })
    await this.refresh()
  }

  async duplicateClass(
    sourceClassGroupId: string,
    className: string,
    section: string,
    admittedOn: string,
  ) {
    const normalizedClass = className.trim()
    const normalizedSection = section.trim()
    if (!normalizedClass || !normalizedSection) throw new Error('Class and section are required.')
    const exists = this.classGroups.some(
      (group) =>
        group.className.toLowerCase() === normalizedClass.toLowerCase() &&
        group.section.toLowerCase() === normalizedSection.toLowerCase(),
    )
    if (exists) throw new Error('That class and section already exists.')
    const source = this.classGroups.find((group) => group.id === sourceClassGroupId)
    if (!source) throw new Error('Select a class to duplicate.')

    const group: ClassGroup = {
      id: id(),
      className: normalizedClass,
      section: normalizedSection,
      createdAt: now(),
    }
    const sourceEnrollments = this.enrollments.filter(
      (enrollment) =>
        enrollment.classGroupId === sourceClassGroupId &&
        isEnrollmentActiveOn(enrollment, admittedOn),
    )
    const duplicatedEnrollments: Enrollment[] = sourceEnrollments.map((enrollment) => ({
      id: id(),
      studentId: enrollment.studentId,
      classGroupId: group.id,
      rollNumber: enrollment.rollNumber,
      admittedOn,
    }))
    await db.transaction('rw', [db.classGroups, db.enrollments], async () => {
      await db.classGroups.add(group)
      if (duplicatedEnrollments.length) await db.enrollments.bulkAdd(duplicatedEnrollments)
    })
    await this.refresh()
    return group
  }

  async saveStudent(input: {
    studentId?: string
    enrollmentId?: string
    classGroupId: string
    admissionNumber: string
    rollNumber: string
    name: string
    phone: string
    dateOfBirth?: string
    photoDataUrl?: string
    admittedOn: string
    struckOffOn?: string
  }) {
    const admissionNumber = input.admissionNumber.trim()
    const rollNumber = input.rollNumber.trim()
    const phone = normalizePhoneNumber(input.phone)
    const duplicateAdmission = this.students.find(
      (student) =>
        student.admissionNumber.toLowerCase() === admissionNumber.toLowerCase() &&
        student.id !== input.studentId,
    )
    if (duplicateAdmission) throw new Error('Admission number must be unique.')
    const duplicateRoll = this.enrollments.find(
      (enrollment) =>
        enrollment.classGroupId === input.classGroupId &&
        enrollment.rollNumber.toLowerCase() === rollNumber.toLowerCase() &&
        enrollment.id !== input.enrollmentId &&
        (!enrollment.struckOffOn || enrollment.struckOffOn >= input.admittedOn),
    )
    if (duplicateRoll) throw new Error('Roll number is already active in this class.')
    if (input.struckOffOn && input.struckOffOn < input.admittedOn) {
      throw new Error('Struck-off date cannot be before admission date.')
    }

    const student: Student = {
      id: input.studentId ?? id(),
      admissionNumber,
      name: input.name.trim(),
      phone,
      dateOfBirth: input.dateOfBirth || undefined,
      photoDataUrl: input.photoDataUrl || undefined,
      createdAt: this.students.find((item) => item.id === input.studentId)?.createdAt ?? now(),
    }
    const enrollment: Enrollment = {
      id: input.enrollmentId ?? id(),
      studentId: student.id,
      classGroupId: input.classGroupId,
      rollNumber,
      admittedOn: input.admittedOn,
      struckOffOn: input.struckOffOn || undefined,
    }
    await db.transaction('rw', [db.students, db.enrollments], async () => {
      await db.students.put(student)
      await db.enrollments.put(enrollment)
    })
    await this.refresh()
  }

  async createRegister(classGroupId: string, year: number, month: number) {
    const existing = this.registers.find(
      (register) =>
        register.classGroupId === classGroupId && register.year === year && register.month === month,
    )
    if (existing) {
      this.selectedRegisterId = existing.id
      return existing
    }
    const register: Register = { id: id(), classGroupId, year, month, createdAt: now() }
    await db.registers.add(register)
    await this.refresh()
    this.selectedRegisterId = register.id
    return register
  }

  selectRegister(registerId: string | null) {
    this.selectedRegisterId = registerId
  }

  rowsForRegister(register: Register) {
    return rowsForClass(this.enrollments, this.students, register.classGroupId, register)
  }

  async setMark(
    register: Register,
    enrollment: Enrollment,
    day: number,
    session: SessionNumber,
    status: AttendanceStatus | null,
  ) {
    if (!isAttendanceDateEditable(register, day)) return
    const markId = `${register.id}:${enrollment.id}:${day}:${session}`
    const date = dateKey(register.year, register.month, day)
    if (isHolidayDay(this.holidays, register, day) || !isEnrollmentActiveOn(enrollment, date)) return
    if (status) {
      const mark: AttendanceMark = {
        id: markId,
        registerId: register.id,
        enrollmentId: enrollment.id,
        day,
        session,
        status,
      }
      await db.attendance.put(mark)
      this.marks = [...this.marks.filter((item) => item.id !== markId), mark]
    } else {
      await db.attendance.delete(markId)
      this.marks = this.marks.filter((item) => item.id !== markId)
    }
  }

  async bulkSetMarks(
    register: Register,
    day: number,
    session: SessionNumber,
    status: AttendanceStatus | null,
  ) {
    if (!isAttendanceDateEditable(register, day)) return
    if (isHolidayDay(this.holidays, register, day)) return
    const date = dateKey(register.year, register.month, day)
    const rows = this.rowsForRegister(register).filter((row) =>
      isEnrollmentActiveOn(row.enrollment, date),
    )
    await db.transaction('rw', db.attendance, async () => {
      if (status) {
        await db.attendance.bulkPut(
          rows.map(({ enrollment }) => ({
            id: `${register.id}:${enrollment.id}:${day}:${session}`,
            registerId: register.id,
            enrollmentId: enrollment.id,
            day,
            session,
            status,
          })),
        )
      } else {
        await db.attendance.bulkDelete(
          rows.map(({ enrollment }) => `${register.id}:${enrollment.id}:${day}:${session}`),
        )
      }
    })
    const activeEnrollmentIds = new SvelteSet(rows.map(({ enrollment }) => enrollment.id))
    const retainedMarks = this.marks.filter(
      (mark) =>
        mark.registerId !== register.id ||
        mark.day !== day ||
        mark.session !== session ||
        !activeEnrollmentIds.has(mark.enrollmentId),
    )
    this.marks = status
      ? [
          ...retainedMarks,
          ...rows.map(({ enrollment }) => ({
            id: `${register.id}:${enrollment.id}:${day}:${session}`,
            registerId: register.id,
            enrollmentId: enrollment.id,
            day,
            session,
            status,
          })),
        ]
      : retainedMarks
  }

  async toggleHoliday(register: Register, day: number, reason = 'School holiday') {
    if (!isAttendanceDateEditable(register, day)) return
    const holidayId = `${register.id}:${day}`
    const existing = this.holidays.find((holiday) => holiday.id === holidayId)
    if (existing) {
      await db.holidays.delete(holidayId)
      this.holidays = this.holidays.filter((holiday) => holiday.id !== holidayId)
    } else {
      const holiday: Holiday = {
        id: holidayId,
        registerId: register.id,
        day,
        title: reason.trim() || 'School holiday',
      }
      await db.transaction('rw', [db.holidays, db.attendance], async () => {
        await db.attendance.where('[registerId+day]').equals([register.id, day]).delete()
        await db.holidays.put(holiday)
      })
      this.holidays = [...this.holidays, holiday]
      this.marks = this.marks.filter(
        (mark) => mark.registerId !== register.id || mark.day !== day,
      )
    }
  }

  async saveFeeEntries(
    registerId: string,
    enrollmentId: string,
    entries: Array<{ installment: InstallmentNumber; amounts: FeeAmounts }>,
  ) {
    const nextEntries: FeeEntry[] = entries.map(({ installment, amounts }) => ({
      id: `${registerId}:${enrollmentId}:${installment}`,
      registerId,
      enrollmentId,
      installment,
      ...amounts,
    }))
    await db.transaction('rw', db.feeEntries, async () => {
      await db.feeEntries.bulkPut(nextEntries)
    })
    const nextIds = new SvelteSet(nextEntries.map((entry) => entry.id))
    this.feeEntries = [
      ...this.feeEntries.filter((entry) => !nextIds.has(entry.id)),
      ...nextEntries,
    ]
  }

  async saveInstallmentMeta(
    registerId: string,
    installment: InstallmentNumber,
    rate: number,
    receiverName: string,
  ) {
    const meta: InstallmentMeta = {
      id: `${registerId}:${installment}`,
      registerId,
      installment,
      rate,
      receiverName: receiverName.trim(),
    }
    await db.installmentMeta.put(meta)
    this.installmentMeta = [
      ...this.installmentMeta.filter((item) => item.id !== meta.id),
      meta,
    ]
  }

  async saveRemark(registerId: string, enrollmentId: string, text: string) {
    const remarkId = `${registerId}:${enrollmentId}`
    if (text.trim()) {
      const remark: StudentRemark = {
        id: remarkId,
        registerId,
        enrollmentId,
        text: text.trim(),
      }
      await db.remarks.put(remark)
      this.remarks = [...this.remarks.filter((item) => item.id !== remarkId), remark]
    } else {
      await db.remarks.delete(remarkId)
      this.remarks = this.remarks.filter((item) => item.id !== remarkId)
    }
  }

  async requestPersistentStorage() {
    if ('storage' in navigator && navigator.storage.persist) {
      this.storagePersistent = await navigator.storage.persist()
    }
  }

  async backup() {
    return exportAttendanceDatabase()
  }

  async inspectBackup(file: File) {
    return inspectAttendanceBackup(file)
  }

  async restore(file: File) {
    await restoreAttendanceDatabase(file)
    this.selectedRegisterId = null
    await this.refresh()
  }

  currentMonthDate(register: Register, preferredDay = 1) {
    return dateKey(register.year, register.month, Math.min(preferredDay, daysInMonth(register.year, register.month)))
  }
}
