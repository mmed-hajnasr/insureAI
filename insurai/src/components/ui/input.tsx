import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[8px] border border-[var(--neutral-400)] bg-[var(--neutral-0)] px-3 py-2.5 font-body text-[14px] font-medium text-[var(--palette-text-primary)] transition-[color,box-shadow,background-color,border-color] duration-200 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--neutral-500)] focus-visible:border-[var(--palette-bg-primary-core)] focus-visible:ring-0 focus-visible:bg-[color-mix(in_srgb,var(--palette-bg-primary-core)_6%,#fff)] focus-visible:shadow-[0_0_0_2px_var(--palette-bg-primary-core)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
