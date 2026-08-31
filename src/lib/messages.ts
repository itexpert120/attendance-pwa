export const DEFAULT_ABSENCE_MESSAGE_TEMPLATE =
  'Dear Parent/Guardian, {student} was marked absent for {session} on {date} at {school}. Please contact {incharge}, if this is unexpected.'

export interface AbsenceMessageContext {
  student: string
  date: string
  session: string
  school: string
  className: string
  roll: string
  incharge: string
}

export function formatAbsenceMessage(
  template: string | undefined,
  context: AbsenceMessageContext,
) {
  const values: Record<string, string> = {
    student: context.student,
    date: context.date,
    session: context.session,
    school: context.school,
    class: context.className,
    roll: context.roll,
    incharge: context.incharge,
  }
  const selectedTemplate = template?.trim() || DEFAULT_ABSENCE_MESSAGE_TEMPLATE

  return selectedTemplate.replace(
    /\{(student|date|session|school|class|roll|incharge)\}/g,
    (token) => values[token.slice(1, -1)] ?? token,
  )
}
