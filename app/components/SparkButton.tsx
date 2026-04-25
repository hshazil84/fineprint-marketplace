'use client'
import { useState } from 'react'

interface SparkButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  fullWidth?: boolean
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
}

export function SparkButton({
  children,
  onClick,
  disabled = false,
  fullWidth = false,
  size = 'md',
  type = 'button',
}: SparkButtonProps) {
  const [active, setActive] = useState(false)

  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15
  const padding  = size === 'sm' ? '9px 20px' : size === 'lg' ? '14px 32px' : '11px 28px'

  return (
    <>
      <style>{`
        .fp-spark-btn {
          --cut: 1px;
          --spark: 1.8s;
          --transition: 0.25s;
          position: relative;
          display: ${fullWidth ? 'grid' : 'inline-grid'};
          width: ${fullWidth ? '100%' : 'auto'};
          place-items: center;
          border: 0;
          cursor: pointer;
          border-radius: 100px;
          overflow: hidden;
          background: #1a1a1a;
          box-shadow:
            0 0.5px 0 0 rgba(255,255,255,0.15) inset,
            0 -0.5px 0 0 rgba(0,0,0,0.5) inset;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          padding: 0;
          font-family: inherit;
        }
        .fp-spark-btn:disabled {
          opacity: 0.5;
          cursor: default;
          pointer-events: none;
        }
        .fp-spark-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        /* ── Spark sweep ── */
        .fp-spark {
          position: absolute;
          inset: 0;
          border-radius: 100px;
          overflow: hidden;
          mask: linear-gradient(white, transparent 50%);
          animation: fp-flip calc(var(--spark) * 2) infinite steps(2, end);
          pointer-events: none;
        }
        .fp-spark::before {
          content: '';
          position: absolute;
          width: 200%;
          aspect-ratio: 1;
          inset: 0 auto auto 50%;
          translate: -50% -15%;
          transform: rotate(-90deg);
          background: conic-gradient(
            from 0deg,
            transparent 0 340deg,
            white 360deg
          );
          animation: fp-rotate var(--spark) linear infinite both;
        }
        @keyframes fp-flip {
          to { rotate: 360deg; }
        }
        @keyframes fp-rotate {
          to { transform: rotate(90deg); }
        }

        /* ── Active spark (hover/focus) ── */
        .fp-spark-btn:is(:hover, :focus-visible):not(:disabled) .fp-spark {
          mask: none;
          overflow: visible;
        }
        .fp-spark-btn:is(:hover, :focus-visible):not(:disabled) .fp-spark::before {
          opacity: 1;
        }
        .fp-spark-btn:is(:hover, :focus-visible):not(:disabled) {
          transform: scale(1.02);
          box-shadow:
            0 0.5px 0 0 rgba(255,255,255,0.25) inset,
            0 -0.5px 0 0 rgba(0,0,0,0.5) inset,
            0 0 20px rgba(255,255,255,0.08);
        }

        /* ── Backdrop (inner fill) ── */
        .fp-spark-backdrop {
          position: absolute;
          inset: var(--cut);
          background:
            radial-gradient(
              40% 50% at center 100%,
              rgba(255,255,255,0.05),
              transparent
            ),
            radial-gradient(
              80% 100% at center 120%,
              rgba(255,255,255,0.08),
              transparent
            ),
            #1a1a1a;
          border-radius: 100px;
          transition: background var(--transition);
          pointer-events: none;
        }

        /* ── Text ── */
        .fp-spark-text {
          position: relative;
          z-index: 1;
          color: #fff;
          letter-spacing: 0.01ch;
          transition: color var(--transition);
          white-space: nowrap;
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .fp-spark, .fp-spark::before { animation: none; }
        }
      `}</style>

      <button
        type={type}
        className="fp-spark-btn"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        style={{ padding }}
      >
        <div className="fp-spark">
          <div className="fp-spark-backdrop" />
        </div>
        <div className="fp-spark-backdrop" />
        <span className="fp-spark-text" style={{ fontSize, fontWeight: 500 }}>
          {children}
        </span>
      </button>
    </>
  )
}
