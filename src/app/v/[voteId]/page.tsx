'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Vote {
  id: string
  title: string
  options: string[]
  ballotCount: number
  closed_at: string | null
  auto_close_at: string | null
  voter_names_required: boolean
}

interface SortableItemProps {
  id: string
  index: number
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onRemove: (option: string) => void
  isFirst: boolean
  isLast: boolean
}

function SortableItem({ id, index, onMoveUp, onMoveDown, onRemove, isFirst, isLast }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`option-item ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <span className="option-rank">{index + 1}</span>
      <span className="option-name">{id}</span>
      <div className="option-buttons" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoveUp(index); }}
          disabled={isFirst}
          title="Move up"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoveDown(index); }}
          disabled={isLast}
          title="Move down"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(id); }}
          className="btn-secondary"
          title="Remove"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      </div>
    </li>
  )
}

function DragOverlayItem({ option, index }: { option: string; index: number }) {
  return (
    <li className="option-item dragging-overlay">
      <span className="option-rank">{index + 1}</span>
      <span className="option-name">{option}</span>
    </li>
  )
}

export default function VotePage() {
  const params = useParams()
  const router = useRouter()
  const voteId = params.voteId as string

  const [vote, setVote] = useState<Vote | null>(null)
  const [rankings, setRankings] = useState<string[]>([])
  const [unranked, setUnranked] = useState<string[]>([])
  const [writeSecret, setWriteSecret] = useState('')
  const [voterName, setVoterName] = useState('')
  const [customOption, setCustomOption] = useState('')
  const [showCustomOption, setShowCustomOption] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Configure sensors for touch and pointer support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Redirect to lowercase if needed
  useEffect(() => {
    const lower = voteId.toLowerCase()
    if (voteId !== lower) {
      router.replace(`/v/${lower}`)
    }
  }, [voteId, router])

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Fetch vote data
  useEffect(() => {
    if (voteId !== voteId.toLowerCase()) return

    const fetchVote = async () => {
      try {
        const res = await fetch(`/api/votes/${voteId}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Vote not found')
          } else {
            setError('Failed to load vote')
          }
          setLoading(false)
          return
        }
        const data = await res.json()
        setVote(data)
        // Start with all options ranked in random order
        setRankings(shuffleArray(data.options))
        setUnranked([])
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }
    fetchVote()
  }, [voteId])

  const moveUp = (index: number) => {
    if (index === 0) return
    const newRankings = [...rankings]
    ;[newRankings[index - 1], newRankings[index]] = [newRankings[index], newRankings[index - 1]]
    setRankings(newRankings)
  }

  const moveDown = (index: number) => {
    if (index === rankings.length - 1) return
    const newRankings = [...rankings]
    ;[newRankings[index], newRankings[index + 1]] = [newRankings[index + 1], newRankings[index]]
    setRankings(newRankings)
  }

  const addToRankings = (option: string) => {
    setRankings([...rankings, option])
    setUnranked(unranked.filter((o) => o !== option))
  }

  const removeFromRankings = (option: string) => {
    setRankings(rankings.filter((o) => o !== option))
    setUnranked([...unranked, option])
  }

  const addCustomOption = () => {
    const trimmed = customOption.trim()
    if (!trimmed) {
      setError('Please enter a custom option')
      return
    }

    // Check if option already exists (case-insensitive)
    const allOptions = [...rankings, ...unranked]
    if (allOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      setError('This option already exists')
      return
    }

    setRankings([...rankings, trimmed])
    setCustomOption('')
    setShowCustomOption(false)
    setError('')
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    if (active.id !== over.id) {
      setRankings((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rankings.length === 0) {
      setError('Please rank at least one option')
      return
    }

    if (vote!.voter_names_required && !voterName.trim()) {
      setError('Name is required')
      return
    }

    if (!writeSecret.trim()) {
      setError('Write secret is required')
      return
    }

    setSubmitting(true)

    // Detect custom options (options not in original vote.options)
    const originalOptions = new Set(vote!.options)
    const customOptions = rankings.filter((option) => !originalOptions.has(option))

    try {
      const res = await fetch(`/api/votes/${voteId}/ballots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankings,
          voterName: voterName.trim(),
          writeSecret: writeSecret.trim(),
          customOptions: customOptions.length > 0 ? customOptions : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit ballot')
        setSubmitting(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-skeleton">
          <div className="skeleton-title"></div>
          <div className="skeleton-text"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    )
  }

  if (error && !vote) {
    return (
      <div className="fade-in">
        <h1>Error</h1>
        <p className="error">{error}</p>
        <button onClick={() => router.push('/')}>Create a New Vote</button>
      </div>
    )
  }

  if (!vote) {
    return null
  }

  if (success) {
    return (
      <div className="fade-in">
        <h1>Ballot Submitted!</h1>
        <div className="card">
          <p className="success">Your vote has been recorded.</p>
          <h2 style={{ marginTop: '1rem' }}>Your Rankings:</h2>
          <ol style={{ marginLeft: '1.5rem' }}>
            {rankings.map((opt) => (
              <li key={opt}>{opt}</li>
            ))}
          </ol>
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => router.push(`/v/${voteId}/results`)}>
            View Results
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setSuccess(false)
              setRankings(shuffleArray(vote.options))
              setUnranked([])
              setWriteSecret('')
              setVoterName('')
            }}
          >
            Submit Another Ballot
          </button>
        </div>
      </div>
    )
  }

  const activeIndex = activeId ? rankings.indexOf(activeId) : -1

  return (
    <div className="fade-in">
      <h1>{vote.title}</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        {vote.ballotCount} ballot{vote.ballotCount !== 1 ? 's' : ''} submitted
      </p>

      {vote.closed_at && (
        <div className="card" style={{ backgroundColor: 'rgba(255, 0, 0, 0.05)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--error)', margin: 0 }}>
            <strong>Voting is closed.</strong> This poll is no longer accepting new ballots.
          </p>
        </div>
      )}

      {!vote.closed_at && vote.auto_close_at && (
        <div className="card" style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            <strong>Voting closes:</strong> {new Date(vote.auto_close_at).toLocaleString()}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2>Your Rankings</h2>
          <p className="muted" style={{ marginBottom: '0.5rem' }}>
            Drag to reorder or click × to remove options you don&apos;t want. Your top choice should be #1.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="card" style={{ minHeight: '100px' }}>
              {rankings.length === 0 ? (
                <p className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
                  All options removed. Add some back to submit your ballot.
                </p>
              ) : (
                <SortableContext
                  items={rankings}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="option-list">
                    {rankings.map((option, index) => (
                      <SortableItem
                        key={option}
                        id={option}
                        index={index}
                        onMoveUp={moveUp}
                        onMoveDown={moveDown}
                        onRemove={removeFromRankings}
                        isFirst={index === 0}
                        isLast={index === rankings.length - 1}
                      />
                    ))}
                  </ul>
                </SortableContext>
              )}
            </div>
            <DragOverlay>
              {activeId ? (
                <DragOverlayItem option={activeId} index={activeIndex} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {unranked.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2>Removed Options</h2>
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              Click to add back to your rankings.
            </p>

            <div className="card">
              <ul className="option-list">
                {unranked.map((option) => (
                  <li
                    key={option}
                    className="option-item clickable"
                    onClick={() => addToRankings(option)}
                  >
                    <span className="option-name">{option}</span>
                    <button type="button" title="Add to rankings">
                      +
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Custom option */}
        <div style={{ marginBottom: '1.5rem' }}>
          {!showCustomOption ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCustomOption(true)}
            >
              + Add Custom Option
            </button>
          ) : (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Add Custom Option</h3>
              <p className="muted" style={{ marginBottom: '0.75rem' }}>
                Suggest a new option. It will be added to your rankings and become available for others.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={customOption}
                  onChange={(e) => setCustomOption(e.target.value)}
                  placeholder="Enter your custom option"
                  style={{ flex: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomOption()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomOption}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCustomOption(false)
                    setCustomOption('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="voterName">
            Your Name{!vote?.voter_names_required && ' (optional)'}
          </label>
          <input
            type="text"
            id="voterName"
            value={voterName}
            onChange={(e) => setVoterName(e.target.value)}
            placeholder={vote?.voter_names_required ? "Enter your name" : "Enter your name (optional)"}
            required={vote?.voter_names_required}
          />
          <p className="muted">
            {vote?.voter_names_required
              ? "Your name will be visible to other voters and the vote creator."
              : "If provided, your name will be visible to other voters and the vote creator."}
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="writeSecret">Write Secret</label>
          <input
            type="password"
            id="writeSecret"
            value={writeSecret}
            onChange={(e) => setWriteSecret(e.target.value)}
            placeholder="Enter the secret to submit your ballot"
            required
          />
          <p className="muted">The vote creator should have shared this with you.</p>
        </div>

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={submitting || rankings.length === 0 || vote.closed_at !== null}>
            {submitting ? 'Submitting...' : vote.closed_at ? 'Voting Closed' : 'Submit Ballot'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push(`/v/${voteId}/results`)}
          >
            View Results
          </button>
        </div>
      </form>
    </div>
  )
}
