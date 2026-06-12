import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between p-6">
        <span className="font-mono text-sm font-medium">
          claude-code-coding-academy
        </span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Coding Academy</CardTitle>
            <CardDescription>
              A starter built on Next.js and Supabase. Sign in to start
              building, or jump straight in.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-loose text-muted-foreground">
            <p>
              Authentication, database, and edge functions are wired through
              Supabase. Press <kbd>d</kbd> anywhere to toggle dark mode.
            </p>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button render={<Link href="/login" />} nativeButton={false}>
              Get Started
            </Button>
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="outline"
            >
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
