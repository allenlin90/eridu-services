import { isTimeOverlapping } from './time-overlap.util';

describe('isTimeOverlapping', () => {
  it.each([
    ['complete overlap', '10:00', '12:00', '10:00', '12:00', true],
    ['partial overlap', '10:00', '12:00', '11:00', '13:00', true],
    ['containing range', '10:00', '14:00', '11:00', '13:00', true],
    ['touching edges', '10:00', '12:00', '12:00', '14:00', false],
    ['separate ranges', '10:00', '12:00', '13:00', '15:00', false],
  ])(
    '%s',
    (_case, start1, end1, start2, end2, expected) => {
      const at = (time: string) => `2024-01-01T${time}:00Z`;

      expect(
        isTimeOverlapping(at(start1), at(end1), at(start2), at(end2)),
      ).toBe(expected);
    },
  );
});
