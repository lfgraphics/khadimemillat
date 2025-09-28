"use client";

import React, { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from '@/components/ui/sidebar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNotifications } from '@/hooks/useNotifications';

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
    // intervalMs is deprecated and ignored to reduce load
    intervalMs?: number;
    limit?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ intervalMs, limit = 10 }) => {
    const [open, setOpen] = useState(false);
    const { items, unreadCount, loading, error, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
    const router = useRouter();
    // Access sidebar state to conditionally show label
    let sidebarState: 'expanded' | 'collapsed' | null = null;
    try {
        // useSidebar will throw if used outside provider; guard with try/catch
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        sidebarState = (useSidebar() as any)?.state || null;
    } catch { }
    const isCollapsed = sidebarState === 'collapsed';

    useEffect(() => {
        // Opportunistically ensure push subscription (in case WebPushManager missed due to hydration ordering)
        (async () => {
            try {
                if ('serviceWorker' in navigator) {
                    const reg = await navigator.serviceWorker.ready;
                    const sub = await reg.pushManager.getSubscription();
                    if (sub) {
                        fetch('/api/protected/web-push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub }) });
                    }
                }
            } catch (e) { /* ignore */ }
        })();
        // No interval polling to reduce load
    }, []);

    const onMarkAll = async () => {
        if (unreadCount === 0 && items.every(i => i.read)) return;
        await markAllAsRead();
    };

    return (
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) fetchNotifications({ force: !!error }); }}>
            <PopoverTrigger asChild>
                <Button
                    variant={unreadCount > 0 ? "default" : "ghost"}
                    aria-label="Notifications"
                    className={cn("relative flex items-center gap-2 h-8 px-2 ml-1", isCollapsed && "justify-center")}
                >
                    <Bell className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span className="text-xs font-medium">Notifications</span>}
                    {unreadCount > 0 && (
                        <span className={cn("absolute bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center font-medium",
                            isCollapsed ? "-top-1 -right-1" : "-top-1 -right-1")}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="p-0 w-80">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                    <p className="text-sm font-medium">Notifications</p>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => fetchNotifications({ force: true })} disabled={loading} aria-label="Refresh notifications">
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : '↻'}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onMarkAll} disabled={unreadCount === 0}>Mark all</Button>
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
