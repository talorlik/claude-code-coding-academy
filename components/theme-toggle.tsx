"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

/**
 * Light/dark toggle button. Mirrors the `d` hotkey already wired in
 * ThemeProvider, exposing the same switch as a visible control. Renders a
 * placeholder until mounted so the server and client markup agree (next-themes
 * cannot know the resolved theme during SSR).
 */
export function ThemeToggle() {
  const t = useTranslations("ThemeToggle")
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("label")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  )
}
