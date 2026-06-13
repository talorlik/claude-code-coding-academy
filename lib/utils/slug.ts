/**
 * Pure slug-generation utility.
 *
 * Produces a URL-safe ASCII slug from arbitrary human-readable input:
 * - Lowercases all ASCII letters.
 * - Strips diacritics from Latin characters (e.g. "é" -> "e").
 * - Drops all non-[a-z0-9] characters (including Hebrew and other
 *   non-Latin scripts) rather than attempting transliteration, so the
 *   result is always a safe ASCII identifier.
 * - Converts any run of non-slug characters (spaces, underscores,
 *   punctuation) to a single hyphen.
 * - Trims leading and trailing hyphens.
 * - Collapses consecutive hyphens into one.
 * - Truncates to 80 characters and trims any resulting trailing hyphen.
 * - Returns an empty string for input that contains no slug-able chars.
 */

const MAX_LENGTH = 80

/**
 * Convert a human-readable title or label to a URL-safe ASCII slug.
 *
 * @param input - Raw title or label string. May contain unicode, spaces,
 *   punctuation, or mixed scripts.
 * @returns A lowercase ASCII slug (characters: `[a-z0-9-]`), or an
 *   empty string when the input contains no slug-able characters.
 *
 * @example
 * slugify("Hello World!")     // "hello-world"
 * slugify("  --leading--  ") // "leading"
 * slugify("שלום עולם")        // "" (Hebrew stripped - no ASCII letters)
 * slugify("React & TypeScript") // "react-typescript"
 * slugify("already-valid")    // "already-valid"
 */
export function slugify(input: string): string {
  return (
    input
      // Normalize to NFD so combining diacritics become separate code points.
      .normalize("NFD")
      // Strip combining diacritical marks (U+0300..U+036F).
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Replace every run of non-[a-z0-9] characters with a single hyphen.
      .replace(/[^a-z0-9]+/g, "-")
      // Strip leading and trailing hyphens.
      .replace(/^-+|-+$/g, "")
      // Collapse any remaining consecutive hyphens (safety net).
      .replace(/-{2,}/g, "-")
      // Limit length.
      .substring(0, MAX_LENGTH)
      // A truncation may leave a trailing hyphen.
      .replace(/-+$/, "")
  )
}
