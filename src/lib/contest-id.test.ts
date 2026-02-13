import { buildContestIdFromFormat, createUniqueVoteId, slugifyContestTitle } from './contest-id'

describe('contest-id helpers', () => {
  it('slugifies contest titles', () => {
    expect(slugifyContestTitle('Friday Lunch!')).toBe('friday-lunch')
  })

  it('builds recurring IDs using close date format', () => {
    const id = buildContestIdFromFormat({
      title: 'Friday Lunch',
      closeAt: new Date('2026-02-13T18:00:00.000Z'),
      format: '{title}-{close-mm-dd-yyyy}',
    })

    expect(id).toBe('friday-lunch-02-13-2026')
  })

  it('creates unique IDs by appending a suffix', () => {
    const existing = new Set(['friday-lunch-02-13-2026'])
    const next = createUniqueVoteId('friday-lunch-02-13-2026', (candidate) => existing.has(candidate))
    expect(next).toBe('friday-lunch-02-13-2026-2')
  })
})
