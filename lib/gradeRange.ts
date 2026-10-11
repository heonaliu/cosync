// Optional grade range on an opportunity: gradeMin/gradeMax on the doc,
// either end can be left open ("9th grade and up"). 13 stands for college
// so ranges like "11th grade – college" stay a simple numeric comparison.
export const COLLEGE_GRADE = 13;

export const GRADE_OPTIONS: { value: number; label: string }[] = [
  ...[6, 7, 8, 9, 10, 11, 12].map((grade) => ({ value: grade, label: `${grade}th` })),
  { value: COLLEGE_GRADE, label: 'College' },
];

function gradeLabel(grade: number): string {
  return grade === COLLEGE_GRADE ? 'college' : `${grade}th`;
}

export function isGrade(value: unknown): value is number {
  return typeof value === 'number' && GRADE_OPTIONS.some((option) => option.value === value);
}

/** e.g. "9th–12th grade", "11th grade – college", "9th grade and up";
 * null when neither end is set. */
export function formatGradeRange(min?: number, max?: number): string | null {
  if (min === undefined && max === undefined) return null;
  if (min !== undefined && max !== undefined) {
    if (min === max) return min === COLLEGE_GRADE ? 'College students' : `${gradeLabel(min)} grade`;
    if (max === COLLEGE_GRADE) return `${gradeLabel(min)} grade – college`;
    return `${gradeLabel(min)}–${gradeLabel(max)} grade`;
  }
  if (min !== undefined) return min === COLLEGE_GRADE ? 'College students' : `${gradeLabel(min)} grade and up`;
  return max === COLLEGE_GRADE ? 'Up to college' : `Up to ${gradeLabel(max as number)} grade`;
}
