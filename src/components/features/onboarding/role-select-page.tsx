import { Link } from '@tanstack/react-router'
import { Building2, Ticket } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import logoSvg from '@/assets/procureFlow.svg'

export function RoleSelectPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary p-2.5">
            <img src={logoSvg} alt="ProcureFlow" className="h-full w-full invert" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome to ProcureFlow</h1>
            <p className="text-muted-foreground text-sm mt-1">How would you like to get started?</p>
          </div>
        </div>

        {/* Options */}
        <div className="grid gap-3">
          <Link to="/onboarding/create-company">
            <Card className="cursor-pointer border-2 transition-colors hover:border-primary hover:bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Create a company</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Set up your company and branches. You'll be the owner with full access.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link to="/onboarding/join">
            <Card className="cursor-pointer border-2 transition-colors hover:border-primary hover:bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Ticket className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">I have an invite token</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Join an existing company as an admin, chef, or runner using your invite token.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
