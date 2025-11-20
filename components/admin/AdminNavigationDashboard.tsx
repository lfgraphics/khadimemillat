'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Plus,
  UserCog2,
  ListIcon,
  Heart,
  HandHeart,
  Target,
  BellDot,
  UserIcon,
  ImageIcon,
  Store,
  FileCheck,
  Settings,
  Database,
  ShoppingCart,
  Search,
  BookOpen,
  Calendar,
  BarChart3,
  Mail,
  History,
  FileText as FileTemplate,
  Truck,
  Package,
  CreditCard,
  Shield,
  Activity,
  Zap,
  TrendingUp,
  Globe,
  Layers
} from 'lucide-react';

interface NavigationItem {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  category: string;
}

const adminNavigationItems: NavigationItem[] = [
  // Core Management
  {
    title: 'Scrap Dashboard',
    description: 'Overview and matrics of Scrap collection requests and collected items',
    href: '/admin',
    icon: LayoutDashboard,
    category: 'Core Management'
  },
  {
    title: 'Manage Users',
    description: 'User roles, permissions, and account management',
    href: '/admin/manage-users',
    icon: UserCog2,
    category: 'Core Management'
  },
  {
    title: 'Categories',
    description: 'Manage sponsorship and survey categories',
    href: '/admin/categories',
    icon: Layers,
    badge: 'New',
    category: 'Core Management'
  },

  // Request & Survey Management
  {
    title: 'Verify Requests',
    description: 'Review and approve incoming requests',
    href: '/admin/verify-requests',
    icon: ClipboardCheck,
    category: 'Request Management'
  },
  {
    title: 'All Requests',
    description: 'View and manage all system requests',
    href: '/admin/requests',
    icon: FileCheck,
    category: 'Request Management'
  },
  {
    title: 'Survey Management',
    description: 'Review surveys and family assessments',
    href: '/admin/surveys',
    icon: ClipboardCheck,
    category: 'Request Management'
  },
  {
    title: 'Sponsorship',
    description: 'Manage sponsorship programs and requests',
    href: '/admin/sponsorship',
    icon: UserIcon,
    category: 'Request Management'
  },

  // Collection & Items
  {
    title: 'Create Collection Request',
    description: 'Initiate new collection requests',
    href: '/admin/create-collection-request',
    icon: Plus,
    category: 'Collection Management'
  },
  {
    title: 'List Donations',
    description: 'View and manage donation listings',
    href: '/list-donation',
    icon: ListIcon,
    category: 'Collection Management'
  },
  {
    title: 'Items Management',
    description: 'Manage collected items and inventory',
    href: '/admin/items',
    icon: Package,
    category: 'Collection Management'
  },

  // Financial & Donations
  {
    title: 'Money Donations',
    description: 'Track and manage monetary contributions',
    href: '/admin/money-donations',
    icon: Heart,
    category: 'Financial Management'
  },
  {
    title: 'Expense Management',
    description: 'Track organizational expenses with receipts and audit trails',
    href: '/admin/expenses',
    icon: CreditCard,
    category: 'Financial Management'
  },
  {
    title: 'Donation Lookup',
    description: 'Search and verify online donation records',
    href: '/admin/purchases/lookup',
    icon: Search,
    category: 'Financial Management'
  },

  // Programs & Campaigns
  {
    title: 'Welfare Programs',
    description: 'Manage welfare and support programs',
    href: '/admin/welfare-programs',
    icon: HandHeart,
    category: 'Programs & Campaigns'
  },
  {
    title: 'Campaigns',
    description: 'Create and manage fundraising campaigns',
    href: '/admin/campaigns',
    icon: Target,
    category: 'Programs & Campaigns'
  },
  {
    title: 'Activities',
    description: 'Manage organizational activities and events',
    href: '/admin/activities',
    icon: ImageIcon,
    category: 'Programs & Campaigns'
  },

  // Communication
  {
    title: 'Notifications',
    description: 'Manage system notifications and alerts',
    href: '/admin/notifications',
    icon: BellDot,
    category: 'Communication'
  },
  {
    title: 'Compose Notifications',
    description: 'Create and send new notifications',
    href: '/admin/notifications/compose',
    icon: Mail,
    category: 'Communication'
  },
  {
    title: 'Notification Analytics',
    description: 'View notification performance metrics',
    href: '/admin/notifications/analytics',
    icon: BarChart3,
    category: 'Communication'
  },
  {
    title: 'Notification History',
    description: 'View past notification records',
    href: '/admin/notifications/history',
    icon: History,
    category: 'Communication'
  },
  {
    title: 'Notification Templates',
    description: 'Manage reusable notification templates',
    href: '/admin/notifications/templates',
    icon: FileTemplate,
    category: 'Communication'
  },

  // System & Tools
  {
    title: 'System Seed',
    description: 'Initialize system data and configurations',
    href: '/admin/seed',
    icon: Database,
    badge: 'Admin Only',
    category: 'System & Tools'
  }
];

const categoryColors = {
  'Core Management': 'bg-blue-50 border-blue-200 text-blue-800',
  'Request Management': 'bg-green-50 border-green-200 text-green-800',
  'Collection Management': 'bg-purple-50 border-purple-200 text-purple-800',
  'Financial Management': 'bg-yellow-50 border-yellow-200 text-yellow-800',
  'Programs & Campaigns': 'bg-pink-50 border-pink-200 text-pink-800',
  'Communication': 'bg-indigo-50 border-indigo-200 text-indigo-800',
  'System & Tools': 'bg-gray-50 border-gray-200 text-gray-800'
};

export function AdminNavigationDashboard() {
  const groupedItems = adminNavigationItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Admin Navigation Center</h1>
        <p className="text-muted-foreground">
          Access all administrative functions and management tools
        </p>
      </div>

      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">{category}</h2>
            <Badge 
              variant="outline" 
              className={categoryColors[category as keyof typeof categoryColors]}
            >
              {items.length} tools
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <item.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-12 p-6 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg">{adminNavigationItems.length}</div>
            <div className="text-muted-foreground">Total Tools</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{Object.keys(groupedItems).length}</div>
            <div className="text-muted-foreground">Categories</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">
              {adminNavigationItems.filter(item => item.badge).length}
            </div>
            <div className="text-muted-foreground">Featured</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">24/7</div>
            <div className="text-muted-foreground">Available</div>
          </div>
        </div>
      </div>
    </div>
  );
}