import { countIRV, IRVBallot, IRVResult } from './irv'

describe('IRV Algorithm', () => {
  describe('Basic functionality', () => {
    it('should return correct winner with clear majority in first round', () => {
      const options = ['A', 'B', 'C']
      const ballots: IRVBallot[] = [
        { rankings: ['A', 'B', 'C'] },
        { rankings: ['A', 'B', 'C'] },
        { rankings: ['A', 'C', 'B'] },
        { rankings: ['B', 'A', 'C'] },
        { rankings: ['C', 'B', 'A'] },
      ]

      const result = countIRV(options, ballots)

      expect(result.winner).toBe('A')
      expect(result.isTie).toBe(false)
      expect(result.totalBallots).toBe(5)
      expect(result.rounds.length).toBe(1)
      expect(result.rounds[0].tallies).toEqual({ A: 3, B: 1, C: 1 })
    })

    it('should eliminate lowest and redistribute votes', () => {
      const options = ['A', 'B', 'C']
      const ballots: IRVBallot[] = [
        { rankings: ['A', 'B', 'C'] },
        { rankings: ['A', 'B', 'C'] },
        { rankings: ['B', 'A', 'C'] },
        { rankings: ['B', 'A', 'C'] },
        { rankings: ['C', 'B', 'A'] },
      ]

      const result = countIRV(options, ballots)

      // Round 1: A=2, B=2, C=1 - C eliminated
      // Round 2: A=2, B=3 - B wins
      expect(result.winner).toBe('B')
      expect(result.isTie).toBe(false)
      expect(result.rounds.length).toBe(2)
      expect(result.rounds[0].eliminated).toBe('C')
      expect(result.rounds[1].winner).toBe('B')
    })

    it('should handle exhausted ballots', () => {
      const options = ['A', 'B', 'C']
      const ballots: IRVBallot[] = [
        { rankings: ['A'] }, // Will exhaust after A eliminated
        { rankings: ['A'] }, // Will exhaust after A eliminated
        { rankings: ['B', 'C'] },
        { rankings: ['B', 'C'] },
        { rankings: ['B', 'C'] },
        { rankings: ['C', 'B'] },
        { rankings: ['C', 'B'] },
      ]

      const result = countIRV(options, ballots)

      // Round 1: A=2, B=3, C=2 - A eliminated (weighted tie-break favors C)
      // Round 2: B=3, C=2 (2 ballots exhausted) - B wins with >50% of active
      expect(result.winner).toBe('B')
      expect(result.rounds[0].eliminated).toBe('A')
      expect(result.rounds[1].activeBallotCount).toBe(5)
    })
  })

  describe('Edge cases', () => {
    it('should return null winner for empty options', () => {
      const result = countIRV([], [{ rankings: ['A'] }])
      expect(result.winner).toBe(null)
      expect(result.rounds.length).toBe(0)
    })

    it('should declare tie with empty ballots', () => {
      const result = countIRV(['A', 'B'], [])
      expect(result.winner).toBe(null)
      expect(result.isTie).toBe(true)
      expect(result.tiedOptions).toEqual(['A', 'B'])
    })

    it('should handle single option', () => {
      const ballots: IRVBallot[] = [
        { rankings: ['A'] },
        { rankings: ['A'] },
      ]
      const result = countIRV(['A'], ballots)
      expect(result.winner).toBe('A')
      expect(result.rounds.length).toBe(1)
    })

    it('should handle all ballots ranking same option first', () => {
      const ballots: IRVBallot[] = [
        { rankings: ['A', 'B'] },
        { rankings: ['A', 'C'] },
        { rankings: ['A', 'B'] },
      ]
      const result = countIRV(['A', 'B', 'C'], ballots)
      expect(result.winner).toBe('A')
      expect(result.rounds.length).toBe(1)
      expect(result.rounds[0].tallies).toEqual({ A: 3, B: 0, C: 0 })
    })
  })

  describe('Tie handling', () => {


    it('should use weighted ranking support before first-round totals in elimination ties', () => {
      const options = ['A', 'B', 'C', 'D']
      const ballots: IRVBallot[] = [
        { rankings: ['A', 'B', 'C', 'D'] },
        { rankings: ['A', 'B', 'D', 'C'] },
        { rankings: ['B', 'D', 'C', 'A'] },
        { rankings: ['B', 'D', 'C', 'A'] },
        { rankings: ['C', 'D', 'B', 'A'] },
        { rankings: ['D', 'C', 'B', 'A'] },
      ]

      const result = countIRV(options, ballots)

      // Round 1 tallies: A=2, B=2, C=1, D=1
      // C and D tie on first-choice votes; weighted ranking support eliminates C first.
      expect(result.rounds[0].eliminated).toBe('C')
    })
    it('should break tie using first-round totals', () => {
      const options = ['A', 'B', 'C']
      // A=2, B=2, C=1 in first round
      // A and B tie, but A and B have same first round count
      // Should eliminate lexicographically first (A)
      const ballots: IRVBallot[] = [
        { rankings: ['A', 'B', 'C'] },
        { rankings: ['A', 'B', 'C'] },
        { rankings: ['B', 'A', 'C'] },
        { rankings: ['B', 'C', 'A'] },
        { rankings: ['C', 'A', 'B'] },
      ]

      const result = countIRV(options, ballots)
      // C has fewest (1), eliminated first
      expect(result.rounds[0].eliminated).toBe('C')
    })

    it('should declare tie when all remaining options have equal votes', () => {
      const options = ['A', 'B']
      const ballots: IRVBallot[] = [
        { rankings: ['A', 'B'] },
        { rankings: ['B', 'A'] },
      ]

      const result = countIRV(options, ballots)

      expect(result.winner).toBe(null)
      expect(result.isTie).toBe(true)
      expect(result.tiedOptions.sort()).toEqual(['A', 'B'])
    })

    it('should use lexicographic tie-breaker when first-round totals are equal', () => {
      const options = ['C', 'B', 'A']
      const ballots: IRVBallot[] = [
        { rankings: ['A'] },
        { rankings: ['B'] },
        { rankings: ['C'] },
      ]

      const result = countIRV(options, ballots)
      // All tied at 1 vote each, should declare overall tie
      expect(result.isTie).toBe(true)
      expect(result.tiedOptions.sort()).toEqual(['A', 'B', 'C'])
    })
  })

  describe('Partial rankings', () => {
    it('should handle ballots with partial rankings', () => {
      const options = ['A', 'B', 'C', 'D']
      const ballots: IRVBallot[] = [
        { rankings: ['A'] },
        { rankings: ['A', 'B'] },
        { rankings: ['B', 'C'] },
        { rankings: ['C', 'D'] },
        { rankings: ['D'] },
      ]

      const result = countIRV(options, ballots)

      expect(result.totalBallots).toBe(5)
      // Should process through rounds correctly
      expect(result.rounds.length).toBeGreaterThan(0)
    })

    it('should handle ballots ranking non-existent options', () => {
      const options = ['A', 'B']
      const ballots: IRVBallot[] = [
        { rankings: ['A', 'X', 'B'] }, // X doesn't exist
        { rankings: ['A', 'B'] },
        { rankings: ['B', 'A'] },
      ]

      const result = countIRV(options, ballots)

      // Should ignore X and count normally
      expect(result.rounds[0].tallies).toEqual({ A: 2, B: 1 })
    })
  })

  describe('Complex scenarios', () => {
    it('should correctly handle multi-round elimination', () => {
      const options = ['A', 'B', 'C', 'D']
      const ballots: IRVBallot[] = [
        // A gets 3 first-choice votes
        { rankings: ['A', 'B', 'C', 'D'] },
        { rankings: ['A', 'B', 'C', 'D'] },
        { rankings: ['A', 'C', 'B', 'D'] },
        // B gets 2 first-choice votes
        { rankings: ['B', 'C', 'D', 'A'] },
        { rankings: ['B', 'C', 'D', 'A'] },
        // C gets 2 first-choice votes
        { rankings: ['C', 'B', 'D', 'A'] },
        { rankings: ['C', 'D', 'B', 'A'] },
        // D gets 2 first-choice votes
        { rankings: ['D', 'C', 'B', 'A'] },
        { rankings: ['D', 'C', 'B', 'A'] },
      ]

      const result = countIRV(options, ballots)

      // Round 1: A=3, B=2, C=2, D=2 - B eliminated (weighted tie-break)
      // Round 2: A=3, C=4, D=2 - D eliminated
      // Round 3: A=3, C=6 - C wins
      expect(result.winner).toBe('C')
      expect(result.rounds.length).toBe(3)
    })

    it('should handle the restaurant lunch example', () => {
      const options = ['pizza', 'sushi', 'tacos', 'burgers']
      const ballots: IRVBallot[] = [
        // 3 people prefer pizza
        { rankings: ['pizza', 'tacos', 'sushi'] },
        { rankings: ['pizza', 'burgers'] },
        { rankings: ['pizza', 'sushi', 'tacos'] },
        // 2 people prefer sushi
        { rankings: ['sushi', 'tacos', 'pizza'] },
        { rankings: ['sushi', 'pizza'] },
        // 2 people prefer tacos
        { rankings: ['tacos', 'sushi', 'pizza'] },
        { rankings: ['tacos', 'burgers', 'pizza'] },
        // 1 person prefers burgers
        { rankings: ['burgers', 'pizza'] },
      ]

      const result = countIRV(options, ballots)

      // Round 1: pizza=3, sushi=2, tacos=2, burgers=1
      // burgers eliminated
      expect(result.rounds[0].eliminated).toBe('burgers')

      // The winner should eventually be determined
      expect(result.winner).not.toBe(null)
      expect(result.isTie).toBe(false)
    })
  })

  describe('Reproducibility', () => {
    it('should produce identical results for identical inputs', () => {
      const options = ['A', 'B', 'C']
      const ballots: IRVBallot[] = [
        { rankings: ['A', 'B', 'C'] },
        { rankings: ['B', 'C', 'A'] },
        { rankings: ['C', 'A', 'B'] },
        { rankings: ['A', 'C', 'B'] },
        { rankings: ['B', 'A', 'C'] },
      ]

      const result1 = countIRV(options, ballots)
      const result2 = countIRV(options, ballots)

      expect(result1).toEqual(result2)
    })
  })
})
