"use client"

import * as React from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardList,
  BarChart3,
  GraduationCap,
  Settings,
  BookOpen,
  HelpCircle,
  UsersRound,
  FileQuestion,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Define navigation items based on user role
  const getNavItems = () => {
    const commonItems = [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        isActive: true,
      },
      {
        title: "Tests",
        url: "/tests",
        icon: ClipboardList,
      },
      {
        title: "Reports",
        url: "/reports",
        icon: BarChart3,
      },
    ]

    const teacherAdminItems = [
      {
        title: "Questions",
        url: "/questions",
        icon: FileQuestion,
      },
      {
        title: "Student Groups",
        url: "/student-groups",
        icon: UsersRound,
      },
    ]

    const adminItems = [
      {
        title: "Subjects",
        url: "/subjects",
        icon: BookOpen,
      },
      {
        title: "Users",
        url: "/users",
        icon: Users,
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      },
    ]

    if (user?.role === 'admin') {
      return [...commonItems, ...teacherAdminItems, ...adminItems]
    } else if (user?.role === 'teacher') {
      return [...commonItems, ...teacherAdminItems]
    } else {
      return commonItems
    }
  }

  const userData = {
    name: user?.name || "User",
    email: user?.email || "user@smartassess.com",
    avatar: "/avatars/user.jpg",
  }

  const navSecondary = [
    {
      title: "Documentation",
      url: "/docs",
      icon: FileText,
    },
    {
      title: "Help & Support",
      url: "/support",
      icon: HelpCircle,
    },
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="bg-linear-to-br from-blue-600 to-blue-800 text-white flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm">
                  <GraduationCap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Smart Assessment</span>
                  <span className="truncate text-xs text-muted-foreground">Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavItems()} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} onLogout={() => {
          logout()
          navigate('/login')
        }} />
      </SidebarFooter>
    </Sidebar>
  )
}
