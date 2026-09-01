import { describe, expect, it } from "vitest";
import {
  addFees,
  academicYearStartYear,
  academicYearStartYearForDate,
  attendanceReport,
  broughtForwardAttendance,
  currentAttendance,
  dateKey,
  daysInMonth,
  displayToMinor,
  feeGrandTotal,
  feesByEnrollment,
  installmentStudentCount,
  isAttendanceDateEditable,
  isEnrollmentActiveOn,
  isEnrollmentInMonth,
  isHolidayDay,
  monthlyMovement,
  marksPercentage,
  testSummary,
  testCountsBySubject,
  subjectReportPeriod,
  testReportAggregate,
  workingTimings,
} from "./calculations";
import type {
  AttendanceMark,
  Enrollment,
  EnrollmentRow,
  FeeEntry,
  Holiday,
  Register,
  SchoolSettings,
} from "./types";

const settings: SchoolSettings = {
  id: "school",
  schoolName: "Test School",
  academicYearStartMonth: 4,
  currencyLabel: "Rs.",
  classInchargeName: "",
  updatedAt: "",
};

const register = (id: string, year: number, month: number): Register => ({
  id,
  classGroupId: "class-1",
  year,
  month,
  createdAt: "",
});

describe("attendance calendar calculations", () => {
  it("uses April as the academic-year boundary", () => {
    expect(academicYearStartYear(register("mar", 2026, 3), settings)).toBe(
      2025,
    );
    expect(academicYearStartYear(register("apr", 2026, 4), settings)).toBe(
      2026,
    );
  });

  it("handles leap-year month lengths and zero-padded date keys", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
    expect(dateKey(2026, 8, 3)).toBe("2026-08-03");
  });

  it("allows attendance edits only for today and the previous seven dates", () => {
    const august = register("aug", 2026, 8);
    const currentDate = new Date(2026, 7, 30);
    expect(isAttendanceDateEditable(august, 30, currentDate)).toBe(true);
    expect(isAttendanceDateEditable(august, 23, currentDate)).toBe(true);
    expect(isAttendanceDateEditable(august, 22, currentDate)).toBe(false);
    expect(isAttendanceDateEditable(august, 31, currentDate)).toBe(false);
  });

  it("treats weekends and custom dates as holidays", () => {
    const august = register("aug", 2026, 8);
    const holidays: Holiday[] = [
      { id: "aug:3", registerId: "aug", day: 3, title: "School holiday" },
    ];
    expect(isHolidayDay(holidays, august, 1)).toBe(true);
    expect(isHolidayDay(holidays, august, 2)).toBe(true);
    expect(isHolidayDay(holidays, august, 3)).toBe(true);
    expect(isHolidayDay(holidays, august, 4)).toBe(false);
    expect(workingTimings(august, holidays)).toBe(40);
  });

  it("links brought-forward present sessions within the academic year", () => {
    const april = register("apr", 2026, 4);
    const may = register("may", 2026, 5);
    const march = register("mar", 2026, 3);
    const marks: AttendanceMark[] = [
      {
        id: "1",
        registerId: "apr",
        enrollmentId: "e1",
        day: 1,
        session: 1,
        status: "P",
      },
      {
        id: "2",
        registerId: "apr",
        enrollmentId: "e1",
        day: 1,
        session: 2,
        status: "A",
      },
      {
        id: "3",
        registerId: "may",
        enrollmentId: "e1",
        day: 1,
        session: 1,
        status: "P",
      },
      {
        id: "4",
        registerId: "mar",
        enrollmentId: "e1",
        day: 1,
        session: 1,
        status: "P",
      },
    ];
    expect(
      broughtForwardAttendance(marks, [march, april, may], may, settings, "e1"),
    ).toBe(0.5);
    expect(currentAttendance(marks, may.id, "e1")).toBe(0.5);
  });

  it("excludes another class and the previous academic year from brought-forward totals", () => {
    const current = register("current", 2026, 5);
    const sameYear = register("same-year", 2026, 4);
    const oldYear = register("old-year", 2026, 3);
    const otherClass = {
      ...register("other-class", 2026, 4),
      classGroupId: "class-2",
    };
    const marks: AttendanceMark[] = [
      {
        id: "1",
        registerId: sameYear.id,
        enrollmentId: "e1",
        day: 1,
        session: 1,
        status: "P",
      },
      {
        id: "2",
        registerId: oldYear.id,
        enrollmentId: "e1",
        day: 1,
        session: 1,
        status: "P",
      },
      {
        id: "3",
        registerId: otherClass.id,
        enrollmentId: "e1",
        day: 1,
        session: 1,
        status: "P",
      },
    ];
    expect(
      broughtForwardAttendance(
        marks,
        [current, sameYear, oldYear, otherClass],
        current,
        settings,
        "e1",
      ),
    ).toBe(0.5);
  });

  it("treats admission and struck-off dates as inclusive attendance boundaries", () => {
    const enrollment: Enrollment = {
      id: "e1",
      studentId: "s1",
      classGroupId: "class-1",
      rollNumber: "1",
      admittedOn: "2026-08-10",
      struckOffOn: "2026-08-20",
    };
    expect(isEnrollmentActiveOn(enrollment, "2026-08-09")).toBe(false);
    expect(isEnrollmentActiveOn(enrollment, "2026-08-10")).toBe(true);
    expect(isEnrollmentActiveOn(enrollment, "2026-08-20")).toBe(true);
    expect(isEnrollmentActiveOn(enrollment, "2026-08-21")).toBe(false);
    expect(isEnrollmentInMonth(enrollment, register("aug", 2026, 8))).toBe(
      true,
    );
    expect(isEnrollmentInMonth(enrollment, register("sep", 2026, 9))).toBe(
      false,
    );
  });

  it("derives beginning, end, admitted, and struck-off counts from enrollment dates", () => {
    const month = register("aug", 2026, 8);
    const row = (
      id: string,
      admittedOn: string,
      struckOffOn?: string,
    ): EnrollmentRow => ({
      student: { id, admissionNumber: id, name: id, phone: "", createdAt: "" },
      enrollment: {
        id,
        studentId: id,
        classGroupId: "class-1",
        rollNumber: id,
        admittedOn,
        struckOffOn,
      },
    });
    const movement = monthlyMovement(
      [
        row("existing", dateKey(2026, 7, 1)),
        row("new", dateKey(2026, 8, 10)),
        row("left", dateKey(2026, 7, 1), dateKey(2026, 8, 20)),
      ],
      month,
    );
    expect(movement).toEqual({
      beginning: 2,
      end: 2,
      admitted: 1,
      struckOff: 1,
    });
  });

  it("builds daily reports with explicit absentees and unmarked timings", () => {
    const august = register("aug", 2026, 8);
    const row: EnrollmentRow = {
      student: {
        id: "s1",
        admissionNumber: "A1",
        name: "Ayaan S/O Awaan",
        phone: "0300",
        createdAt: "",
      },
      enrollment: {
        id: "e1",
        studentId: "s1",
        classGroupId: "class-1",
        rollNumber: "1",
        admittedOn: "2026-08-01",
      },
    };
    const marks: AttendanceMark[] = [
      {
        id: "1",
        registerId: "aug",
        enrollmentId: "e1",
        day: 3,
        session: 1,
        status: "A",
      },
    ];
    const report = attendanceReport([row], marks, [], august, "daily", 3);
    expect(report.label).toContain("August 3, 2026");
    expect(report.absent).toBe(0.5);
    expect(report.unmarked).toBe(0.5);
    expect(report.possible).toBe(1);
    expect(report.students[0]?.absentSessions).toEqual([1]);
  });

  it("creates a Monday-to-Sunday weekly report within the register month", () => {
    const august = register("aug", 2026, 8);
    const report = attendanceReport([], [], [], august, "weekly", 12);
    expect([report.startDay, report.endDay]).toEqual([10, 16]);
  });
});

describe("Test calculations", () => {
  it("distinguishes numeric Marks, Absent, and Not Entered in one summary", () => {
    const summary = testSummary(
      { id: "test-1", totalMarks: 40 },
      [
        { testId: "test-1", enrollmentId: "e1" },
        { testId: "test-1", enrollmentId: "e2" },
        { testId: "test-1", enrollmentId: "e3" },
        { testId: "test-1", enrollmentId: "e4" },
      ],
      [
        {
          testId: "test-1",
          enrollmentId: "e1",
          status: "marks" as const,
          marks: 32.5,
        },
        {
          testId: "test-1",
          enrollmentId: "e2",
          status: "marks" as const,
          marks: 0,
        },
        { testId: "test-1", enrollmentId: "e3", status: "absent" as const },
      ],
    );

    expect(summary).toEqual({
      progress: "in-progress",
      numericCount: 2,
      absentCount: 1,
      notEnteredCount: 1,
      average: 16.25,
      highest: 32.5,
      lowest: 0,
    });
  });

  it("calculates a Test Result percentage from Marks and Total Marks", () => {
    expect(marksPercentage(17.5, 20)).toBe(87.5);
  });

  it("derives a Test academic year from its date and the current school boundary", () => {
    expect(academicYearStartYearForDate("2026-03-31", settings)).toBe(2025);
    expect(academicYearStartYearForDate("2026-04-01", settings)).toBe(2026);
  });

  it("counts filtered Tests overall and includes zero-count active Subjects", () => {
    expect(
      testCountsBySubject(
        [
          { id: "math", name: "Mathematics" },
          { id: "science", name: "Science" },
          { id: "history", name: "History", archivedAt: "2026-08-01" },
        ],
        [
          { subjectId: "math" },
          { subjectId: "math" },
          { subjectId: "history" },
        ],
      ),
    ).toEqual({
      total: 3,
      bySubject: [
        { subjectId: "math", count: 2 },
        { subjectId: "science", count: 0 },
      ],
    });
  });

  it("uses calendar day, Monday-to-Sunday week, and calendar month report periods", () => {
    expect(subjectReportPeriod("daily", "2026-09-02")).toEqual({
      startDate: "2026-09-02",
      endDate: "2026-09-02",
      label: "Wednesday, 2 September 2026",
    });
    expect(subjectReportPeriod("weekly", "2026-09-02")).toEqual({
      startDate: "2026-08-31",
      endDate: "2026-09-06",
      label: "31 Aug – 6 Sept 2026",
    });
    expect(subjectReportPeriod("monthly", "2026-09-02")).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      label: "September 2026",
    });
  });

  it("returns an empty report period when the anchor date is cleared", () => {
    expect(subjectReportPeriod("daily", "")).toEqual({
      startDate: "",
      endDate: "",
      label: "Choose a report date",
    });
  });

  it("aggregates normalized Test Results across different Total Marks", () => {
    expect(
      testReportAggregate(
        [
          { id: "test-1", totalMarks: 40 },
          { id: "test-2", totalMarks: 20 },
        ],
        [
          { testId: "test-1", enrollmentId: "e1" },
          { testId: "test-1", enrollmentId: "e2" },
          { testId: "test-2", enrollmentId: "e1" },
          { testId: "test-2", enrollmentId: "e2" },
        ],
        [
          {
            testId: "test-1",
            enrollmentId: "e1",
            status: "marks" as const,
            marks: 20,
          },
          { testId: "test-1", enrollmentId: "e2", status: "absent" as const },
          {
            testId: "test-2",
            enrollmentId: "e1",
            status: "marks" as const,
            marks: 20,
          },
        ],
      ),
    ).toEqual({
      totalTests: 2,
      numericCount: 2,
      absentCount: 1,
      notEnteredCount: 1,
      averagePercentage: 75,
    });
  });
});

describe("fee calculations", () => {
  it("adds category totals and calculates the grand total in minor units", () => {
    const total = addFees(
      {
        ftf: 10000,
        ff: 500,
        arrears: 0,
        lateCertificate: 0,
        slc: 1000,
        dcf: 0,
      },
      {
        ftf: 5000,
        ff: 500,
        arrears: 2500,
        lateCertificate: 750,
        slc: 0,
        dcf: 250,
      },
    );
    expect(total).toEqual({
      ftf: 15000,
      ff: 1000,
      arrears: 2500,
      lateCertificate: 750,
      slc: 1000,
      dcf: 250,
    });
    expect(feeGrandTotal(total)).toBe(20500);
  });

  it("counts installment students from fee columns without including record metadata", () => {
    const entries: FeeEntry[] = [
      {
        id: "register:e1:1",
        registerId: "register",
        enrollmentId: "e1",
        installment: 1,
        ftf: 10000,
        ff: 0,
        arrears: 0,
        lateCertificate: 0,
        slc: 0,
        dcf: 0,
      },
      {
        id: "register:e2:1",
        registerId: "register",
        enrollmentId: "e2",
        installment: 1,
        ftf: 0,
        ff: 0,
        arrears: 0,
        lateCertificate: 0,
        slc: 0,
        dcf: 0,
      },
    ];
    expect(feeGrandTotal(entries[0])).toBe(10000);
    expect(installmentStudentCount(entries, "register", 1)).toBe(1);
  });

  it("indexes and aggregates all installments by enrollment", () => {
    const entries: FeeEntry[] = [
      {
        id: "1",
        registerId: "r1",
        enrollmentId: "e1",
        installment: 1,
        ftf: 1000,
        ff: 100,
        arrears: 0,
        lateCertificate: 0,
        slc: 0,
        dcf: 0,
      },
      {
        id: "2",
        registerId: "r1",
        enrollmentId: "e1",
        installment: 2,
        ftf: 500,
        ff: 0,
        arrears: 200,
        lateCertificate: 0,
        slc: 0,
        dcf: 0,
      },
      {
        id: "3",
        registerId: "r2",
        enrollmentId: "e1",
        installment: 1,
        ftf: 9999,
        ff: 0,
        arrears: 0,
        lateCertificate: 0,
        slc: 0,
        dcf: 0,
      },
    ];
    expect(feesByEnrollment(entries, "r1").get("e1")).toEqual({
      ftf: 1500,
      ff: 100,
      arrears: 200,
      lateCertificate: 0,
      slc: 0,
      dcf: 0,
    });
  });

  it("converts currency input safely and rounds to the nearest minor unit", () => {
    expect(displayToMinor("12.345")).toBe(1235);
    expect(displayToMinor("not a number")).toBe(0);
    expect(displayToMinor("-5")).toBe(0);
    expect(displayToMinor(9.99)).toBe(999);
  });
});
