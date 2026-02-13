/**
 * Instant-Runoff Voting (IRV) Implementation
 *
 * Rules (from PLAN.md):
 * - Majority threshold: >50% of active (non-exhausted) ballots
 * - Exhausted ballots: If all ranked options are eliminated, ballot no longer counts
 * - Elimination: Eliminate option with the fewest votes in the round
 * - Tie-breaking: Deterministic (weighted ranking support, then lowest first-round total, then lexicographic option ID)
 * - No explicit runoff round: tied elimination rounds always remove one option deterministically
 */

export interface IRVBallot {
  rankings: string[] // Ordered list of option IDs from most to least preferred
}

export interface RoundResult {
  round: number
  tallies: Record<string, number>
  activeBallotCount: number
  eliminated: string | null
  eliminationCause: EliminationCause | null
  winner: string | null
  isTie: boolean
  tiedOptions?: string[]
}

export type EliminationCauseType = 'fewest_votes' | 'weighted_support' | 'first_round_total' | 'lexicographic'

export interface EliminationCause {
  type: EliminationCauseType
  tiedOptions: string[]
  weightedScores: Record<string, number>
  firstRoundTallies: Record<string, number>
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
          eliminationCause: null,
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

    // Tie-breaking for elimination
    let toEliminate: string
    let eliminationCause: EliminationCause
    if (lowestOptions.length === 1) {
      toEliminate = lowestOptions[0]
      eliminationCause = {
        type: 'fewest_votes',
        tiedOptions: [],
        weightedScores: {},
        firstRoundTallies: {},
      }
    } else {
      const tieBreakResult = breakTie(lowestOptions, firstRoundTallies!, ballots)
      toEliminate = tieBreakResult.eliminated
      eliminationCause = tieBreakResult.cause
    }

    rounds.push({
      round: roundNumber,
      tallies,
      activeBallotCount,
      eliminated: toEliminate,
      eliminationCause,
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
        eliminationCause: null,
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
    isTie: false,
    tiedOptions: [],
    totalBallots: ballots.length,
    rounds,
  }
}

/**
 * Break a tie using deterministic rules:
 * 1. Lowest weighted ranking support (across all ballot rankings)
 * 2. Lowest first-round total
 * 3. Lexicographic option ID (alphabetically first)
 */
function breakTie(
  tiedOptions: string[],
  firstRoundTallies: Record<string, number>,
  ballots: IRVBallot[]
): { eliminated: string; cause: EliminationCause } {
  const weightedScores: Record<string, number> = {}

  for (const option of tiedOptions) {
    let score = 0
    for (const ballot of ballots) {
      const rankIndex = ballot.rankings.indexOf(option)
      if (rankIndex === -1) continue

      // Higher-ranked options receive more points: rank #1 gets N points, #2 gets N-1, etc.
      score += Math.max(ballot.rankings.length - rankIndex, 0)
    }
    weightedScores[option] = score
  }

  const minWeightedScore = Math.min(...tiedOptions.map((option) => weightedScores[option] ?? 0))
  const weightedLowestOptions = tiedOptions.filter((option) => (weightedScores[option] ?? 0) === minWeightedScore)

  if (weightedLowestOptions.length === 1) {
    return {
      eliminated: weightedLowestOptions[0],
      cause: {
        type: 'weighted_support',
        tiedOptions: [...tiedOptions],
        weightedScores,
        firstRoundTallies: Object.fromEntries(
          tiedOptions.map((option) => [option, firstRoundTallies[option] ?? 0])
        ),
      },
    }
  }

  const minFirstRoundTotal = Math.min(
    ...weightedLowestOptions.map((option) => firstRoundTallies[option] ?? 0)
  )
  const firstRoundLowestOptions = weightedLowestOptions.filter(
    (option) => (firstRoundTallies[option] ?? 0) === minFirstRoundTotal
  )

  if (firstRoundLowestOptions.length === 1) {
    return {
      eliminated: firstRoundLowestOptions[0],
      cause: {
        type: 'first_round_total',
        tiedOptions: [...tiedOptions],
        weightedScores,
        firstRoundTallies: Object.fromEntries(
          tiedOptions.map((option) => [option, firstRoundTallies[option] ?? 0])
        ),
      },
    }
  }

  return {
    eliminated: [...firstRoundLowestOptions].sort((a, b) => a.localeCompare(b))[0],
    cause: {
      type: 'lexicographic',
      tiedOptions: [...tiedOptions],
      weightedScores,
      firstRoundTallies: Object.fromEntries(
        tiedOptions.map((option) => [option, firstRoundTallies[option] ?? 0])
      ),
    },
  }
}
