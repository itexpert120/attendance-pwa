import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { AttendanceState } from "./app-state.svelte";
import { db } from "./db";
import type { Enrollment, Register, Student } from "./types";

const editableDate = new Date();
editableDate.setDate(editableDate.getDate() - 1);
while (editableDate.getDay() === 0 || editableDate.getDay() === 6) {
  editableDate.setDate(editableDate.getDate() - 1);
}
const editableDay = editableDate.getDate();

const register: Register = {
  id: "register-1",
  classGroupId: "class-1",
  year: editableDate.getFullYear(),
  month: editableDate.getMonth() + 1,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const student: Student = {
  id: "student-1",
  admissionNumber: "A-001",
  name: "Test Student",
  phone: "03000000000",
  createdAt: "2026-08-01T00:00:00.000Z",
};

const enrollment: Enrollment = {
  id: "enrollment-1",
  studentId: student.id,
  classGroupId: register.classGroupId,
  rollNumber: "1",
  admittedOn: `${editableDate.getFullYear()}-${String(editableDate.getMonth() + 1).padStart(2, "0")}-01`,
};

function createState() {
  const state = new AttendanceState();
  state.students = [student];
  state.enrollments = [enrollment];
  state.registers = [register];
  state.marks = [];
  state.holidays = [];
  return state;
}

describe("attendance state hot-path updates", () => {
  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  afterAll(async () => {
    db.close();
    await db.delete();
  });

  it("updates a single mark in memory after the IndexedDB write", async () => {
    const state = createState();

    await state.setMark(register, enrollment, editableDay, 1, "P");

    expect(state.marks).toHaveLength(1);
    expect(state.marks[0]?.status).toBe("P");
    expect(
      (await db.attendance.get(`register-1:enrollment-1:${editableDay}:1`))
        ?.status,
    ).toBe("P");

    await state.setMark(register, enrollment, editableDay, 1, null);
    expect(state.marks).toHaveLength(0);
    expect(await db.attendance.count()).toBe(0);
  });

  it("preserves hidden struck-off attendance during bulk marking and clearing", async () => {
    const state = createState();
    await state.setMark(register, enrollment, editableDay, 1, "P");
    state.enrollments = [{ ...enrollment, struckOffOn: `${enrollment.admittedOn.slice(0, 7)}-${String(editableDay).padStart(2, "0")}` }];
    expect(state.attendanceRowsForRegister(register)).toHaveLength(0);
    expect(state.rowsForRegister(register)).toHaveLength(1);
    await state.bulkSetMarks(register, editableDay, 1, "A");
    await state.bulkSetMarks(register, editableDay, 1, null);
    expect(state.marks).toHaveLength(1);
    expect(state.marks[0]?.status).toBe("P");
    expect((await db.attendance.toArray())[0]?.status).toBe("P");
    state.enrollments = [enrollment];
    expect(state.attendanceRowsForRegister(register)).toHaveLength(1);
  });

  it("clears local and stored marks when a school holiday is created", async () => {
    const state = createState();
    await state.setMark(register, enrollment, editableDay, 1, "P");
    await state.setMark(register, enrollment, editableDay, 2, "A");

    await state.toggleHoliday(register, editableDay);

    expect(state.holidays).toHaveLength(1);
    expect(state.holidays[0]?.title).toBe("School holiday");
    expect(state.marks).toHaveLength(0);
    expect(await db.attendance.count()).toBe(0);
  });

  it("stores the reason supplied for a school holiday", async () => {
    const state = createState();
    await state.toggleHoliday(register, editableDay, "Independence Day");
    expect(state.holidays[0]?.title).toBe("Independence Day");
    expect((await db.holidays.get(`register-1:${editableDay}`))?.title).toBe(
      "Independence Day",
    );
  });

  it("does not write attendance older than seven days", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8);
    const oldRegister: Register = {
      ...register,
      id: "old-register",
      year: oldDate.getFullYear(),
      month: oldDate.getMonth() + 1,
    };
    await createState().setMark(
      oldRegister,
      enrollment,
      oldDate.getDate(),
      1,
      "P",
    );
    expect(await db.attendance.count()).toBe(0);
  });

  it("duplicates a class with only active enrollments", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    await db.students.put(student);
    await db.enrollments.put(enrollment);

    const duplicated = await state.duplicateClass(
      "class-1",
      "8",
      "A",
      enrollment.admittedOn,
    );

    expect(duplicated.className).toBe("8");
    expect(
      state.enrollments.some(
        (item) =>
          item.classGroupId === duplicated.id && item.studentId === student.id,
      ),
    ).toBe(true);
  });

  it("creates a Test with a roster snapshot of active Enrollments", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    await db.students.put(student);
    await db.enrollments.put(enrollment);

    const subject = await state.saveSubject("Mathematics");
    const created = await state.createTest({
      name: "Midterm",
      subjectId: subject.id,
      classGroupId: "class-1",
      date: editableDate.toISOString().slice(0, 10),
      totalMarks: 40,
    });

    expect(created.name).toBe("Midterm");
    expect(state.testRoster).toEqual([
      expect.objectContaining({
        testId: created.id,
        enrollmentId: enrollment.id,
      }),
    ]);
  });

  it("transitions a Test Result between Marks, Absent, and Not Entered", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    await db.students.put(student);
    await db.enrollments.put(enrollment);
    const subject = await state.saveSubject("Mathematics");
    const created = await state.createTest({
      name: "Midterm",
      subjectId: subject.id,
      classGroupId: "class-1",
      date: editableDate.toISOString().slice(0, 10),
      totalMarks: 40,
    });

    await state.setTestResult(created.id, enrollment.id, {
      status: "marks",
      marks: 0,
    });
    expect(state.testResults[0]).toEqual(
      expect.objectContaining({ status: "marks", marks: 0 }),
    );

    await state.setTestResult(created.id, enrollment.id, { status: "absent" });
    expect(state.testResults[0]).toEqual(
      expect.objectContaining({ status: "absent" }),
    );
    expect(state.testResults[0]?.marks).toBeUndefined();

    await state.setTestResult(created.id, enrollment.id, null);
    expect(state.testResults).toHaveLength(0);
  });

  it("accepts ordinary marks values with two decimal places", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    await db.students.put(student);
    await db.enrollments.put(enrollment);
    const subject = await state.saveSubject("Mathematics");
    const created = await state.createTest({
      name: "Decimal Test",
      subjectId: subject.id,
      classGroupId: "class-1",
      date: editableDate.toISOString().slice(0, 10),
      totalMarks: 10.12,
    });

    await state.setTestResult(created.id, enrollment.id, {
      status: "marks",
      marks: 5.07,
    });

    expect(created.totalMarks).toBe(10.12);
    expect(state.testResults[0]).toEqual(
      expect.objectContaining({ marks: 5.07 }),
    );
  });

  it("refreshes a Test Roster only before result entry begins", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    await db.students.put(student);
    await db.enrollments.put(enrollment);
    const subject = await state.saveSubject("Mathematics");
    const created = await state.createTest({
      name: "Midterm",
      subjectId: subject.id,
      classGroupId: "class-1",
      date: editableDate.toISOString().slice(0, 10),
      totalMarks: 40,
    });
    const addedEnrollment = {
      ...enrollment,
      id: "enrollment-2",
      studentId: "student-2",
      rollNumber: "2",
    };
    const addedStudent = {
      ...student,
      id: "student-2",
      admissionNumber: "A-002",
      name: "Second Student",
    };
    state.students = [...state.students, addedStudent];
    state.enrollments = [...state.enrollments, addedEnrollment];
    await db.students.put(addedStudent);
    await db.enrollments.put(addedEnrollment);

    await state.refreshTestRoster(created.id);
    expect(
      state.testRoster.filter((entry) => entry.testId === created.id),
    ).toHaveLength(2);

    await state.setTestResult(created.id, enrollment.id, {
      status: "marks",
      marks: 30,
    });
    await expect(state.refreshTestRoster(created.id)).rejects.toThrow(
      "before entering results",
    );
  });

  it("locks roster-defining Test fields and protects recorded Marks", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    await db.students.put(student);
    await db.enrollments.put(enrollment);
    const subject = await state.saveSubject("Mathematics");
    const created = await state.createTest({
      name: "Midterm",
      subjectId: subject.id,
      classGroupId: "class-1",
      date: editableDate.toISOString().slice(0, 10),
      totalMarks: 40,
    });
    await state.setTestResult(created.id, enrollment.id, {
      status: "marks",
      marks: 30,
    });

    await expect(
      state.updateTest(created.id, { ...created, date: "2099-01-01" }),
    ).rejects.toThrow("Class Group and date are locked");
    await expect(
      state.updateTest(created.id, { ...created, totalMarks: 20 }),
    ).rejects.toThrow("below recorded Marks");

    const updated = await state.updateTest(created.id, {
      ...created,
      name: "Term Midterm",
    });
    expect(updated.name).toBe("Term Midterm");
  });

  it("creates and updates one Daily Homework Report per Class Group and date", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    const subject = await state.saveSubject("Mathematics");

    const created = await state.createDailyHomeworkReport({
      classGroupId: "class-1",
      date: "2026-09-01",
      inchargeName: "Ms Fatima",
      parentNote: "Please sign after checking the work.",
      items: [{ subjectId: subject.id, details: "Complete exercise 4." }],
    });

    expect(created.items).toEqual([
      { subjectId: subject.id, details: "Complete exercise 4.", order: 0 },
    ]);
    await expect(
      state.createDailyHomeworkReport({
        classGroupId: "class-1",
        date: "2026-09-01",
        inchargeName: "Ms Fatima",
        parentNote: "Please sign.",
        items: [{ subjectId: subject.id, details: "Read chapter 2." }],
      }),
    ).rejects.toThrow("already exists");

    const updated = await state.updateDailyHomeworkReport(created.id, {
      classGroupId: "class-1",
      date: "2026-09-01",
      inchargeName: "Ms Fatima",
      parentNote: "Bring the completed notebook tomorrow.",
      items: [{ subjectId: subject.id, details: "Complete exercise 4 and 5." }],
    });
    expect(updated.parentNote).toBe("Bring the completed notebook tomorrow.");
    expect(state.dailyHomeworkReports).toHaveLength(1);
  });

  it("requires complete, non-duplicated Homework Items", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    const subject = await state.saveSubject("Mathematics");

    await expect(
      state.createDailyHomeworkReport({
        classGroupId: "class-1",
        date: "2026-09-01",
        inchargeName: "Ms Fatima",
        parentNote: "Please sign.",
        items: [
          { subjectId: subject.id, details: "Exercise 4." },
          { subjectId: subject.id, details: "Exercise 5." },
        ],
      }),
    ).rejects.toThrow("once");
  });

  it("rejects an impossible Daily Homework Report date", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    const subject = await state.saveSubject("Mathematics");

    await expect(
      state.createDailyHomeworkReport({
        classGroupId: "class-1",
        date: "2026-02-31",
        inchargeName: "Ms Fatima",
        parentNote: "Please sign.",
        items: [{ subjectId: subject.id, details: "Exercise 4." }],
      }),
    ).rejects.toThrow("required");
  });

  it("saves a Daily Homework Report from a diary photo instead of Homework Items", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);

    const created = await state.createDailyHomeworkReport({
      classGroupId: "class-1",
      date: "2026-09-01",
      inchargeName: "Ms Fatima",
      parentNote: "Please sign after checking the work.",
      items: [],
      photoDataUrl: "data:image/jpeg;base64,/9j/diary",
    });

    expect(created.items).toEqual([]);
    expect(created.photoDataUrl).toBe("data:image/jpeg;base64,/9j/diary");
    expect((await db.homeworkReports.get(created.id))?.photoDataUrl).toBe(
      "data:image/jpeg;base64,/9j/diary",
    );
  });

  it("rejects a Daily Homework Report that mixes a diary photo with Homework Items", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    const subject = await state.saveSubject("Mathematics");

    await expect(
      state.createDailyHomeworkReport({
        classGroupId: "class-1",
        date: "2026-09-01",
        inchargeName: "Ms Fatima",
        parentNote: "Please sign.",
        items: [{ subjectId: subject.id, details: "Exercise 4." }],
        photoDataUrl: "data:image/jpeg;base64,/9j/diary",
      }),
    ).rejects.toThrow("not both");
  });

  it("rejects a Daily Homework Report with neither Homework Items nor a diary photo", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);

    await expect(
      state.createDailyHomeworkReport({
        classGroupId: "class-1",
        date: "2026-09-01",
        inchargeName: "Ms Fatima",
        parentNote: "Please sign.",
        items: [],
      }),
    ).rejects.toThrow("diary photo");
  });

  it("clears the diary photo when a Daily Homework Report is updated to typed Homework Items", async () => {
    const state = createState();
    state.classGroups = [
      { id: "class-1", className: "7", section: "A", createdAt: "" },
    ];
    await db.classGroups.put(state.classGroups[0]!);
    const subject = await state.saveSubject("Mathematics");

    const created = await state.createDailyHomeworkReport({
      classGroupId: "class-1",
      date: "2026-09-01",
      inchargeName: "Ms Fatima",
      parentNote: "Please sign.",
      items: [],
      photoDataUrl: "data:image/jpeg;base64,/9j/diary",
    });

    const updated = await state.updateDailyHomeworkReport(created.id, {
      classGroupId: "class-1",
      date: "2026-09-01",
      inchargeName: "Ms Fatima",
      parentNote: "Please sign.",
      items: [{ subjectId: subject.id, details: "Complete exercise 4." }],
    });

    expect(updated.items).toEqual([
      { subjectId: subject.id, details: "Complete exercise 4.", order: 0 },
    ]);
    expect(updated.photoDataUrl).toBeUndefined();
    expect((await db.homeworkReports.get(created.id))?.photoDataUrl).toBeUndefined();
  });
});
