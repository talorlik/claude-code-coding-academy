"use client"

import { Printer } from "lucide-react"

/**
 * Tiny client island that triggers window.print().
 *
 * Rationale: PDF generation via a library (puppeteer, react-pdf, pdfkit)
 * adds hundreds of MB to the server bundle. Instead, we render a
 * print-optimized certificate page with CSS @media print rules so the
 * browser's built-in Print-to-PDF produces the artifact. This button is
 * the only JS involved.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </button>
  )
}
