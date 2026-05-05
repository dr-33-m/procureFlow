import { Input } from '@/components/ui/input'

interface QtyInputProps {
  value: number
  onChange: (v: number) => void
}

export function QtyInput({ value, onChange }: QtyInputProps) {
  return (
    <Input
      type="number"
      min={0}
      step={0.1}
      value={value || ''}
      placeholder="0"
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="h-8 w-24"
    />
  )
}
