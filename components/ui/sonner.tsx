"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { IconCircleCheck, IconInfoCircle, IconAlertTriangle, IconAlertOctagon, IconLoader } from "@tabler/icons-react"

// No next-themes wiring — CoSync has a single fixed light theme, no dark
// mode toggle, so the toaster is just always "light" rather than pulling in
// a theme-context dependency for a mode that doesn't exist yet.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <IconCircleCheck className="size-4" />
        ),
        info: (
          <IconInfoCircle className="size-4" />
        ),
        warning: (
          <IconAlertTriangle className="size-4" />
        ),
        error: (
          <IconAlertOctagon className="size-4" />
        ),
        loading: (
          <IconLoader className="size-4 animate-spin" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-card border border-olive bg-white text-ink shadow-md",
          title: "text-ink",
          description: "text-oak",
          actionButton: "rounded-pill bg-fresh text-white",
          cancelButton: "rounded-pill bg-cream text-ink",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
