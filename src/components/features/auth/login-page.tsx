import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { signIn } from '@/server/auth/functions'
import { Button } from '@/components/ui/button'
import logoSvg from '@/assets/procureFlow.svg'

export function LoginPage() {
  const doSignIn = useServerFn(signIn)
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    await doSignIn()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary p-3">
            <img src={logoSvg} alt="ProcureFlow" className="h-full w-full invert" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ProcureFlow</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Procurement and inventory management for restaurant teams
            </p>
          </div>
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="w-full"
          onClick={handleSignIn}
          disabled={loading}
        >
          {loading ? 'Redirecting...' : 'Sign in'}
        </Button>

        <p className="text-xs text-muted-foreground">
          By signing in you agree to your organisation's usage terms.
        </p>
      </div>
    </div>
  )
}
