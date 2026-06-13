"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"
import { AlertCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  importPlaylist,
  MISSING_API_KEY_MESSAGE,
  QUOTA_EXCEEDED_MESSAGE,
  PLAYLIST_NOT_FOUND_MESSAGE,
  INVALID_PLAYLIST_URL_MESSAGE,
} from "@/lib/youtube/playlist"

interface YouTubePlaylistImportProps {
  courseId: string
}

/**
 * Playlist import UI. Client component.
 *
 * Error handling maps server-side sentinel strings to localized i18n keys:
 * - MISSING_API_KEY_MESSAGE  -> playlistImport.missingKey (prominent alert)
 * - INVALID_PLAYLIST_URL_MESSAGE -> playlistImport.validation.urlInvalid (field error)
 * - QUOTA_EXCEEDED_MESSAGE   -> playlistImport.errorQuota (root error)
 * - PLAYLIST_NOT_FOUND_MESSAGE -> playlistImport.errorNotFound (root error)
 * - anything else            -> playlistImport.error (generic root error)
 */
export function YouTubePlaylistImport({ courseId }: YouTubePlaylistImportProps) {
  const t = useTranslations("Admin")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [url, setUrl] = useState("")
  const [urlError, setUrlError] = useState<string | null>(null)
  const [missingKey, setMissingKey] = useState(false)
  const [rootError, setRootError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUrlError(null)
    setMissingKey(false)
    setRootError(null)

    if (!url.trim()) {
      setUrlError(t("playlistImport.validation.urlRequired"))
      return
    }

    startTransition(async () => {
      const result = await importPlaylist(courseId, url.trim())
      if (result.ok) {
        const count = result.data.imported
        if (count === 0) {
          toast.info(t("playlistImport.noItems"))
        } else {
          toast.success(t("playlistImport.success", { count }))
          setUrl("")
          router.refresh()
        }
      } else {
        // Map server-side sentinel strings to localized UI messages.
        if (result.message === MISSING_API_KEY_MESSAGE) {
          setMissingKey(true)
        } else if (
          result.message === INVALID_PLAYLIST_URL_MESSAGE ||
          result.fieldErrors?.url
        ) {
          setUrlError(t("playlistImport.validation.urlInvalid"))
        } else if (result.message === QUOTA_EXCEEDED_MESSAGE) {
          setRootError(t("playlistImport.errorQuota"))
        } else if (result.message === PLAYLIST_NOT_FOUND_MESSAGE) {
          setRootError(t("playlistImport.errorNotFound"))
        } else {
          setRootError(t("playlistImport.error"))
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="playlist-url">
          {t("playlistImport.urlLabel")}
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Input
            id="playlist-url"
            name="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("playlistImport.urlPlaceholder")}
            className="min-w-0 flex-1"
            aria-invalid={!!urlError}
            aria-describedby={urlError ? "playlist-url-error" : undefined}
          />
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending
              ? t("playlistImport.submitting")
              : t("playlistImport.submit")}
          </Button>
        </div>
        {urlError && (
          <FieldError id="playlist-url-error">{urlError}</FieldError>
        )}
      </Field>

      {missingKey && (
        <Alert role="alert">
          <AlertCircleIcon className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="font-medium">
            {t("playlistImport.missingKey")}
          </AlertDescription>
        </Alert>
      )}

      {rootError && !missingKey && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {rootError}
        </div>
      )}
    </form>
  )
}
