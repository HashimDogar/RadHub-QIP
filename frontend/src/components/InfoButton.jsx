import React, { useState, useRef, useEffect } from 'react'

/**
 * Small information button that toggles a tooltip with explanatory text.
 * Closes when clicking anywhere outside of the tooltip.
 */
export default function InfoButton({ text }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          marginLeft: 4,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Information"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="8" cy="8" r="7" />
          <line x1="8" y1="6" x2="8" y2="10" />
          <circle cx="8" cy="4" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: 4,
            padding: '4px 8px',
            marginTop: 4,
            width: 200,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {text}
        </div>
      )}
    </span>
  )
}
