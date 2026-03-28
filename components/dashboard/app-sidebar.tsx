"use client"

import * as React from "react"
import {
  Send,
  Sparkles,
  LayoutDashboard,
  ShoppingBag,
  ImageIcon,
  Palette,
  Plug,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { NavMain } from "@/components/dashboard/nav-main"
import { NavSecondary } from "@/components/dashboard/nav-secondary"
import { NavUser } from "@/components/dashboard/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const navSecondary = [
  {
    title: "Support",
    url: "mailto:support@pinloop.ai",
    icon: Send,
  },
]

// Pin Quota Card Component
function PinQuotaCard({ isSubscribed }: { isSubscribed?: boolean }) {
  return (
    <Card className="py-2">
      <CardContent className="gap-1 flex flex-col px-3">
        <div className="text-sm font-medium mb-1">Engine Status</div>
        <div className="text-xs text-muted-foreground mb-3 flex justify-between">
          <span className="flex items-center gap-2"><ImageIcon size={12} />Pins</span>
          <span className={isSubscribed ? "text-emerald-600" : "text-amber-600"}>
            {isSubscribed ? "Active" : "Inactive"}
          </span>
        </div>
        {isSubscribed ? (
          <Button size="sm" variant="outline" className="w-full" asChild>
            <Link href="/subscribe" prefetch={false}>
              Manage Billing
            </Link>
          </Button>
        ) : (
          <Button size="sm" className="w-full bg-black hover:bg-black/90 text-white border-0" asChild>
            <Link href="/subscribe" prefetch={false}>
              <Sparkles className="h-3 w-3" /> Subscribe
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function AppSidebar({
  user,
  isSubscribed,
  planName,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: {
    name: string
    email: string
    avatar: string
    id?: string
  }
  isSubscribed?: boolean
  planName?: string | null
}) {
  const userData = user || {
    name: "User",
    email: "user@example.com",
    avatar: "/placeholder-user.jpg",
  }

  const navItems = React.useMemo(() => [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Approval",
      url: "/approval",
      icon: CheckCircle,
    },
    {
      title: "Products",
      url: "/products",
      icon: ShoppingBag,
    },
    {
      title: "My Pins",
      url: "/pins",
      icon: ImageIcon,
    },
    {
      title: "Brand Settings",
      url: "/settings/brand",
      icon: Palette,
    },
    {
      title: "Integrations",
      url: "/integrations",
      icon: Plug,
    },
  ], [])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" prefetch={false}>
                <Image src="/site-logo.png" alt="PinLoop AI" width={30} height={30} className="rounded-sm" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">PinLoop</span>
                  <span className="truncate text-xs">Pinterest AI Agent</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <PinQuotaCard isSubscribed={isSubscribed} />
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}

