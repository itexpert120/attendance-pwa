import { describe, expect, it } from 'vitest'
import {
  addFees,
  academicYearStartYear,
  broughtForwardAttendance,
  currentAttendance,
  dateKey,
  feeGrandTotal,
  isHolidayDay,
  monthlyMovement,
  workingTimings,
} from './calculations'
import type { AttendanceMark, EnrollmentRow, Holiday, Register, SchoolSettings } from './types'

const settings: SchoolSettings = {
  id: 'school',
  schoolName: 'Test School',
  academicYearStartMonth: 4,
  currencyLabel: 'Rs.',
  headmasterName: '',
  updatedAt: '',
}

const register = (id: string, year: number, month: number): Register => ({
  id,
  classGroupId: 'class-1',
  year,
  month,
  createdAt: '',
})

describe('attendance calendar calculations', () => {
  it('uses April as the academic-year boundary', () => {
    expect(academicYearStartYear(register('mar', 2026, 3), settings)).toBe(2025)
    expect(academicYearStartYear(register('apr', 2026, 4), settings)).toBe(2026)
  })

  it('treats weekends and custom dates as holidays', () => {
    const august = register('aug', 2026, 8)
    const holidays: Holiday[] = [{ id: 'aug:3', registerId: 'aug', day: 3, title: 'School holiday' }]
    expect(isHolidayDay(holidays, august, 1)).toBe(true)
    expect(isHolidayDay(holidays, august, 2)).toBe(true)
    expect(isHolidayDay(holidays, august, 3)).toBe(true)
    expect(isHolidayDay(holidays, august, 4)).toBe(false)
    expect(workingTimings(august, holidays)).toBe(40)
  })

  it('links brought-forward present sessions within the academic year', () => {
    const april = register('apr', 2026, 4)
    const may = register('may', 2026, 5)
    const march = register('mar', 2026, 3)
    const marks: AttendanceMark[] = [
      { id: '1', registerId: 'apr', enrollmentId: 'e1', day: 1, session: 1, status: 'P' },
      { id: '2', registerId: 'apr', enrollmentId: 'e1', day: 1, session: 2, status: 'A' },
      { id: '3', registerId: 'may', enrollmentId: 'e1', day: 1, session: 1, status: 'P' },
      { id: '4', registerId: 'mar', enrollmentId: 'e1', day: 1, session: 1, status: 'P' },
    ]
    expect(broughtForwardAttendance(marks, [march, april, may], may, settings, 'e1')).toBe(1)
    expect(currentAttendance(marks, may.id, 'e1')).toBe(1)
  })

  it('derives beginning, end, admitted, and struck-off counts from enrollment dates', () => {
    const month = register('aug', 2026, 8)
    const row = (id: string, admittedOn: string, struckOffOn?: string): EnrollmentRow => ({
      student: { id, admissionNumber: id, name: id, phone: '', createdAt: '' },
      enrollment: {
        id,
        studentId: id,
        classGroupId: 'class-1',
        rollNumber: id,
        admittedOn,
        struckOffOn,
      },
    })
    const movement = monthlyMovement(
      [
        row('existing', dateKey(2026, 7, 1)),
        row('new', dateKey(2026, 8, 10)),
        row('left', dateKey(2026, 7, 1), dateKey(2026, 8, 20)),
      ],
      month,
    )
    expect(movement).toEqual({ beginning: 2, end: 2, admitted: 1, struckOff: 1 })
  })
})

describe('fee calculations', () => {
  it('adds category totals and calculates the grand total in minor units', () => {
    const total = addFees(
      { ftf: 10000, ff: 500, arrears: 0, lateCertificate: 0, slc: 1000, dcf: 0 },
      { ftf: 5000, ff: 500, arrears: 2500, lateCertificate: 750, slc: 0, dcf: 250 },
    )
    expect(total).toEqual({
      ftf: 15000,
      ff: 1000,
      arrears: 2500,
      lateCertificate: 750,
      slc: 1000,
      dcf: 250,
    })
    expect(feeGrandTotal(total)).toBe(20500)
  })
})
