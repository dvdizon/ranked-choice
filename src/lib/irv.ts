/**
 * Instant-Runoff Voting (IRV) Implementation
 *
 * Rules (from PLAN.md):
 * - Majority threshold: >50% of active (non-exhausted) ballots
 * - Exhausted ballots: If all ranked options are eliminated, ballot no longer counts
 * - Elimination: Eliminate option with the fewest votes in the round
 * - Tie-breaking: Deterministic (lowest first-round total, then lexicographic option ID)
 * - If still tied, declare a tie and stop
 */

export interface IRVBallot {
  rankings: string[] // Ordered list of option IDs from most to least preferred
}

export interface RoundResult {
  round: number
  tallies: Record<string, number>
  activeBallotCount: number
  eliminated: string | null
  winner: string | null
  isTie: boolean
  tiedOptions?: string[]
}

export interface IRVResult {
  winner: string | null
  isTie: boolean
  tiedOptions: string[]
  totalBallots: number
  rounds: RoundResult[]
}

/**
 * Count IRV election results
 * @param options - Array of all option IDs
 * @param ballots - Array of ballots with rankings
 * @returns IRV result with winner, rounds, and detailed tallies
 */
export function countIRV(options: string[], ballots: IRVBallot[]): IRVResult {
  if (options.length === 0) {
    return {
      winner: null,
      isTie: false,
      tiedOptions: [],
      totalBallots: ballots.length,
      rounds: [],
    }
  }

  if (ballots.length === 0) {
    return {
      winner: null,
      isTie: true,
      tiedOptions: [...options],
      totalBallots: 0,
      rounds: [],
    }
  }

  const rounds: RoundResult[] = []
  let remainingOptions = new Set(options)
  let roundNumber = 1
  let firstRoundTallies: Record<string, number> | null = null

  while (remainingOptions.size > 0) {
    // Count first-choice votes among remaining options
    const tallies: Record<string, number> = {}
    for (const opt of remainingOptions) {
      tallies[opt] = 0
    }

    let activeBallotCount = 0

    for (const ballot of ballots) {
      // Find first choice that's still in the running
      const choice = ballot.rankings.find((r) => remainingOptions.has(r))
      if (choice) {
        tallies[choice]++
        activeBallotCount++
      }
      // If no valid choice found, ballot is exhausted
    }

    // Store first round tallies for tie-breaking
    if (roundNumber === 1) {
      firstRoundTallies = { ...tallies }
    }

    // Check for majority winner (>50% of active ballots)
    const majorityThreshold = activeBallotCount / 2

    for (const [option, votes] of Object.entries(tallies)) {
      if (votes > majorityThreshold) {
        rounds.push({
          round: roundNumber,
          tallies,
          activeBallotCount,
          eliminated: null,
          winner: option,
          isTie: false,
        })
        return {
          winner: option,
          isTie: false,
          tiedOptions: [],
          totalBallots: ballots.length,
          rounds,
        }
      }
    }

    // No majority - find option(s) to eliminate (lowest votes)
    const minVotes = Math.min(...Object.values(tallies))
    const lowestOptions = Object.entries(tallies)
      .filter(([_, votes]) => votes === minVotes)
      .map(([opt]) => opt)

    // If all remaining options are tied with same votes
    if (lowestOptions.length === remainingOptions.size) {
      rounds.push({
        round: roundNumber,
        tallies,
        activeBallotCount,
        eliminated: null,
        winner: null,
        isTie: true,
        tiedOptions: lowestOptions,
      })
      return {
        winner: null,
        isTie: true,
        tiedOptions: lowestOptions,
        totalBallots: ballots.length,
        rounds,
      }
    }

    // Tie-breaking for elimination
    let toEliminate: string
    if (lowestOptions.length === 1) {
      toEliminate = lowestOptions[0]
    } else {
      // Tie-break: lowest first-round total
      toEliminate = breakTie(lowestOptions, firstRoundTallies!)
    }

    rounds.push({
      round: roundNumber,
      tallies,
      activeBallotCount,
      eliminated: toEliminate,
      winner: null,
      isTie: false,
    })

    // Eliminate the option
    remainingOptions.delete(toEliminate)
    roundNumber++

    // If only one option remains, it wins
    if (remainingOptions.size === 1) {
      const winner = [...remainingOptions][0]

      // Recount for final round
      const finalTallies: Record<string, number> = { [winner]: 0 }
      let finalActiveBallotCount = 0

      for (const ballot of ballots) {
        const choice = ballot.rankings.find((r) => remainingOptions.has(r))
        if (choice) {
          finalTallies[choice]++
          finalActiveBallotCount++
        }
      }

      rounds.push({
        round: roundNumber,
        tallies: finalTallies,
        activeBallotCount: finalActiveBallotCount,
        eliminated: null,
        winner,
        isTie: false,
      })

      return {
        winner,
        isTie: false,
        tiedOptions: [],
        totalBallots: ballots.length,
        rounds,
      }
    }
  }

  // Should not reach here, but handle edge case
  return {
    winner: null,
    isTie: true,
    tiedOptions: [],
    totalBallots: ballots.length,
    rounds,
  }
}

/**
 * Break a tie using deterministic rules:
 * 1. Lowest first-round total
 * 2. Lexicographic option ID (alphabetically first)
 */
function breakTie(
  tiedOptions: string[],
  firstRoundTallies: Record<string, number>
): string {
  // Sort by first-round tallies (ascending), then lexicographically
  const sorted = [...tiedOptions].sort((a, b) => {
    const aVotes = firstRoundTallies[a] ?? 0
    const bVotes = firstRoundTallies[b] ?? 0
    if (aVotes !== bVotes) {
      return aVotes - bVotes // Lower first-round total eliminated first
    }
    return a.localeCompare(b) // Lexicographic (alphabetically first eliminated)
  })
  return sorted[0]
}
