import { Input } from '@/components/ui/input'

interface QtyInputProps {
  value: number
  onChange: (v: number) => void
  max?: number
}

export function QtyInput({ value, onChange, max }: QtyInputProps) {
  return (
    <Input
      type="number"
      min={0}
      max={max}
      step={0.1}
      value={value || ''}
      placeholder="0"
      onChange={(e) => {
        const v = parseFloat(e.target.value) || 0
        onChange(max != null ? Math.min(v, max) : v)
      }}
      className="h-8 w-24"
    />
  )
}
