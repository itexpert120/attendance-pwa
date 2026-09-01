import {
  db,
  exportAttendanceDatabase,
  inspectAttendanceBackup,
  restoreAttendanceDatabase,
} from "./db";
import { SvelteDate, SvelteMap, SvelteSet } from "svelte/reactivity";
import {
  dateKey,
  daysInMonth,
  isAttendanceDateEditable,
  isEnrollmentActiveOn,
  isHolidayDay,
  rowsForClass,
  testSummary as calculateTestSummary,
} from "./calculations";
import type {
  AttendanceMark,
  AttendanceStatus,
  ClassGroup,
  DailyHomeworkReport,
  Enrollment,
  FeeAmounts,
  FeeEntry,
  Holiday,
  InstallmentMeta,
  InstallmentNumber,
  Register,
  SchoolSettings,
  SessionNumber,
  Student,
  StudentRemark,
  Subject,
  TestRecord,
  TestResult,
  TestRosterEntry,
  TestRosterRow,
} from "./types";
import { normalizePhoneNumber } from "./phone";

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const normalizeName = (value: string) => value.trim().toLocaleLowerCase();
const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(Math.round(value * 100) - value * 100) < 1e-8;

type DailyHomeworkInput = Pick<
  DailyHomeworkReport,
  "classGroupId" | "date" | "inchargeName" | "parentNote"
> & {
  items: Array<{ subjectId: string; details: string }>;
};

export class AttendanceState {
  ready = $state(false);
  busy = $state(false);
  error = $state("");
  storagePersistent = $state<boolean | null>(null);
  settings = $state<SchoolSettings | null>(null);
  classGroups = $state<ClassGroup[]>([]);
  students = $state<Student[]>([]);
  enrollments = $state<Enrollment[]>([]);
  registers = $state<Register[]>([]);
  marks = $state<AttendanceMark[]>([]);
  holidays = $state<Holiday[]>([]);
  feeEntries = $state<FeeEntry[]>([]);
  installmentMeta = $state<InstallmentMeta[]>([]);
  remarks = $state<StudentRemark[]>([]);
  subjects = $state<Subject[]>([]);
  tests = $state<TestRecord[]>([]);
  testRoster = $state<TestRosterEntry[]>([]);
  testResults = $state<TestResult[]>([]);
  dailyHomeworkReports = $state<DailyHomeworkReport[]>([]);
  selectedRegisterId = $state<string | null>(null);
  selectedTestId = $state<string | null>(null);

  selectedRegister = $derived(
    this.registers.find(
      (register) => register.id === this.selectedRegisterId,
    ) ?? null,
  );

  selectedTest = $derived(
    this.tests.find((test) => test.id === this.selectedTestId) ?? null,
  );

  async initialize() {
    if (this.ready || this.busy) return;
    this.busy = true;
    this.error = "";
    try {
      await db.open();
      await this.refresh();
      if ("storage" in navigator && navigator.storage.persisted) {
        this.storagePersistent = await navigator.storage.persisted();
      }
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : "Could not open the offline database.";
    } finally {
      this.busy = false;
      this.ready = true;
    }
  }

  async refresh() {
    const [
      settings,
      classGroups,
      students,
      enrollments,
      registers,
      marks,
      holidays,
      feeEntries,
      installmentMeta,
      remarks,
      subjects,
      tests,
      testRoster,
      testResults,
      dailyHomeworkReports,
    ] = await Promise.all([
      db.settings.get("school"),
      db.classGroups.toArray(),
      db.students.toArray(),
      db.enrollments.toArray(),
      db.registers.toArray(),
      db.attendance.toArray(),
      db.holidays.toArray(),
      db.feeEntries.toArray(),
      db.installmentMeta.toArray(),
      db.remarks.toArray(),
      db.subjects.toArray(),
      db.tests.toArray(),
      db.testRoster.toArray(),
      db.testResults.toArray(),
      db.homeworkReports.toArray(),
    ]);
    this.settings = settings
      ? {
          ...settings,
          classInchargeName:
            settings.classInchargeName ?? settings.headmasterName ?? "",
        }
      : null;
    this.classGroups = classGroups.sort((a, b) =>
      `${a.className}${a.section}`.localeCompare(
        `${b.className}${b.section}`,
        undefined,
        {
          numeric: true,
        },
      ),
    );
    const normalizedStudents = students.map((student) => {
      try {
        const normalizedPhone = normalizePhoneNumber(student.phone);
        return normalizedPhone === student.phone
          ? student
          : { ...student, phone: normalizedPhone };
      } catch {
        return student;
      }
    });
    const migratedStudents = normalizedStudents.filter(
      (student, index) => student.phone !== students[index]?.phone,
    );
    if (migratedStudents.length) await db.students.bulkPut(migratedStudents);
    this.students = normalizedStudents;
    this.enrollments = enrollments;
    this.registers = registers.sort(
      (a, b) => b.year * 12 + b.month - (a.year * 12 + a.month),
    );
    this.marks = marks;
    this.holidays = holidays;
    this.feeEntries = feeEntries;
    this.installmentMeta = installmentMeta;
    this.remarks = remarks;
    this.subjects = subjects.sort((a, b) => {
      if (Boolean(a.archivedAt) !== Boolean(b.archivedAt))
        return a.archivedAt ? 1 : -1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    this.tests = tests.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
    this.testRoster = testRoster;
    this.testResults = testResults;
    this.dailyHomeworkReports = dailyHomeworkReports.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async completeSetup(input: {
    schoolName: string;
    className: string;
    section: string;
    academicYearStartMonth: number;
    currencyLabel: string;
    classInchargeName: string;
    logoDataUrl?: string;
  }) {
    const group: ClassGroup = {
      id: id(),
      className: input.className.trim(),
      section: input.section.trim(),
      createdAt: now(),
    };
    const settings: SchoolSettings = {
      id: "school",
      schoolName: input.schoolName.trim(),
      academicYearStartMonth: input.academicYearStartMonth,
      currencyLabel: input.currencyLabel.trim() || "Rs.",
      classInchargeName: input.classInchargeName.trim(),
      logoDataUrl: input.logoDataUrl,
      updatedAt: now(),
    };
    await db.transaction("rw", [db.settings, db.classGroups], async () => {
      await db.settings.put(settings);
      await db.classGroups.add(group);
    });
    await this.requestPersistentStorage();
    await this.refresh();
  }

  async saveSettings(settings: Omit<SchoolSettings, "id" | "updatedAt">) {
    await db.settings.put({ ...settings, id: "school", updatedAt: now() });
    await this.refresh();
  }

  async addClass(className: string, section: string) {
    const normalizedClass = className.trim();
    const normalizedSection = section.trim();
    const exists = this.classGroups.some(
      (group) =>
        group.className.toLowerCase() === normalizedClass.toLowerCase() &&
        group.section.toLowerCase() === normalizedSection.toLowerCase(),
    );
    if (exists) throw new Error("That class and section already exists.");
    await db.classGroups.add({
      id: id(),
      className: normalizedClass,
      section: normalizedSection,
      createdAt: now(),
    });
    await this.refresh();
  }

  async duplicateClass(
    sourceClassGroupId: string,
    className: string,
    section: string,
    admittedOn: string,
  ) {
    const normalizedClass = className.trim();
    const normalizedSection = section.trim();
    if (!normalizedClass || !normalizedSection)
      throw new Error("Class and section are required.");
    const exists = this.classGroups.some(
      (group) =>
        group.className.toLowerCase() === normalizedClass.toLowerCase() &&
        group.section.toLowerCase() === normalizedSection.toLowerCase(),
    );
    if (exists) throw new Error("That class and section already exists.");
    const source = this.classGroups.find(
      (group) => group.id === sourceClassGroupId,
    );
    if (!source) throw new Error("Select a class to duplicate.");

    const group: ClassGroup = {
      id: id(),
      className: normalizedClass,
      section: normalizedSection,
      createdAt: now(),
    };
    const sourceEnrollments = this.enrollments.filter(
      (enrollment) =>
        enrollment.classGroupId === sourceClassGroupId &&
        isEnrollmentActiveOn(enrollment, admittedOn),
    );
    const duplicatedEnrollments: Enrollment[] = sourceEnrollments.map(
      (enrollment) => ({
        id: id(),
        studentId: enrollment.studentId,
        classGroupId: group.id,
        rollNumber: enrollment.rollNumber,
        admittedOn,
      }),
    );
    await db.transaction("rw", [db.classGroups, db.enrollments], async () => {
      await db.classGroups.add(group);
      if (duplicatedEnrollments.length)
        await db.enrollments.bulkAdd(duplicatedEnrollments);
    });
    await this.refresh();
    return group;
  }

  async saveStudent(input: {
    studentId?: string;
    enrollmentId?: string;
    classGroupId: string;
    admissionNumber: string;
    rollNumber: string;
    name: string;
    phone: string;
    dateOfBirth?: string;
    photoDataUrl?: string;
    admittedOn: string;
    struckOffOn?: string;
  }) {
    const admissionNumber = input.admissionNumber.trim();
    const rollNumber = input.rollNumber.trim();
    const phone = normalizePhoneNumber(input.phone);
    const duplicateAdmission = this.students.find(
      (student) =>
        student.admissionNumber.toLowerCase() ===
          admissionNumber.toLowerCase() && student.id !== input.studentId,
    );
    if (duplicateAdmission) throw new Error("Admission number must be unique.");
    const duplicateRoll = this.enrollments.find(
      (enrollment) =>
        enrollment.classGroupId === input.classGroupId &&
        enrollment.rollNumber.toLowerCase() === rollNumber.toLowerCase() &&
        enrollment.id !== input.enrollmentId &&
        (!enrollment.struckOffOn || enrollment.struckOffOn >= input.admittedOn),
    );
    if (duplicateRoll)
      throw new Error("Roll number is already active in this class.");
    if (input.struckOffOn && input.struckOffOn < input.admittedOn) {
      throw new Error("Struck-off date cannot be before admission date.");
    }

    const student: Student = {
      id: input.studentId ?? id(),
      admissionNumber,
      name: input.name.trim(),
      phone,
      dateOfBirth: input.dateOfBirth || undefined,
      photoDataUrl: input.photoDataUrl || undefined,
      createdAt:
        this.students.find((item) => item.id === input.studentId)?.createdAt ??
        now(),
    };
    const enrollment: Enrollment = {
      id: input.enrollmentId ?? id(),
      studentId: student.id,
      classGroupId: input.classGroupId,
      rollNumber,
      admittedOn: input.admittedOn,
      struckOffOn: input.struckOffOn || undefined,
    };
    await db.transaction("rw", [db.students, db.enrollments], async () => {
      await db.students.put(student);
      await db.enrollments.put(enrollment);
    });
    await this.refresh();
  }

  async createRegister(classGroupId: string, year: number, month: number) {
    const existing = this.registers.find(
      (register) =>
        register.classGroupId === classGroupId &&
        register.year === year &&
        register.month === month,
    );
    if (existing) {
      this.selectedRegisterId = existing.id;
      return existing;
    }
    const register: Register = {
      id: id(),
      classGroupId,
      year,
      month,
      createdAt: now(),
    };
    await db.registers.add(register);
    await this.refresh();
    this.selectedRegisterId = register.id;
    return register;
  }

  async saveSubject(name: string) {
    const trimmedName = name.trim();
    const normalizedName = normalizeName(trimmedName);
    if (!trimmedName) throw new Error("Subject name is required.");
    const existing = this.subjects.find(
      (subject) => subject.normalizedName === normalizedName,
    );
    if (existing && !existing.archivedAt)
      throw new Error("That Subject already exists.");

    const timestamp = now();
    const subject: Subject = existing
      ? {
          ...existing,
          name: trimmedName,
          archivedAt: undefined,
          updatedAt: timestamp,
        }
      : {
          id: id(),
          name: trimmedName,
          normalizedName,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
    await db.subjects.put(subject);
    await this.refresh();
    return subject;
  }

  async renameSubject(subjectId: string, name: string) {
    const subject = this.subjects.find((item) => item.id === subjectId);
    if (!subject) throw new Error("Subject not found.");
    const trimmedName = name.trim();
    const normalizedName = normalizeName(trimmedName);
    if (!trimmedName) throw new Error("Subject name is required.");
    if (
      this.subjects.some(
        (item) =>
          item.id !== subjectId && item.normalizedName === normalizedName,
      )
    ) {
      throw new Error("That Subject already exists.");
    }
    const updated: Subject = {
      ...subject,
      name: trimmedName,
      normalizedName,
      updatedAt: now(),
    };
    await db.subjects.put(updated);
    await this.refresh();
    return updated;
  }

  async archiveSubject(subjectId: string) {
    const subject = this.subjects.find((item) => item.id === subjectId);
    if (!subject || subject.archivedAt) return;
    await db.subjects.put({ ...subject, archivedAt: now(), updatedAt: now() });
    await this.refresh();
  }

  async restoreSubject(subjectId: string) {
    const subject = this.subjects.find((item) => item.id === subjectId);
    if (!subject || !subject.archivedAt) return;
    await db.subjects.put({
      ...subject,
      archivedAt: undefined,
      updatedAt: now(),
    });
    await this.refresh();
  }

  async createTest(input: {
    name: string;
    subjectId: string;
    classGroupId: string;
    date: string;
    totalMarks: number;
  }) {
    const name = input.name.trim();
    const normalizedName = normalizeName(name);
    if (!name || !input.subjectId || !input.classGroupId || !input.date) {
      throw new Error(
        "Test name, Subject, Class Group, and date are required.",
      );
    }
    if (
      !Number.isFinite(input.totalMarks) ||
      input.totalMarks <= 0 ||
      !hasAtMostTwoDecimals(input.totalMarks)
    ) {
      throw new Error(
        "Total Marks must be greater than zero, with up to two decimals.",
      );
    }
    const subject = this.subjects.find(
      (item) => item.id === input.subjectId && !item.archivedAt,
    );
    if (!subject) throw new Error("Select an active Subject.");
    if (!this.classGroups.some((group) => group.id === input.classGroupId)) {
      throw new Error("Select a Class Group.");
    }
    const duplicate = this.tests.some(
      (test) =>
        test.classGroupId === input.classGroupId &&
        test.subjectId === input.subjectId &&
        test.date === input.date &&
        test.normalizedName === normalizedName,
    );
    if (duplicate)
      throw new Error(
        "That Test already exists for this Class Group and date.",
      );
    const eligible = this.enrollments.filter(
      (enrollment) =>
        enrollment.classGroupId === input.classGroupId &&
        isEnrollmentActiveOn(enrollment, input.date),
    );
    if (!eligible.length) {
      throw new Error(
        "No students are enrolled in this Class Group on the Test date.",
      );
    }

    const timestamp = now();
    const test: TestRecord = {
      id: id(),
      name,
      normalizedName,
      subjectId: input.subjectId,
      classGroupId: input.classGroupId,
      date: input.date,
      totalMarks: input.totalMarks,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const roster: TestRosterEntry[] = eligible.map((enrollment) => ({
      id: `${test.id}:${enrollment.id}`,
      testId: test.id,
      enrollmentId: enrollment.id,
      createdAt: timestamp,
    }));
    await db.transaction("rw", [db.tests, db.testRoster], async () => {
      await db.tests.add(test);
      await db.testRoster.bulkAdd(roster);
    });
    await this.refresh();
    this.selectedTestId = test.id;
    return test;
  }

  async setTestResult(
    testId: string,
    enrollmentId: string,
    value: { status: "marks"; marks: number } | { status: "absent" } | null,
  ) {
    const test = this.tests.find((item) => item.id === testId);
    if (!test) throw new Error("Test not found.");
    const rosterEntry = this.testRoster.find(
      (entry) => entry.testId === testId && entry.enrollmentId === enrollmentId,
    );
    if (!rosterEntry) throw new Error("Student is not on this Test Roster.");
    const resultId = `${testId}:${enrollmentId}`;

    if (!value) {
      await db.testResults.delete(resultId);
      this.testResults = this.testResults.filter(
        (result) => result.id !== resultId,
      );
      return;
    }
    if (
      value.status === "marks" &&
      (!Number.isFinite(value.marks) ||
        value.marks < 0 ||
        value.marks > test.totalMarks ||
        !hasAtMostTwoDecimals(value.marks))
    ) {
      throw new Error(
        `Marks must be between 0 and ${test.totalMarks}, with up to two decimals.`,
      );
    }

    const result: TestResult =
      value.status === "marks"
        ? {
            id: resultId,
            testId,
            enrollmentId,
            status: "marks",
            marks: value.marks,
            updatedAt: now(),
          }
        : {
            id: resultId,
            testId,
            enrollmentId,
            status: "absent",
            updatedAt: now(),
          };
    await db.testResults.put(result);
    this.testResults = [
      ...this.testResults.filter((item) => item.id !== resultId),
      result,
    ];
  }

  async refreshTestRoster(testId: string) {
    const test = this.tests.find((item) => item.id === testId);
    if (!test) throw new Error("Test not found.");
    if (this.testResults.some((result) => result.testId === testId)) {
      throw new Error("Refresh the Test Roster before entering results.");
    }
    const eligible = this.enrollments.filter(
      (enrollment) =>
        enrollment.classGroupId === test.classGroupId &&
        isEnrollmentActiveOn(enrollment, test.date),
    );
    if (!eligible.length) {
      throw new Error(
        "No students are enrolled in this Class Group on the Test date.",
      );
    }
    const timestamp = now();
    const roster: TestRosterEntry[] = eligible.map((enrollment) => ({
      id: `${test.id}:${enrollment.id}`,
      testId: test.id,
      enrollmentId: enrollment.id,
      createdAt: timestamp,
    }));
    await db.transaction("rw", db.testRoster, async () => {
      await db.testRoster.where("testId").equals(testId).delete();
      await db.testRoster.bulkAdd(roster);
    });
    await this.refresh();
  }

  async updateTest(
    testId: string,
    input: Pick<
      TestRecord,
      "name" | "subjectId" | "classGroupId" | "date" | "totalMarks"
    >,
  ) {
    const current = this.tests.find((item) => item.id === testId);
    if (!current) throw new Error("Test not found.");
    const name = input.name.trim();
    const normalizedName = normalizeName(name);
    if (!name || !input.subjectId || !input.classGroupId || !input.date) {
      throw new Error(
        "Test name, Subject, Class Group, and date are required.",
      );
    }
    if (
      !Number.isFinite(input.totalMarks) ||
      input.totalMarks <= 0 ||
      !hasAtMostTwoDecimals(input.totalMarks)
    ) {
      throw new Error(
        "Total Marks must be greater than zero, with up to two decimals.",
      );
    }
    const hasResults = this.testResults.some(
      (result) => result.testId === testId,
    );
    const rosterChanged =
      input.classGroupId !== current.classGroupId ||
      input.date !== current.date;
    if (hasResults && rosterChanged) {
      throw new Error(
        "Class Group and date are locked after result entry begins.",
      );
    }
    const highestMarks = Math.max(
      0,
      ...this.testResults
        .filter(
          (result) => result.testId === testId && result.status === "marks",
        )
        .map((result) => result.marks ?? 0),
    );
    if (input.totalMarks < highestMarks) {
      throw new Error(
        `Total Marks cannot be below recorded Marks (${highestMarks}).`,
      );
    }
    const subject = this.subjects.find((item) => item.id === input.subjectId);
    if (!subject || (subject.archivedAt && subject.id !== current.subjectId)) {
      throw new Error("Select an active Subject.");
    }
    if (!this.classGroups.some((group) => group.id === input.classGroupId)) {
      throw new Error("Select a Class Group.");
    }
    const duplicate = this.tests.some(
      (test) =>
        test.id !== testId &&
        test.classGroupId === input.classGroupId &&
        test.subjectId === input.subjectId &&
        test.date === input.date &&
        test.normalizedName === normalizedName,
    );
    if (duplicate)
      throw new Error(
        "That Test already exists for this Class Group and date.",
      );

    const updated: TestRecord = {
      ...current,
      name,
      normalizedName,
      subjectId: input.subjectId,
      classGroupId: input.classGroupId,
      date: input.date,
      totalMarks: input.totalMarks,
      updatedAt: now(),
    };
    if (rosterChanged) {
      const eligible = this.enrollments.filter(
        (enrollment) =>
          enrollment.classGroupId === input.classGroupId &&
          isEnrollmentActiveOn(enrollment, input.date),
      );
      if (!eligible.length) {
        throw new Error(
          "No students are enrolled in this Class Group on the Test date.",
        );
      }
      const timestamp = now();
      const roster: TestRosterEntry[] = eligible.map((enrollment) => ({
        id: `${testId}:${enrollment.id}`,
        testId,
        enrollmentId: enrollment.id,
        createdAt: timestamp,
      }));
      await db.transaction("rw", [db.tests, db.testRoster], async () => {
        await db.tests.put(updated);
        await db.testRoster.where("testId").equals(testId).delete();
        await db.testRoster.bulkAdd(roster);
      });
    } else {
      await db.tests.put(updated);
    }
    await this.refresh();
    return updated;
  }

  selectTest(testId: string | null) {
    this.selectedTestId = testId;
  }

  rowsForTest(testId: string): TestRosterRow[] {
    const enrollmentMap = new SvelteMap(
      this.enrollments.map((enrollment) => [enrollment.id, enrollment]),
    );
    const studentMap = new SvelteMap(
      this.students.map((student) => [student.id, student]),
    );
    const resultMap = new SvelteMap(
      this.testResults
        .filter((result) => result.testId === testId)
        .map((result) => [result.enrollmentId, result]),
    );
    return this.testRoster
      .filter((entry) => entry.testId === testId)
      .flatMap<TestRosterRow>((rosterEntry) => {
        const enrollment = enrollmentMap.get(rosterEntry.enrollmentId);
        const student = enrollment
          ? studentMap.get(enrollment.studentId)
          : undefined;
        return enrollment && student
          ? [
              {
                rosterEntry,
                enrollment,
                student,
                result: resultMap.get(enrollment.id),
              },
            ]
          : [];
      })
      .sort((a, b) =>
        a.enrollment.rollNumber.localeCompare(
          b.enrollment.rollNumber,
          undefined,
          {
            numeric: true,
          },
        ),
      );
  }

  summaryForTest(testId: string) {
    const test = this.tests.find((item) => item.id === testId);
    if (!test) return null;
    return calculateTestSummary(test, this.testRoster, this.testResults);
  }

  async addTestRosterMember(testId: string, enrollmentId: string) {
    const test = this.tests.find((item) => item.id === testId);
    const enrollment = this.enrollments.find(
      (item) => item.id === enrollmentId,
    );
    if (!test || !enrollment) throw new Error("Test or Enrollment not found.");
    if (enrollment.classGroupId !== test.classGroupId) {
      throw new Error("Select a Student from this Class Group.");
    }
    const rosterId = `${testId}:${enrollmentId}`;
    if (this.testRoster.some((entry) => entry.id === rosterId)) return;
    const entry: TestRosterEntry = {
      id: rosterId,
      testId,
      enrollmentId,
      createdAt: now(),
    };
    await db.testRoster.add(entry);
    this.testRoster = [...this.testRoster, entry];
  }

  async removeTestRosterMember(testId: string, enrollmentId: string) {
    const resultId = `${testId}:${enrollmentId}`;
    if (this.testResults.some((result) => result.id === resultId)) {
      throw new Error("Clear this Student’s Test Result before removing them.");
    }
    await db.testRoster.delete(resultId);
    this.testRoster = this.testRoster.filter((entry) => entry.id !== resultId);
  }

  async deleteTest(testId: string) {
    const test = this.tests.find((item) => item.id === testId);
    if (!test) return;
    await db.transaction(
      "rw",
      [db.tests, db.testRoster, db.testResults],
      async () => {
        await db.tests.delete(testId);
        await db.testRoster.where("testId").equals(testId).delete();
        await db.testResults.where("testId").equals(testId).delete();
      },
    );
    if (this.selectedTestId === testId) this.selectedTestId = null;
    await this.refresh();
  }

  private validateDailyHomeworkInput(
    input: DailyHomeworkInput,
    current?: DailyHomeworkReport,
  ): Omit<DailyHomeworkReport, "id" | "createdAt" | "updatedAt"> {
    const inchargeName = input.inchargeName.trim();
    const parentNote = input.parentNote.trim();
    const parsedDate = Date.parse(`${input.date}T00:00:00Z`);
    const normalizedDate = Number.isNaN(parsedDate)
      ? ""
      : new SvelteDate(parsedDate).toISOString().slice(0, 10);
    if (
      !input.classGroupId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
      Number.isNaN(parsedDate) ||
      normalizedDate !== input.date ||
      !inchargeName ||
      !parentNote
    ) {
      throw new Error(
        "Class Group, date, incharge, and Parent Note are required.",
      );
    }
    if (!this.classGroups.some((group) => group.id === input.classGroupId)) {
      throw new Error("Select a Class Group.");
    }
    if (!input.items.length) throw new Error("Add at least one Homework Item.");
    if (input.items.some((item) => !item.subjectId || !item.details.trim())) {
      throw new Error(
        "Every Homework Item needs a Subject and assignment details.",
      );
    }
    const subjectIds = input.items.map((item) => item.subjectId);
    if (new SvelteSet(subjectIds).size !== subjectIds.length) {
      throw new Error(
        "Each Subject can appear only once in a Daily Homework Report.",
      );
    }
    const currentSubjectIds = new SvelteSet(
      current?.items.map((item) => item.subjectId) ?? [],
    );
    if (
      subjectIds.some((subjectId) => {
        const subject = this.subjects.find((item) => item.id === subjectId);
        return (
          !subject ||
          Boolean(subject.archivedAt && !currentSubjectIds.has(subjectId))
        );
      })
    ) {
      throw new Error("Select an active Subject for every Homework Item.");
    }
    return {
      classGroupId: input.classGroupId,
      date: input.date,
      inchargeName,
      parentNote,
      items: input.items.map((item, order) => ({
        subjectId: item.subjectId,
        details: item.details.trim(),
        order,
      })),
    };
  }

  async createDailyHomeworkReport(input: DailyHomeworkInput) {
    const validated = this.validateDailyHomeworkInput(input);
    if (
      this.dailyHomeworkReports.some(
        (report) =>
          report.classGroupId === validated.classGroupId &&
          report.date === validated.date,
      )
    ) {
      throw new Error(
        "A Daily Homework Report already exists for this Class Group and date.",
      );
    }
    const timestamp = now();
    const report: DailyHomeworkReport = {
      id: id(),
      ...validated,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.homeworkReports.add(report);
    await this.refresh();
    return report;
  }

  async updateDailyHomeworkReport(reportId: string, input: DailyHomeworkInput) {
    const current = this.dailyHomeworkReports.find(
      (report) => report.id === reportId,
    );
    if (!current) throw new Error("Daily Homework Report not found.");
    const validated = this.validateDailyHomeworkInput(input, current);
    if (
      this.dailyHomeworkReports.some(
        (report) =>
          report.id !== reportId &&
          report.classGroupId === validated.classGroupId &&
          report.date === validated.date,
      )
    ) {
      throw new Error(
        "A Daily Homework Report already exists for this Class Group and date.",
      );
    }
    const updated: DailyHomeworkReport = {
      ...current,
      ...validated,
      updatedAt: now(),
    };
    await db.homeworkReports.put(updated);
    await this.refresh();
    return updated;
  }

  async deleteDailyHomeworkReport(reportId: string) {
    await db.homeworkReports.delete(reportId);
    this.dailyHomeworkReports = this.dailyHomeworkReports.filter(
      (report) => report.id !== reportId,
    );
  }

  selectRegister(registerId: string | null) {
    this.selectedRegisterId = registerId;
  }

  rowsForRegister(register: Register) {
    return rowsForClass(
      this.enrollments,
      this.students,
      register.classGroupId,
      register,
    );
  }

  async setMark(
    register: Register,
    enrollment: Enrollment,
    day: number,
    session: SessionNumber,
    status: AttendanceStatus | null,
  ) {
    if (!isAttendanceDateEditable(register, day)) return;
    const markId = `${register.id}:${enrollment.id}:${day}:${session}`;
    const date = dateKey(register.year, register.month, day);
    if (
      isHolidayDay(this.holidays, register, day) ||
      !isEnrollmentActiveOn(enrollment, date)
    )
      return;
    if (status) {
      const mark: AttendanceMark = {
        id: markId,
        registerId: register.id,
        enrollmentId: enrollment.id,
        day,
        session,
        status,
      };
      await db.attendance.put(mark);
      this.marks = [...this.marks.filter((item) => item.id !== markId), mark];
    } else {
      await db.attendance.delete(markId);
      this.marks = this.marks.filter((item) => item.id !== markId);
    }
  }

  async bulkSetMarks(
    register: Register,
    day: number,
    session: SessionNumber,
    status: AttendanceStatus | null,
  ) {
    if (!isAttendanceDateEditable(register, day)) return;
    if (isHolidayDay(this.holidays, register, day)) return;
    const date = dateKey(register.year, register.month, day);
    const rows = this.rowsForRegister(register).filter((row) =>
      isEnrollmentActiveOn(row.enrollment, date),
    );
    await db.transaction("rw", db.attendance, async () => {
      if (status) {
        await db.attendance.bulkPut(
          rows.map(({ enrollment }) => ({
            id: `${register.id}:${enrollment.id}:${day}:${session}`,
            registerId: register.id,
            enrollmentId: enrollment.id,
            day,
            session,
            status,
          })),
        );
      } else {
        await db.attendance.bulkDelete(
          rows.map(
            ({ enrollment }) =>
              `${register.id}:${enrollment.id}:${day}:${session}`,
          ),
        );
      }
    });
    const activeEnrollmentIds = new SvelteSet(
      rows.map(({ enrollment }) => enrollment.id),
    );
    const retainedMarks = this.marks.filter(
      (mark) =>
        mark.registerId !== register.id ||
        mark.day !== day ||
        mark.session !== session ||
        !activeEnrollmentIds.has(mark.enrollmentId),
    );
    this.marks = status
      ? [
          ...retainedMarks,
          ...rows.map(({ enrollment }) => ({
            id: `${register.id}:${enrollment.id}:${day}:${session}`,
            registerId: register.id,
            enrollmentId: enrollment.id,
            day,
            session,
            status,
          })),
        ]
      : retainedMarks;
  }

  async toggleHoliday(
    register: Register,
    day: number,
    reason = "School holiday",
  ) {
    if (!isAttendanceDateEditable(register, day)) return;
    const holidayId = `${register.id}:${day}`;
    const existing = this.holidays.find((holiday) => holiday.id === holidayId);
    if (existing) {
      await db.holidays.delete(holidayId);
      this.holidays = this.holidays.filter(
        (holiday) => holiday.id !== holidayId,
      );
    } else {
      const holiday: Holiday = {
        id: holidayId,
        registerId: register.id,
        day,
        title: reason.trim() || "School holiday",
      };
      await db.transaction("rw", [db.holidays, db.attendance], async () => {
        await db.attendance
          .where("[registerId+day]")
          .equals([register.id, day])
          .delete();
        await db.holidays.put(holiday);
      });
      this.holidays = [...this.holidays, holiday];
      this.marks = this.marks.filter(
        (mark) => mark.registerId !== register.id || mark.day !== day,
      );
    }
  }

  async saveFeeEntries(
    registerId: string,
    enrollmentId: string,
    entries: Array<{ installment: InstallmentNumber; amounts: FeeAmounts }>,
  ) {
    const nextEntries: FeeEntry[] = entries.map(({ installment, amounts }) => ({
      id: `${registerId}:${enrollmentId}:${installment}`,
      registerId,
      enrollmentId,
      installment,
      ...amounts,
    }));
    await db.transaction("rw", db.feeEntries, async () => {
      await db.feeEntries.bulkPut(nextEntries);
    });
    const nextIds = new SvelteSet(nextEntries.map((entry) => entry.id));
    this.feeEntries = [
      ...this.feeEntries.filter((entry) => !nextIds.has(entry.id)),
      ...nextEntries,
    ];
  }

  async saveInstallmentMeta(
    registerId: string,
    installment: InstallmentNumber,
    rate: number,
    receiverName: string,
  ) {
    const meta: InstallmentMeta = {
      id: `${registerId}:${installment}`,
      registerId,
      installment,
      rate,
      receiverName: receiverName.trim(),
    };
    await db.installmentMeta.put(meta);
    this.installmentMeta = [
      ...this.installmentMeta.filter((item) => item.id !== meta.id),
      meta,
    ];
  }

  async saveRemark(registerId: string, enrollmentId: string, text: string) {
    const remarkId = `${registerId}:${enrollmentId}`;
    if (text.trim()) {
      const remark: StudentRemark = {
        id: remarkId,
        registerId,
        enrollmentId,
        text: text.trim(),
      };
      await db.remarks.put(remark);
      this.remarks = [
        ...this.remarks.filter((item) => item.id !== remarkId),
        remark,
      ];
    } else {
      await db.remarks.delete(remarkId);
      this.remarks = this.remarks.filter((item) => item.id !== remarkId);
    }
  }

  async requestPersistentStorage() {
    if ("storage" in navigator && navigator.storage.persist) {
      this.storagePersistent = await navigator.storage.persist();
    }
  }

  async backup() {
    return exportAttendanceDatabase();
  }

  async inspectBackup(file: File) {
    return inspectAttendanceBackup(file);
  }

  async restore(file: File) {
    await restoreAttendanceDatabase(file);
    this.selectedRegisterId = null;
    this.selectedTestId = null;
    await this.refresh();
  }

  currentMonthDate(register: Register, preferredDay = 1) {
    return dateKey(
      register.year,
      register.month,
      Math.min(preferredDay, daysInMonth(register.year, register.month)),
    );
  }
}
