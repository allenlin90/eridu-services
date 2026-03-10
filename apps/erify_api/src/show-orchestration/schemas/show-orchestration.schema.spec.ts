import { UpdateShowWithAssignmentsDto } from './show-orchestration.schema';

describe('updateShowWithAssignmentsDto', () => {
  it('accepts creators payload and maps to creator assignments', () => {
    const dto = UpdateShowWithAssignmentsDto.create({
      creators: [
        {
          creator_id: 'creator_1',
          note: 'creator note',
          metadata: { source: 'creator' },
        },
      ],
    });

    expect(dto.showCreators).toEqual([
      {
        creatorId: 'creator_1',
        note: 'creator note',
        metadata: { source: 'creator' },
      },
    ]);
  });
});
