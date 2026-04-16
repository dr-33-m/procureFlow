import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  subValueVariant?: 'default' | 'positive' | 'warning' | 'danger'
  icon?: React.ReactNode
  variant?: 'default' | 'warning' | 'danger'
  accentBorder?: boolean
  className?: string
  children?: React.ReactNode
}

export function StatCard({
  label,
  value,
  subValue,
  subValueVariant = 'default',
  icon,
  variant = 'default',
  accentBorder,
  className,
  children,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm',
        accentBorder && variant === 'default' && 'border-l-4 border-l-primary',
        accentBorder && variant === 'warning' && 'border-l-4 border-l-amber-500',
        accentBorder && variant === 'danger' && 'border-l-4 border-l-red-500',
        className,
      )}
    >
      <div className="mb-1 flex items-start justify-between">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>

      <p
        className={cn(
          'text-3xl font-bold',
          variant === 'warning' && 'text-amber-600',
          variant === 'danger' && 'text-red-600',
        )}
      >
        {value}
      </p>

      {subValue && (
        <p
          className={cn(
            'mt-1 text-xs',
            subValueVariant === 'default' && 'text-muted-foreground',
            subValueVariant === 'positive' && 'text-green-600',
            subValueVariant === 'warning' && 'text-amber-600',
            subValueVariant === 'danger' && 'text-red-600',
          )}
        >
          {subValue}
        </p>
      )}

      {children}
    </div>
  )
}
