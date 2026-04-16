import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max,
  className,
}: QuantityStepperProps) {
  const decrement = () => {
    const next = value - 1
    if (min === undefined || next >= min) onChange(next)
  }

  const increment = () => {
    const next = value + 1
    if (max === undefined || next <= max) onChange(next)
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={decrement}
        disabled={min !== undefined && value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent disabled:opacity-40"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v)) onChange(v)
        }}
        className="h-8 w-14 rounded-md border border-input bg-background px-2 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={increment}
        disabled={max !== undefined && value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}
