"use client"

import * as React from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
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
  const location = useLocation()

  // Define navigation items based on user role
  // Define navigation items based on user role
  const getNavItems = () => {
    const currentPath = location.pathname;

    // Helper to check active state
    const isActive = (url: string) => {
      if (url === '/dashboard') return currentPath === '/dashboard';
      return currentPath.startsWith(url);
    };

    const dashboardItem = {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: isActive("/dashboard"),
    };

    const usersItem = {
      title: "Users",
      url: "/users",
      icon: Users,
      isActive: isActive("/users"),
    };

    const subjectsItem = {
      title: "Subjects",
      url: "/subjects",
      icon: BookOpen,
      isActive: isActive("/subjects"),
    };

    const studentGroupsItem = {
      title: "Student Groups",
      url: "/student-groups",
      icon: UsersRound,
      isActive: isActive("/student-groups"),
    };

    const questionsItem = {
      title: "Questions",
      url: "/questions",
      icon: FileQuestion,
      isActive: isActive("/questions"),
    };

    const testsItem = {
      title: "Tests",
      url: "/tests",
      icon: ClipboardList,
      isActive: isActive("/tests"),
    };

    const reportsItem = {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
      isActive: isActive("/reports"),
    };

    const settingsItem = {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: isActive("/settings"),
    };

    // Order: Dashboard, Users, Subjects, Student Groups, Questions, Tests, Reports, Settings
    if (user?.role === 'admin') {
      return [
        dashboardItem,
        usersItem,
        subjectsItem,
        studentGroupsItem,
        questionsItem,
        testsItem,
        reportsItem,
        settingsItem
      ];
    } else if (user?.role === 'teacher') {
      return [
        dashboardItem,
        studentGroupsItem,
        questionsItem,
        testsItem,
        reportsItem
      ];
    } else {
      // Student or other
      return [
        dashboardItem,
        testsItem,
        reportsItem
      ];
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
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm">
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
