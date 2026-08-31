export const DEFAULT_ABSENCE_MESSAGE_TEMPLATE =
  'Dear Parent/Guardian, {student} was marked absent for {session} on {date} at {school}. Please contact {incharge}, if this is unexpected.'

export const ABSENCE_MESSAGE_TOKENS = [
  'student',
  'date',
  'session',
  'school',
  'class',
  'roll',
  'incharge',
] as const

export type AbsenceMessageToken = (typeof ABSENCE_MESSAGE_TOKENS)[number]

export interface AbsenceMessageContext {
  student: string
  date: string
  session: string
  school: string
  className: string
  roll: string
  incharge: string
}

export function resolveAbsenceMessageTemplate(template: string | undefined) {
  return template?.trim() || DEFAULT_ABSENCE_MESSAGE_TEMPLATE
}

export function formatAbsenceMessage(
  template: string | undefined,
  context: AbsenceMessageContext,
) {
  const values: Record<AbsenceMessageToken, string> = {
    student: context.student,
    date: context.date,
    session: context.session,
    school: context.school,
    class: context.className,
    roll: context.roll,
    incharge: context.incharge,
  }
  const selectedTemplate = resolveAbsenceMessageTemplate(template)

  return selectedTemplate.replace(
    /\{(student|date|session|school|class|roll|incharge)\}/g,
    (_token, name: AbsenceMessageToken) => values[name],
  )
}
