import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { AttendanceState } from './app-state.svelte'
import { db } from './db'
import type { Enrollment, Register, Student } from './types'

const editableDate = new Date()
editableDate.setDate(editableDate.getDate() - 1)
while (editableDate.getDay() === 0 || editableDate.getDay() === 6) {
  editableDate.setDate(editableDate.getDate() - 1)
}
const editableDay = editableDate.getDate()

const register: Register = {
  id: 'register-1',
  classGroupId: 'class-1',
  year: editableDate.getFullYear(),
  month: editableDate.getMonth() + 1,
  createdAt: '2026-08-01T00:00:00.000Z',
}

const student: Student = {
  id: 'student-1',
  admissionNumber: 'A-001',
  name: 'Test Student',
  phone: '03000000000',
  createdAt: '2026-08-01T00:00:00.000Z',
}

const enrollment: Enrollment = {
  id: 'enrollment-1',
  studentId: student.id,
  classGroupId: register.classGroupId,
  rollNumber: '1',
  admittedOn: `${editableDate.getFullYear()}-${String(editableDate.getMonth() + 1).padStart(2, '0')}-01`,
}

function createState() {
  const state = new AttendanceState()
  state.students = [student]
  state.enrollments = [enrollment]
  state.registers = [register]
  state.marks = []
  state.holidays = []
  return state
}

describe('attendance state hot-path updates', () => {
  beforeEach(async () => {
    db.close()
    await db.delete()
    await db.open()
  })

  afterAll(async () => {
    db.close()
    await db.delete()
  })

  it('updates a single mark in memory after the IndexedDB write', async () => {
    const state = createState()

    await state.setMark(register, enrollment, editableDay, 1, 'P')

    expect(state.marks).toHaveLength(1)
    expect(state.marks[0]?.status).toBe('P')
    expect((await db.attendance.get(`register-1:enrollment-1:${editableDay}:1`))?.status).toBe('P')

    await state.setMark(register, enrollment, editableDay, 1, null)
    expect(state.marks).toHaveLength(0)
    expect(await db.attendance.count()).toBe(0)
  })

  it('clears local and stored marks when a school holiday is created', async () => {
    const state = createState()
    await state.setMark(register, enrollment, editableDay, 1, 'P')
    await state.setMark(register, enrollment, editableDay, 2, 'A')

    await state.toggleHoliday(register, editableDay)

    expect(state.holidays).toHaveLength(1)
    expect(state.holidays[0]?.title).toBe('School holiday')
    expect(state.marks).toHaveLength(0)
    expect(await db.attendance.count()).toBe(0)
  })

  it('stores the reason supplied for a school holiday', async () => {
    const state = createState()
    await state.toggleHoliday(register, editableDay, 'Independence Day')
    expect(state.holidays[0]?.title).toBe('Independence Day')
    expect((await db.holidays.get(`register-1:${editableDay}`))?.title).toBe('Independence Day')
  })

  it('does not write attendance older than seven days', async () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 8)
    const oldRegister: Register = {
      ...register,
      id: 'old-register',
      year: oldDate.getFullYear(),
      month: oldDate.getMonth() + 1,
    }
    await createState().setMark(oldRegister, enrollment, oldDate.getDate(), 1, 'P')
    expect(await db.attendance.count()).toBe(0)
  })

  it('duplicates a class with only active enrollments', async () => {
    const state = createState()
    state.classGroups = [{ id: 'class-1', className: '7', section: 'A', createdAt: '' }]
    await db.classGroups.put(state.classGroups[0]!)
    await db.students.put(student)
    await db.enrollments.put(enrollment)

    const duplicated = await state.duplicateClass(
      'class-1',
      '8',
      'A',
      enrollment.admittedOn,
    )

    expect(duplicated.className).toBe('8')
    expect(state.enrollments.some((item) => item.classGroupId === duplicated.id && item.studentId === student.id)).toBe(true)
  })
})
