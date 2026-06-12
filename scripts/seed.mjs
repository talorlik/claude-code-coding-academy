#!/usr/bin/env node
// Seeds two confirmed users into the connected Supabase project: one instructor
// (the privileged teacher account) and one first student. Idempotent: an
// existing user is reused, and the role insert is upserted, so re-running is
// safe. Uses the Admin API (secret key), which bypasses RLS and can create
// pre-confirmed users - something a SQL migration cannot do cleanly because it
// would have to hash passwords and populate auth.identities by hand.
//
// Reads credentials from the environment:
//   E2E_INSTRUCTOR_EMAIL / E2E_INSTRUCTOR_PASSWORD
//   E2E_STUDENT_EMAIL    / E2E_STUDENT_PASSWORD
// and Supabase connection from NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY.

import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { createClient } from "@supabase/supabase-js"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

// Minimal .env.local loader so `node scripts/seed.mjs` works without extra deps.
// Lines are `KEY=VALUE`; existing process.env wins, and inline `#` comments and
// surrounding quotes are stripped.
function loadEnvLocal() {
  const file = join(root, ".env.local")
  if (!existsSync(file)) return
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    if (process.env[key] !== undefined) continue
    let value = line.slice(eq + 1).trim()
    const hash = value.indexOf(" #")
    if (hash !== -1) value = value.slice(0, hash).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY

if (!url || !secret) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in the environment.",
  )
  process.exit(1)
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Finds an existing auth user by email by paging through the admin list. The
 * Admin API has no direct get-by-email, so this scans pages until a match or
 * exhaustion. Fine for a seed with a tiny user table.
 */
async function findUserByEmail(email) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === target)
    if (match) return match
    if (data.users.length < 200) return null
  }
  return null
}

/**
 * Creates (or reuses) a confirmed user, upserts an empty profile row, and grants
 * the given role. Returns the user id.
 */
async function seedUser(email, password, role) {
  if (!email || !password) {
    throw new Error(
      `Missing credentials for role "${role}". Set the matching E2E_* env vars.`,
    )
  }

  let user = await findUserByEmail(email)
  if (user) {
    console.log(`  • ${role}: user ${email} already exists (${user.id})`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error
    user = data.user
    console.log(`  • ${role}: created ${email} (${user.id})`)
  }

  // Profile row (idempotent).
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ user_id: user.id }, { onConflict: "user_id" })
  if (profileError) throw profileError

  // Role grant (idempotent via composite primary key).
  const { error: roleError } = await admin
    .from("user_roles")
    .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" })
  if (roleError) throw roleError

  console.log(`    role "${role}" granted, profile ensured`)
  return user.id
}

async function main() {
  console.log("Seeding instructor and first student…")
  await seedUser(
    process.env.E2E_INSTRUCTOR_EMAIL,
    process.env.E2E_INSTRUCTOR_PASSWORD,
    "instructor",
  )
  await seedUser(
    process.env.E2E_STUDENT_EMAIL,
    process.env.E2E_STUDENT_PASSWORD,
    "student",
  )
  console.log("Done.")
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err)
  process.exit(1)
})
