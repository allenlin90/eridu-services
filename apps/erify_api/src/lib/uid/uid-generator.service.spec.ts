import { nanoid } from 'nanoid';

import { UidGeneratorService } from './uid-generator.service';

jest.mock('nanoid', () => ({ nanoid: jest.fn() }));

const mockedNanoid = jest.mocked(nanoid);

describe('uidGeneratorService', () => {
  const service = new UidGeneratorService();

  beforeEach(() => {
    mockedNanoid.mockReset();
    mockedNanoid.mockReturnValue('generated');
  });

  it('generates a branded UID with the default random-part length', () => {
    expect(service.generateBrandedId('show')).toBe('show_generated');
    expect(mockedNanoid).toHaveBeenCalledWith(20);
  });

  it('forwards a custom random-part length', () => {
    expect(service.generateBrandedId('task', 12)).toBe('task_generated');
    expect(mockedNanoid).toHaveBeenCalledWith(12);
  });
});
