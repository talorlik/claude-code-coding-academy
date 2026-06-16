import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { listUsers, USERS_PAGE_SIZE } from "@/lib/admin/users"
import { inviteUserAction } from "@/lib/admin/users-actions"
import { resolveAdminUsersMessage } from "@/lib/admin/resolve-users-message"
import { ROLE_VALUES } from "@/lib/validation/admin-users"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "AdminUsers" })
  return { title: t("title"), robots: { index: false, follow: false } }
}

/**
 * Admin users list page (Batch 26). Guarded by the admin layout (and the nested
 * users layout) via `requireAdmin()`; the data layer re-checks on every call.
 *
 * Renders an invite form (Tier-2 no-JS `<form>` -> `inviteUserAction`) and a
 * paginated, set-based table. Each row links to the per-user detail page where
 * role/disable/delete actions live. Feedback is server-rendered from the
 * `?notice=`/`?error=` query param through the `AdminUsers.messages` allowlist,
 * so it works with JavaScript disabled and forged params reflect nothing.
 *
 * @param params - Route params (a Promise); carries the active locale.
 * @param searchParams - The page query (a Promise); `page`, `notice`, `error`.
 */
export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; notice?: string; error?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const sp = await searchParams
  const pageNumber = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1)

  const [t, tMessages, result] = await Promise.all([
    getTranslations("AdminUsers"),
    getTranslations("AdminUsers.messages"),
    listUsers(pageNumber, USERS_PAGE_SIZE),
  ])

  const notice = resolveAdminUsersMessage(tMessages, sp.notice)
  const error =
    resolveAdminUsersMessage(tMessages, sp.error) ??
    (result.ok ? null : tMessages("inviteFailed"))

  const users = result.ok ? result.data.users : []
  const hasMore = result.ok ? result.data.hasMore : false

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
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

      {/* Invite form: Tier-2 no-JS. Posts FormData to the server action. */}
      <section
        aria-labelledby="invite-heading"
        className="mb-8 rounded-lg border p-4"
      >
        <h2 id="invite-heading" className="mb-4 text-base font-semibold">
          {t("inviteHeading")}
        </h2>
        <form
          action={inviteUserAction}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="invite-email">{t("inviteEmailLabel")}</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder={t("inviteEmailPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-48">
            <Label htmlFor="invite-role">{t("inviteRoleLabel")}</Label>
            <NativeSelect id="invite-role" name="role" defaultValue="student">
              {ROLE_VALUES.map((role) => (
                <NativeSelectOption key={role} value={role}>
                  {t(`role.${role}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" className="shrink-0">
            {t("inviteSubmit")}
          </Button>
        </form>
      </section>

      {/* Users table: set-based listing, responsive horizontal scroll. */}
      <div className="w-full overflow-x-auto rounded-lg border">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">{t("table.caption")}</caption>
          <colgroup>
            <col className="w-auto" />
            <col className="hidden w-40 md:table-column" />
            <col className="w-24" />
            <col className="hidden w-24 lg:table-column" />
            <col className="w-24" />
            <col className="w-20" />
          </colgroup>
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-3 text-start font-medium sm:px-4">
                {t("table.email")}
              </th>
              <th className="hidden px-4 py-3 text-start font-medium md:table-cell">
                {t("table.name")}
              </th>
              <th className="px-3 py-3 text-start font-medium sm:px-4">
                {t("table.role")}
              </th>
              <th className="hidden px-4 py-3 text-start font-medium lg:table-cell">
                {t("table.enrollments")}
              </th>
              <th className="px-3 py-3 text-start font-medium sm:px-4">
                {t("table.status")}
              </th>
              <th className="px-3 py-3 text-end font-medium sm:px-4">
                {t("table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-muted-foreground sm:px-4"
                >
                  {t("table.empty")}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20">
                  <td className="min-w-0 px-3 py-3 sm:px-4">
                    <span className="block truncate font-medium">
                      {user.email ?? "-"}
                    </span>
                  </td>
                  <td className="hidden min-w-0 px-4 py-3 md:table-cell">
                    <span className="block truncate">
                      {user.fullName ?? "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <Badge
                      variant={
                        user.role === "instructor" ? "default" : "secondary"
                      }
                    >
                      {t(`role.${user.role}`)}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {user.enrollmentCount}
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    {user.disabled ? (
                      <Badge variant="outline">{t("state.disabled")}</Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("state.active")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-end sm:px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/users/${user.id}`} />}
                    >
                      {t("table.view")}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination: prev/next links carrying the page query param. */}
      <nav
        aria-label={t("pagination.page", { page: pageNumber })}
        className="mt-6 flex items-center justify-between gap-4"
      >
        {pageNumber > 1 ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/users?page=${pageNumber - 1}`} />}
          >
            {t("pagination.previous")}
          </Button>
        ) : (
          <span />
        )}
        <span className="text-sm text-muted-foreground">
          {t("pagination.page", { page: pageNumber })}
        </span>
        {hasMore ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/users?page=${pageNumber + 1}`} />}
          >
            {t("pagination.next")}
          </Button>
        ) : (
          <span />
        )}
      </nav>
    </>
  )
}
