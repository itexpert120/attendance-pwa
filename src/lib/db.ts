import Dexie, { type EntityTable } from 'dexie'
import { exportDB, importInto, peakImportFile } from 'dexie-export-import'
import type {
  AttendanceMark,
  ClassGroup,
  Enrollment,
  FeeEntry,
  Holiday,
  InstallmentMeta,
  Register,
  SchoolSettings,
  Student,
  StudentRemark,
} from './types'

class AttendanceDatabase extends Dexie {
  settings!: EntityTable<SchoolSettings, 'id'>
  classGroups!: EntityTable<ClassGroup, 'id'>
  students!: EntityTable<Student, 'id'>
  enrollments!: EntityTable<Enrollment, 'id'>
  registers!: EntityTable<Register, 'id'>
  attendance!: EntityTable<AttendanceMark, 'id'>
  holidays!: EntityTable<Holiday, 'id'>
  feeEntries!: EntityTable<FeeEntry, 'id'>
  installmentMeta!: EntityTable<InstallmentMeta, 'id'>
  remarks!: EntityTable<StudentRemark, 'id'>

  constructor() {
    super('students-attendance-register')

    this.version(1).stores({
      settings: 'id',
      classGroups: 'id, [className+section], createdAt',
      students: 'id, &admissionNumber, name, phone',
      enrollments: 'id, studentId, classGroupId, [classGroupId+rollNumber], admittedOn, struckOffOn',
      registers: 'id, classGroupId, [classGroupId+year+month], year, month, createdAt',
      attendance: 'id, registerId, enrollmentId, [registerId+enrollmentId], [registerId+day]',
      holidays: 'id, registerId, [registerId+day]',
      feeEntries: 'id, registerId, enrollmentId, [registerId+enrollmentId], [registerId+installment]',
      installmentMeta: 'id, registerId, [registerId+installment]',
      remarks: 'id, registerId, enrollmentId, [registerId+enrollmentId]',
    })
  }
}

export const db = new AttendanceDatabase()

export async function exportAttendanceDatabase() {
  return exportDB(db, { prettyJson: true })
}

export async function inspectAttendanceBackup(file: Blob) {
  return peakImportFile(file)
}

export async function restoreAttendanceDatabase(file: Blob) {
  await importInto(db, file, {
    acceptVersionDiff: true,
    overwriteValues: true,
    clearTablesBeforeImport: true,
  })
}
