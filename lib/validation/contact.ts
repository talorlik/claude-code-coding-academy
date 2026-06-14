import { z } from "zod"

/**
 * Validation schema for the public contact form (Batch 16, Tier-2 no-JS form).
 *
 * The form is demo-grade: it collects a name, a reply-to email, and a free-text
 * message. Bounds are deliberately conservative so a hand-crafted or oversized
 * POST is rejected server-side regardless of the HTML `maxlength`/`required`
 * attributes, which a client can bypass. No personal data is persisted; the
 * server action only validates, logs, and acknowledges (see
 * {@link submitContactMessage}).
 */
export const contactMessageSchema = z.object({
  /** Sender's display name. Trimmed; 1-100 chars after trimming. */
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  /** Reply-to address. Validated as an email and length-capped. */
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(254, "Email is too long")
    .email("Enter a valid email address"),
  /** Free-text body. 10-2000 chars to reject empty or abusive payloads. */
  message: z
    .string()
    .trim()
    .min(10, "Message is too short")
    .max(2000, "Message is too long"),
})

/** A validated contact-form submission. */
export type ContactMessageInput = z.infer<typeof contactMessageSchema>
