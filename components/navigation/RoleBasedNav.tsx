"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Settings,
  Users,
  ClipboardList,
  FileText,
  Heart,
  ChevronDown,
  Shield,
  Eye,
  UserCheck
} from "lucide-react";

interface RoleBasedNavProps {
  userRole?: string;
}

export function RoleBasedNav({ userRole }: RoleBasedNavProps) {
  const { user } = useUser();

  if (!user || !userRole) return null;

  const roleConfig = {
    admin: {
      label: "Admin",
      color: "bg-red-500",
      links: [
        { href: "/admin", label: "Admin Dashboard", icon: Settings },
        { href: "/admin/sponsorship", label: "Sponsorship Management", icon: Heart },
        { href: "/admin/users", label: "User Management", icon: Users },
        { href: "/admin/reports", label: "Reports", icon: FileText }
      ]
    },
    moderator: {
      label: "Moderator",
      color: "bg-blue-500",
      links: [
        { href: "/admin/sponsorship", label: "Sponsorship Management", icon: Heart },
        { href: "/moderator", label: "Moderator Dashboard", icon: Shield },
        { href: "/admin/reports", label: "Reports", icon: FileText }
      ]
    },
    inquiry_officer: {
      label: "Surveyor",
      color: "bg-green-500",
      links: [
        { href: "/surveyor", label: "Surveyor Dashboard", icon: ClipboardList },
        { href: "/surveyor/surveys", label: "My Surveys", icon: FileText }
      ]
    },
    user: {
      label: "User",
      color: "bg-gray-500",
      links: [
        { href: "/dashboard", label: "Dashboard", icon: Users },
        { href: "/sponsorship/request", label: "Request Sponsorship", icon: Heart }
      ]
    }
  };

  const config = roleConfig[userRole as keyof typeof roleConfig];
  
  if (!config) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Badge className={`${config.color} text-white`}>
            {config.label}
          </Badge>
          <span className="hidden sm:inline">Role Menu</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium">
          {user.firstName} {user.lastName}
        </div>
        <div className="px-2 py-1 text-xs text-muted-foreground">
          {config.label} Access
        </div>
        <DropdownMenuSeparator />
        
        {config.links.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link href={link.href} className="flex items-center gap-2">
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {/* Quick Actions based on role */}
        {userRole === 'admin' && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin/sponsorship?filter=pending" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Pending Requests
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/sponsorship?filter=urgent" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Urgent Cases
              </Link>
            </DropdownMenuItem>
          </>
        )}
        
        {userRole === 'inquiry_officer' && (
          <DropdownMenuItem asChild>
            <Link href="/surveyor?filter=assigned" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Assigned Surveys
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}