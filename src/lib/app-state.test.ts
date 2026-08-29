import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { AttendanceState } from './app-state.svelte'
import { db } from './db'
import type { Enrollment, Register, Student } from './types'

const register: Register = {
  id: 'register-1',
  classGroupId: 'class-1',
  year: 2026,
  month: 8,
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
  admittedOn: '2026-08-01',
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

    await state.setMark(register, enrollment, 3, 1, 'P')

    expect(state.marks).toHaveLength(1)
    expect(state.marks[0]?.status).toBe('P')
    expect((await db.attendance.get('register-1:enrollment-1:3:1'))?.status).toBe('P')

    await state.setMark(register, enrollment, 3, 1, null)
    expect(state.marks).toHaveLength(0)
    expect(await db.attendance.count()).toBe(0)
  })

  it('clears local and stored marks when a school holiday is created', async () => {
    const state = createState()
    await state.setMark(register, enrollment, 3, 1, 'P')
    await state.setMark(register, enrollment, 3, 2, 'A')

    await state.toggleHoliday(register, 3)

    expect(state.holidays).toHaveLength(1)
    expect(state.marks).toHaveLength(0)
    expect(await db.attendance.count()).toBe(0)
  })
})
