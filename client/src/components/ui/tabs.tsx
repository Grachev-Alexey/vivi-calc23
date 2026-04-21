import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-1 rounded-2xl p-1.5 text-muted-foreground",
      "border border-[hsl(var(--border))]",
      "bg-[linear-gradient(160deg,hsla(222,42%,11%,0.85)_0%,hsla(220,40%,7%,0.85)_100%)]",
      "backdrop-blur-xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold tracking-tight transition-all duration-300",
      "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-0",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:text-[hsl(var(--navy))]",
      "data-[state=active]:bg-[linear-gradient(135deg,hsl(43,90%,62%)_0%,hsl(36,82%,48%)_100%)]",
      "data-[state=active]:shadow-[0_8px_24px_-6px_hsla(43,88%,56%,0.45),inset_0_1px_0_hsla(0,0%,100%,0.2)]",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
