import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { requireAdmin } from "@/lib/auth/guards"
import { listGroups } from "@/lib/groups/queries"
import { createGroup, addMember, removeMember } from "@/lib/groups/actions"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Groups" })
  return { title: t("adminPageTitle") }
}

/**
 * Admin class groups management page.
 *
 * Allows instructors to:
 * - View all class groups
 * - Create new groups (slug + name form)
 * - Add/remove members by user UUID
 * - View per-group progress stats (via group_progress_summary view)
 *
 * All forms use server actions; no client JS required for core operations.
 * requireAdmin() is called at the admin layout, but we re-call for defense
 * in depth (each action also guards itself).
 */
export default async function AdminGroupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  await requireAdmin()
  const [t, groups] = await Promise.all([
    getTranslations("Groups"),
    listGroups(),
  ])

  const { notice, error } = await searchParams

  async function handleCreateGroup(formData: FormData) {
    "use server"
    const result = await createGroup({
      slug: formData.get("slug"),
      name: formData.get("name"),
    })
    const { redirect } = await import("@/i18n/navigation")
    const locale2 = await import("next-intl/server").then((m) => m.getLocale())
    if (result.ok) {
      return redirect({
        href: `/admin/groups?notice=created`,
        locale: locale2,
      })
    }
    return redirect({
      href: `/admin/groups?error=${encodeURIComponent(result.message)}`,
      locale: locale2,
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("adminPageTitle")}
        </h1>
      </div>

      {notice === "created" && (
        <div
          role="status"
          className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200"
        >
          {t("success.created")}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Create group form */}
      <section aria-labelledby="create-group-heading">
        <h2
          id="create-group-heading"
          className="mb-4 text-base font-semibold text-foreground"
        >
          {t("createTitle")}
        </h2>
        <form
          action={handleCreateGroup}
          className="flex flex-wrap gap-3"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="group-name" className="text-sm font-medium">
              {t("name")}
            </label>
            <input
              id="group-name"
              name="name"
              type="text"
              required
              placeholder={t("namePlaceholder")}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="group-slug" className="text-sm font-medium">
              {t("slug")}
            </label>
            <input
              id="group-slug"
              name="slug"
              type="text"
              required
              placeholder={t("slugPlaceholder")}
              pattern="[a-z0-9-]+"
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            />
            <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("submit")}
            </button>
          </div>
        </form>
      </section>

      {/* Groups list */}
      <section aria-labelledby="groups-list-heading">
        <h2
          id="groups-list-heading"
          className="mb-4 text-base font-semibold text-foreground"
        >
          {t("adminPageTitle")}
        </h2>

        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="font-medium text-foreground">{t("adminEmpty.title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("adminEmpty.body")}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                t={t}
                addMember={addMember}
                removeMember={removeMember}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GroupCard - inline server component with forms
// ---------------------------------------------------------------------------

async function GroupCard({
  group,
  t,
  addMember: addMemberAction,
  removeMember: removeMemberAction,
}: {
  group: import("@/lib/groups/types").ClassGroupDTO
  t: Awaited<ReturnType<typeof getTranslations<"Groups">>>
  addMember: typeof addMember
  removeMember: typeof removeMember
}) {
  const { listGroupMembers, getGroupProgress } = await import(
    "@/lib/groups/queries"
  )
  const [members, progressSummaries] = await Promise.all([
    listGroupMembers(group.id),
    getGroupProgress(group.id),
  ])

  async function handleAddMember(formData: FormData) {
    "use server"
    const result = await addMemberAction({
      groupId: group.id,
      userId: formData.get("userId"),
    })
    const { redirect } = await import("@/i18n/navigation")
    const locale2 = await import("next-intl/server").then((m) => m.getLocale())
    const base = `/admin/groups`
    if (result.ok) {
      return redirect({ href: `${base}?notice=memberAdded`, locale: locale2 })
    }
    return redirect({
      href: `${base}?error=${encodeURIComponent(result.message)}`,
      locale: locale2,
    })
  }

  async function handleRemoveMember(formData: FormData) {
    "use server"
    const userId = formData.get("userId") as string
    const groupId = formData.get("groupId") as string
    await removeMemberAction({ groupId, userId })
    const { revalidatePath } = await import("next/cache")
    revalidatePath("/", "layout")
  }

  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-medium text-foreground">{group.name}</p>
          <p className="text-xs text-muted-foreground">/{group.slug}</p>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {t("memberCount", { count: members.length })}
        </span>
      </div>

      {/* Progress summary */}
      {progressSummaries.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {progressSummaries.map((ps) => (
            <span key={`${ps.groupId}-${ps.courseId}`}>
              {ps.courseId?.slice(0, 8)}... {t("avgProgress")}:{" "}
              {Math.round(ps.avgProgressPercent ?? 0)}%
            </span>
          ))}
        </div>
      )}

      {/* Members list */}
      {members.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate text-foreground">
                {member.userId}
              </span>
              <form action={handleRemoveMember}>
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="userId" value={member.userId} />
                <button
                  type="submit"
                  className="shrink-0 text-xs text-destructive hover:underline"
                >
                  {t("removeMember")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Add member form */}
      <form action={handleAddMember} className="flex min-w-0 gap-2">
        <label htmlFor={`add-member-${group.id}`} className="sr-only">
          {t("userIdLabel")}
        </label>
        <input
          id={`add-member-${group.id}`}
          name="userId"
          type="text"
          required
          placeholder={t("userIdPlaceholder")}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("addMemberSubmit")}
        </button>
      </form>
    </li>
  )
}
