# Attendance Tracking

This context describes the records used to track students' attendance and subject assessments.

## Language

**Test**:
A named assessment for exactly one Subject and one Class Group, held on one date, with one Total Marks limit. It exists independently of monthly attendance Registers; a retake is a separate Test.
_Avoid_: Exam, assessment

**Class Group**:
A class and section whose Students participate through Enrollments. Tests for different Class Groups are separate even when their names, Subjects, and dates match.
_Avoid_: Class, cohort

**Enrollment**:
A Student's membership in one Class Group, including their roll number and inclusive admission and struck-off dates.
_Avoid_: Test Roster member, attendance row

**Academic Year**:
A reporting period derived from a record's date and the school's currently configured academic-year start month.
_Avoid_: Frozen year label, calendar year

**Subject**:
A named area of study shared across the school. Tests in different Class Groups reference the same Subject when they cover the same area of study.
_Avoid_: Course, free-text subject

**Eligible Student**:
A Student whose Enrollment in a Test's Class Group is active on the Test date. Every Eligible Student is included when the Test Roster is created or refreshed.
_Avoid_: Attendee, participant

**Test Roster**:
The historical membership list of Enrollments belonging to a Test, initially captured from its Eligible Students and changed afterward only through explicit roster correction. It preserves membership while current Student and Enrollment details remain canonical.
_Avoid_: Live roster, current enrollment list

**Test Result**:
The outcome for one Test Roster member in one Test. It is either Not Entered, Absent, or numeric Marks; a Student has at most one Test Result per Test.
_Avoid_: Score, grade

**Total Marks**:
The maximum marks available for a Test.
_Avoid_: Maximum score, possible marks

**Marks**:
The numeric result earned by a Student in a Test, from zero through the Test's Total Marks and recorded to at most two decimal places.
_Avoid_: Points, grade

**Not Entered**:
The Test Result state for an eligible Student whose outcome has not yet been recorded.
_Avoid_: Missing, zero

**Absent**:
The Test Result state for an eligible Student who did not take the Test.
_Avoid_: Missing, zero

**Test Report**:
A printable result sheet for one Test, containing its details, Test Roster, Test Results, and aggregate calculations.
_Avoid_: Database backup, consolidated student history

**Subject Report**:
A printable aggregate of Tests and Test Results for one or all Subjects during a selected calendar day, Monday-to-Sunday week, or calendar month, optionally limited to one Class Group.
_Avoid_: Test Report, attendance report

**Student Report**:
A printable history of one Student's Test Results in one Class Group during a selected calendar day, Monday-to-Sunday week, or calendar month, optionally limited to one Subject.
_Avoid_: Test Report, attendance report

**Test Progress**:
The editable result-entry state derived from a Test's Results: Not Started when all are Not Entered, In Progress when only some are recorded, and Complete when none are Not Entered.
_Avoid_: Test status, submission state

**Daily Homework Report**:
A saved diary for exactly one Class Group and date. It contains the incharge name used on that day, one or more Homework Items, and a Parent Note, and can be printed or saved as a PDF.
_Avoid_: Test Report, attendance report, live form

**Homework Item**:
One Subject and the assignment details Students must complete, ordered as it should appear in a Daily Homework Report.
_Avoid_: Test, lesson plan, task row

**Parent Note**:
The message printed after all Homework Items in a Daily Homework Report for parents or guardians.
_Avoid_: Student Remark, private note
