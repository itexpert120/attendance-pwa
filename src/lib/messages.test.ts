import { describe, expect, it } from 'vitest'
import { DEFAULT_ABSENCE_MESSAGE_TEMPLATE, formatAbsenceMessage } from './messages'

const context = {
  student: 'Ayaan Khan',
  date: 'August 31, 2026',
  session: 'the first timing',
  school: 'Crescent Public School',
  className: 'Class 7, Section A',
  roll: '12',
  incharge: 'Ms. Sana Ali, the class incharge',
}

describe('absence message templates', () => {
  it('preserves the existing message as the fallback', () => {
    expect(formatAbsenceMessage(undefined, context)).toBe(
      'Dear Parent/Guardian, Ayaan Khan was marked absent for the first timing on August 31, 2026 at Crescent Public School. Please contact Ms. Sana Ali, the class incharge, if this is unexpected.',
    )
    expect(formatAbsenceMessage('   ', context)).toBe(
      formatAbsenceMessage(DEFAULT_ABSENCE_MESSAGE_TEMPLATE, context),
    )
  })

  it('fills every supported placeholder in a custom message', () => {
    expect(
      formatAbsenceMessage(
        '{student} (roll {roll}) of {class} was absent on {date} for {session}. — {incharge}, {school}',
        context,
      ),
    ).toBe(
      'Ayaan Khan (roll 12) of Class 7, Section A was absent on August 31, 2026 for the first timing. — Ms. Sana Ali, the class incharge, Crescent Public School',
    )
  })

  it('supports repeated placeholders and line breaks', () => {
    expect(formatAbsenceMessage('{student}\nPlease contact {student}.', context)).toBe(
      'Ayaan Khan\nPlease contact Ayaan Khan.',
    )
  })
})
