import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db, exportAttendanceDatabase, restoreAttendanceDatabase } from './db'

describe('offline database backup', () => {
  beforeEach(async () => {
    db.close()
    await db.delete()
    await db.open()
  })

  afterAll(async () => {
    db.close()
    await db.delete()
  })

  it('round-trips all device-local records through a JSON blob', async () => {
    await db.settings.put({
      id: 'school',
      schoolName: 'Offline School',
      academicYearStartMonth: 4,
      currencyLabel: 'Rs.',
      classInchargeName: 'Class Incharge',
      updatedAt: '2026-08-29T00:00:00.000Z',
    })
    await db.students.put({
      id: 'student-1',
      admissionNumber: 'A-001',
      name: 'Test Student',
      phone: '+92 300 0000000',
      dateOfBirth: '2014-05-12',
      photoDataUrl: 'data:image/png;base64,dGVzdA==',
      createdAt: '2026-08-29T00:00:00.000Z',
    })
    await db.classGroups.put({
      id: 'class-1',
      className: '7',
      section: 'A',
      createdAt: '2026-08-29T00:00:00.000Z',
    })
    await db.enrollments.put({
      id: 'enrollment-1',
      studentId: 'student-1',
      classGroupId: 'class-1',
      rollNumber: '1',
      admittedOn: '2026-08-01',
    })
    await db.registers.put({
      id: 'register-1',
      classGroupId: 'class-1',
      year: 2026,
      month: 8,
      createdAt: '2026-08-29T00:00:00.000Z',
    })
    await db.attendance.put({
      id: 'register-1:enrollment-1:3:1',
      registerId: 'register-1',
      enrollmentId: 'enrollment-1',
      day: 3,
      session: 1,
      status: 'P',
    })
    await db.feeEntries.put({
      id: 'register-1:enrollment-1:1',
      registerId: 'register-1',
      enrollmentId: 'enrollment-1',
      installment: 1,
      ftf: 10000,
      ff: 500,
      arrears: 0,
      lateCertificate: 0,
      slc: 0,
      dcf: 0,
    })
    await db.subjects.put({
      id: 'subject-1',
      name: 'Mathematics',
      normalizedName: 'mathematics',
      createdAt: '2026-08-29T00:00:00.000Z',
      updatedAt: '2026-08-29T00:00:00.000Z',
    })
    await db.tests.put({
      id: 'test-1',
      name: 'Midterm',
      normalizedName: 'midterm',
      subjectId: 'subject-1',
      classGroupId: 'class-1',
      date: '2026-08-15',
      totalMarks: 40,
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    })
    await db.testRoster.put({
      id: 'test-1:enrollment-1',
      testId: 'test-1',
      enrollmentId: 'enrollment-1',
      createdAt: '2026-08-15T00:00:00.000Z',
    })
    await db.testResults.put({
      id: 'test-1:enrollment-1',
      testId: 'test-1',
      enrollmentId: 'enrollment-1',
      status: 'marks',
      marks: 35.5,
      updatedAt: '2026-08-15T00:00:00.000Z',
    })
    await db.homeworkReports.put({
      id: 'homework-1',
      classGroupId: 'class-1',
      date: '2026-08-15',
      inchargeName: 'Class Incharge',
      parentNote: 'Please sign the diary after checking the completed work.',
      items: [{ subjectId: 'subject-1', details: 'Complete exercise 4.', order: 0 }],
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    })

    const backup = await exportAttendanceDatabase()
    await db.settings.clear()
    await db.students.clear()
    expect(await db.students.count()).toBe(0)

    await restoreAttendanceDatabase(backup)

    expect((await db.settings.get('school'))?.schoolName).toBe('Offline School')
    expect((await db.students.get('student-1'))?.phone).toBe('+92 300 0000000')
    expect((await db.students.get('student-1'))?.dateOfBirth).toBe('2014-05-12')
    expect((await db.students.get('student-1'))?.photoDataUrl).toContain('data:image/png')
    expect((await db.attendance.get('register-1:enrollment-1:3:1'))?.status).toBe('P')
    expect((await db.feeEntries.get('register-1:enrollment-1:1'))?.ftf).toBe(10000)
    expect((await db.subjects.get('subject-1'))?.name).toBe('Mathematics')
    expect((await db.tests.get('test-1'))?.totalMarks).toBe(40)
    expect((await db.testRoster.get('test-1:enrollment-1'))?.enrollmentId).toBe('enrollment-1')
    expect((await db.testResults.get('test-1:enrollment-1'))?.marks).toBe(35.5)
    expect((await db.homeworkReports.get('homework-1'))?.items[0]?.details).toBe(
      'Complete exercise 4.',
    )
  })

  it('enforces unique admission numbers in device-local storage', async () => {
    await db.students.add({
      id: 'student-1',
      admissionNumber: 'A-001',
      name: 'First Student',
      phone: '',
      createdAt: '2026-08-29T00:00:00.000Z',
    })

    await expect(
      db.students.add({
        id: 'student-2',
        admissionNumber: 'A-001',
        name: 'Second Student',
        phone: '',
        createdAt: '2026-08-29T00:00:00.000Z',
      }),
    ).rejects.toThrow()
  })
})
