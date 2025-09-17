"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from '@/components/ui/sidebar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Notification = {
    _id: string;
    title: string;
    body?: string;
    url?: string;
    read: boolean;
    type?: string;
    createdAt: string;
};

interface NotificationBellProps {
    intervalMs?: number;
    limit?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ intervalMs = 15000, limit = 10 }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();
    // Access sidebar state to conditionally show label
    let sidebarState: 'expanded' | 'collapsed' | null = null;
    try {
        // useSidebar will throw if used outside provider; guard with try/catch
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        sidebarState = (useSidebar() as any)?.state || null;
    } catch {}
    const isCollapsed = sidebarState === 'collapsed';

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch only unread first to compute count efficiently, then fetch recent list (could be combined later)
            const unreadRes = await fetch(`/api/protected/notifications?unread=true&limit=1`, { cache: 'no-store' });
            let unreadTotal = 0;
            if (unreadRes.ok) {
                const unreadJson = await unreadRes.json();
                unreadTotal = typeof unreadJson.total === 'number' ? unreadJson.total : (unreadJson.items?.length || 0);
            }

            const listQs = new URLSearchParams({ limit: String(limit) });
            const res = await fetch(`/api/protected/notifications?${listQs.toString()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to load notifications');
            const data = await res.json();
            const notifs: Notification[] = data.items || [];
            setItems(notifs);
            setUnreadCount(unreadTotal);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch');
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchNotifications();
        if (intervalMs > 0) {
            pollRef.current = setInterval(fetchNotifications, intervalMs);
            return () => { if (pollRef.current) clearInterval(pollRef.current); };
        }
    }, [fetchNotifications, intervalMs]);

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch(`/api/protected/notifications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ read: true }),
            });
            if (!res.ok) throw new Error('Failed to mark read');
            setItems(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error(e);
        }
    };

    const markAllAsRead = async () => {
        const unread = items.filter(i => !i.read);
        if (unread.length === 0 && unreadCount === 0) return;
        // Optimistic UI: mark all local items as read
        setItems(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        // Fire off sequential marks; if many, could add batch endpoint later
        await Promise.all(unread.map(u => markAsRead(u._id)));
        // Refetch to ensure consistency (especially for pages > first page unseen unread items)
        fetchNotifications();
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={unreadCount > 0 ? "default" : "ghost"}
                    aria-label="Notifications"
                    className={cn("relative flex items-center gap-2 h-8 px-2", isCollapsed && "justify-center")}
                >
                    <Bell className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span className="text-xs font-medium">Notifications</span>}
                    {unreadCount > 0 && (
                        <span className={cn("absolute bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center font-medium",
                            isCollapsed ? "-top-1 -right-1" : "-top-1 -right-1") }>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="p-0 w-80">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                    <p className="text-sm font-medium">Notifications</p>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={fetchNotifications} disabled={loading} aria-label="Refresh notifications">
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : '↻'}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={markAllAsRead} disabled={unreadCount === 0}>Mark all</Button>
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {error && (
                        <div className="p-3">
                            <Alert variant="destructive">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription className="text-xs">{error}</AlertDescription>
                            </Alert>
                        </div>
                    )}
                    {!error && items.length === 0 && !loading && (
                        <div className="p-3 text-xs text-muted-foreground">No notifications.</div>
                    )}
                    {items.map(n => (
                        <div
                            key={n._id}
                            className={cn(
                                "px-3 py-2 border-b last:border-b-0 text-xs space-y-0.5 cursor-pointer hover:bg-muted/50",
                                !n.read && "bg-muted/30"
                            )}
                            onClick={() => {
                                if (!n.read) markAsRead(n._id);
                                if (n.url) {
                                    router.push(n.url);
                                    setOpen(false);
                                }
                            }}
                        >
                            <div className="flex items-start gap-2">
                                <div className="flex-1">
                                    <p className="font-medium leading-snug line-clamp-2">{n.title}</p>
                                    {n.body && <p className="text-muted-foreground line-clamp-3">{n.body}</p>}
                                </div>
                                {!n.read && (
                                    <span className="mt-0.5 inline-block w-2 h-2 rounded-full bg-blue-600" />
                                )}
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                                {n.url && (
                                    <Link
                                        href={n.url}
                                        className="text-[10px] underline text-blue-600 hover:text-blue-700"
                                        onClick={() => setOpen(false)}
                                    >
                                        View
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                        </div>
                    )}
                </div>
                <div className="px-3 py-2 border-t bg-muted/30 flex justify-end">
                    <Button asChild variant="link" className="h-6 p-0 text-xs">
                        <Link href="/notifications" onClick={() => setOpen(false)}>Open full page →</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationBell;
