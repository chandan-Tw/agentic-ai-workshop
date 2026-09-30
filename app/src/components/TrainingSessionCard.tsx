import { useState } from 'react'
import type { TrainingSession } from '../types'
import './TrainingSessionCard.css'

interface Props {
  session: TrainingSession
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function deliveryModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    'in-person': 'In Person',
    online: 'Online',
    hybrid: 'Hybrid',
  }
  return labels[mode] ?? mode
}

function TrainingSessionCard({ session }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] useState(false)
  const [message, setMessage] = useState('')
  const [registeredCount, setRegisteredCount] = useState(session.registered)

  const spotsLeft = session.capacity - registeredCount
  const isFull = spotsLeft <= 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(
        `/api/training-sessions/${session.id}/registrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email }),
        }
      )

      if (response.status === 201) {
        setMessage('Registration successful!')
        setRegisteredCount((prev) => prev + 1)
        setShowForm(false)
        setName('')
        setEmail('')
      } else if (response.status === 202) {
        const data = await response.json()
        setMessage(`You are waitlisted at position ${data.position}`)
        setShowForm(false)
        setName('')
        setEmail('')
      } else {
        const data = await response.json()
        setMessage(data.error || 'Registration failed')
      }
    } catch {
      setMessage('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <article className={`session-card ${isFull ? 'session-card--full' : ''}`}>
      <div className="session-card__header">
        <span className={`session-badge session-badge--${session.deliveryMode}`}>
          {deliveryModeLabel(session.deliveryMode)}
        </span>
        {isFull && <span className="session-badge session-badge--full">Full</span>}
      </div>

      <h3 className="session-card__title">{session.title}</h3>
      <p className="session-card__description">{session.description}</p>

      <div className="session-card__meta">
        <div className="meta-item">
          <span className="meta-label">Date</span>
          <span className="meta-value">{formatDate(session.date)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Time</span>
          <span className="meta-value">{formatTime(session.date)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Location</span>
          <span className="meta-value">{session.location}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Capacity</span>
          <span className="meta-value">
            {registeredCount} / {session.capacity} registered
            {!isFull && (
              <span className="spots-left">
                {' '}
                ({spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left)
              </span>
            )}
          </span>
        </div>
      </div>

      {!showForm && (
        <button
          className="register-button"
          onClick={() => setShowForm(true)}
        >
          {isFull ? 'Join Waitlist' : 'Register'}
        </button>
      )}

      {showForm && (
        <form className="registration-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
          <button type="button" onClick={() => setShowForm(false)}>
            Cancel
          </button>
        </form>
      )}

      {message && <p className="registration-message">{message}</p>}
    </article>
  )
}

export default TrainingSessionCard
