import React, { useEffect, useState } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
  className?: string
}

export const CountUp: React.FC<CountUpProps> = ({
  end,
  duration = 800,
  suffix = '',
  prefix = '',
  className = '',
}) => {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const startVal = 0
    const targetVal = end || 0

    if (targetVal === 0) {
      setCurrent(0)
      return
    }

    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out quad
      const easeProgress = 1 - (1 - progress) * (1 - progress)
      const value = Math.round(startVal + (targetVal - startVal) * easeProgress)
      setCurrent(value)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      }
    }

    animationFrameId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [end, duration])

  return (
    <span className={className}>
      {prefix}
      {current.toLocaleString('pt-BR')}
      {suffix}
    </span>
  )
}
