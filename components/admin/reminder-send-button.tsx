"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { sendReminder } from "@/lib/reminders/actions"

interface ReminderSendButtonProps {
  reminderId: string
  /** When true the button is shown disabled (already sent). */
  alreadySent?: boolean
}

/**
 * Client island for the "Send" action on a queued reminder row.
 *
 * Shows an AlertDialog confirm before calling `sendReminder` server action.
 * Reflects pending state via `aria-busy` and a localized label swap.
 * On success/failure, shows a sonner toast. The parent page revalidates
 * automatically via `revalidatePath` inside `sendReminder`.
 */
export function ReminderSendButton({
  reminderId,
  alreadySent = false,
}: ReminderSendButtonProps) {
  const t = useTranslations("Reminders")
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      const result = await sendReminder(reminderId)
      if (result.ok) {
        toast.success(t("sendSuccess"))
      } else {
        toast.error(result.message)
      }
    })
  }

  if (alreadySent) {
    return null
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={isPending}
        aria-busy={isPending}
        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? t("sending") : t("sendReminder")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("sendConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("sendConfirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("sendConfirmCancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSend}>
            {t("sendConfirmConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
