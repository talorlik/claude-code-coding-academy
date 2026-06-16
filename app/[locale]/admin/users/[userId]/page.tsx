import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowLeftIcon } from "lucide-react"

import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { requireAdmin } from "@/lib/auth/guards"
import { getUser } from "@/lib/admin/users"
import {
  deleteUserAction,
  setUserDisabledAction,
  setUserRoleAction,
} from "@/lib/admin/users-actions"
import { resolveAdminUsersMessage } from "@/lib/admin/resolve-users-message"
import { ROLE_VALUES } from "@/lib/validation/admin-users"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * Admin per-user detail page (Batch 26). Shows one user's details and the
 * Tier-2 no-JS action forms: change role, disable/enable, delete. Destructive
 * actions (disable, delete) are never one-click: the first submit bounces back
 * with a `?confirm=` flag and this page then renders an explicit confirm
 * affordance whose submit carries `confirm=yes`.
 *
 * Self-protection and the last-instructor guard live in the data layer, so the
 * actions are safe regardless of UI state; this page additionally hides the
 * self-destructive controls and shows a "your own account" note for clarity.
 *
 * @param params - Route params (a Promise); carries `locale` and `userId`.
 * @param searchParams - The page query (a Promise); `notice`, `error`, `confirm`.
 */
export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; userId: string }>
  searchParams: Promise<{ notice?: string; error?: string; confirm?: string }>
}) {
  const { locale, userId } = await params
  setRequestLocale(locale as Locale)

  const callerId = await requireAdmin()
  const sp = await searchParams

  const [t, tMessages, result] = await Promise.all([
    getTranslations("AdminUsers"),
    getTranslations("AdminUsers.messages"),
    getUser(userId),
  ])

  const notice = resolveAdminUsersMessage(tMessages, sp.notice)
  const error = resolveAdminUsersMessage(tMessages, sp.error)

  const backLink = (
    <Button
      variant="ghost"
      size="sm"
      render={<Link href="/admin/users" />}
      className="mb-4"
    >
      <ArrowLeftIcon className="me-2 h-4 w-4" aria-hidden="true" />
      {t("backToUsers")}
    </Button>
  )

  if (!result.ok) {
    return (
      <>
        {backLink}
        <h1 className="text-2xl font-semibold">{t("detail.heading")}</h1>
        <p role="alert" className="mt-4 text-sm text-destructive">
          {tMessages("userNotFound")}
        </p>
      </>
    )
  }

  const user = result.data
  const isSelf = user.id === callerId
  const confirmingDisable = sp.confirm === "disable"
  const confirmingDelete = sp.confirm === "delete"

  return (
    <>
      {backLink}

      <div className="mb-6">
        <h1 className="truncate text-2xl font-semibold">
          {user.email ?? t("detail.heading")}
        </h1>
        {isSelf ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("detail.self")}
          </p>
        ) : null}
      </div>

      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {/* Read-only detail summary. */}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <Detail label={t("detail.email")} value={user.email} t={t} />
        <Detail label={t("detail.name")} value={user.fullName} t={t} />
        <Detail label={t("detail.phone")} value={user.phone} t={t} />
        <Detail label={t("detail.locale")} value={user.locale} t={t} />
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-medium text-muted-foreground">
            {t("detail.role")}
          </dt>
          <dd>
            <Badge
              variant={user.role === "instructor" ? "default" : "secondary"}
            >
              {t(`role.${user.role}`)}
            </Badge>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-medium text-muted-foreground">
            {t("detail.status")}
          </dt>
          <dd className="text-sm">
            {user.disabled ? t("state.disabled") : t("state.active")}
          </dd>
        </div>
        <Detail
          label={t("detail.enrollments")}
          value={String(user.enrollmentCount)}
          t={t}
        />
        <Detail
          label={t("detail.createdAt")}
          value={new Date(user.createdAt).toLocaleDateString(locale)}
          t={t}
        />
      </dl>

      <Separator className="my-8" />

      {/* Role change form. Hidden for self (cannot demote own account). */}
      {!isSelf ? (
        <section aria-labelledby="role-heading" className="mb-8">
          <h2 id="role-heading" className="mb-3 text-base font-semibold">
            {t("detail.roleHeading")}
          </h2>
          <form
            action={setUserRoleAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="userId" value={user.id} />
            <div className="flex flex-col gap-1.5 sm:w-48">
              <Label htmlFor="role">{t("detail.role")}</Label>
              <NativeSelect id="role" name="role" defaultValue={user.role}>
                {ROLE_VALUES.map((role) => (
                  <NativeSelectOption key={role} value={role}>
                    {t(`role.${role}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline" className="shrink-0">
              {t("detail.roleSubmit")}
            </Button>
          </form>
        </section>
      ) : null}

      {/* Disable / enable. Disabling requires a confirm step. Hidden for self. */}
      {!isSelf ? (
        <section aria-labelledby="disable-heading" className="mb-8">
          <h2 id="disable-heading" className="mb-3 text-base font-semibold">
            {t("detail.disableHeading")}
          </h2>
          {user.disabled ? (
            <form action={setUserDisabledAction}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="disabled" value="false" />
              <Button type="submit" variant="outline">
                {t("detail.enableSubmit")}
              </Button>
            </form>
          ) : confirmingDisable ? (
            <div className="rounded-md border border-border p-4">
              <p className="mb-1 text-sm font-medium">
                {t("detail.confirmDisableTitle")}
              </p>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("detail.confirmDisableBody")}
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={setUserDisabledAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="disabled" value="true" />
                  <input type="hidden" name="confirm" value="yes" />
                  <Button type="submit" variant="destructive">
                    {t("detail.confirm")}
                  </Button>
                </form>
                <Button
                  variant="ghost"
                  render={<Link href={`/admin/users/${user.id}`} />}
                >
                  {t("detail.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <form action={setUserDisabledAction}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="disabled" value="true" />
              <Button type="submit" variant="outline">
                {t("detail.disableSubmit")}
              </Button>
            </form>
          )}
        </section>
      ) : null}

      {/* Delete. Always requires a confirm step. Hidden for self. */}
      {!isSelf ? (
        <section aria-labelledby="delete-heading">
          <h2 id="delete-heading" className="mb-3 text-base font-semibold">
            {t("detail.deleteHeading")}
          </h2>
          {confirmingDelete ? (
            <div className="rounded-md border border-destructive/40 p-4">
              <p className="mb-1 text-sm font-medium">
                {t("detail.confirmDeleteTitle")}
              </p>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("detail.confirmDeleteBody")}
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={deleteUserAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="confirm" value="yes" />
                  <Button type="submit" variant="destructive">
                    {t("detail.confirm")}
                  </Button>
                </form>
                <Button
                  variant="ghost"
                  render={<Link href={`/admin/users/${user.id}`} />}
                >
                  {t("detail.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <form action={deleteUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <Button type="submit" variant="destructive">
                {t("detail.deleteSubmit")}
              </Button>
            </form>
          )}
        </section>
      ) : null}
    </>
  )
}

/**
 * One read-only label/value pair in the detail summary list. Falls back to a
 * localized "not set" when the value is empty.
 */
function Detail({
  label,
  value,
  t,
}: {
  label: string
  value: string | null
  t: (key: "detail.notSet") => string
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">{value || t("detail.notSet")}</dd>
    </div>
  )
}
