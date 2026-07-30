import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange: (stars: number) => void
  disabled?: boolean
  size?: 'md' | 'lg'
}

export function StarRating({ value, onChange, disabled, size = 'lg' }: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const starSize = size === 'lg' ? '2.4rem' : '1.6rem'

  return (
    <div
      className="star-rating"
      role="radiogroup"
      aria-label="Rate 1 to 5 stars"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value)
        return (
          <button
            key={star}
            type="button"
            className={`star-btn ${filled ? 'filled' : ''}`}
            style={{ fontSize: starSize }}
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHover(star)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-checked={value === star}
            role="radio"
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
