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
      headmasterName: 'Headmaster',
      updatedAt: '2026-08-29T00:00:00.000Z',
    })
    await db.students.put({
      id: 'student-1',
      admissionNumber: 'A-001',
      name: 'Test Student',
      phone: '+92 300 0000000',
      createdAt: '2026-08-29T00:00:00.000Z',
    })

    const backup = await exportAttendanceDatabase()
    await db.settings.clear()
    await db.students.clear()
    expect(await db.students.count()).toBe(0)

    await restoreAttendanceDatabase(backup)

    expect((await db.settings.get('school'))?.schoolName).toBe('Offline School')
    expect((await db.students.get('student-1'))?.phone).toBe('+92 300 0000000')
  })
})
