"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// UI components (assuming shadcn style structure present in repo)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type CollectionRequest = {
  _id: string;
  donor: { _id: string; email?: string; firstName?: string; lastName?: string } | string;
  address?: string;
  phone?: string;
  notes?: string;
  requestedPickupTime?: string;
  actualPickupTime?: string;
  status: string;
  assignedScrappers?: Array<{ _id: string; email?: string } | string>;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  verified: "bg-blue-100 text-blue-800",
  collected: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
};

export default function ModeratorReviewPage() {
  const { isSignedIn, user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<string>("collected");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      // We want only collected (awaiting moderation) by default
      const res = await fetch(`/api/protected/collection-requests?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
  const data = await res.json();
  setRequests(data.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const markCompleted = async (id: string) => {
    setUpdatingIds(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/protected/collection-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchRequests();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Moderator Review</h1>
          <p className="text-sm text-muted-foreground">Review collected requests, add notes in detail view, and finalize.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={(v)=> setFilter(v)}>
            <SelectTrigger size="sm" className="min-w-[140px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>{loading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Refresh'}</Button>
        </div>
      </div>
      <Separator />
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      {loading && requests.length === 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_,i)=>(<Card key={i} className='p-4 animate-pulse h-48' />))}
        </div>
      )}
      {!loading && requests.length === 0 && (
        <div className="text-sm text-muted-foreground">No collection requests to review.</div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {requests.map(r => {
          const donorName = typeof r.donor === "string" ? r.donor : [r.donor?.firstName, r.donor?.lastName].filter(Boolean).join(" ") || r.donor?.email || "Unknown";
          return (
            <Card key={r._id} className="flex flex-col">
              <CardHeader className="space-y-2 pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate" title={donorName}>{donorName}</span>
                  <Badge className={cn("ml-2", STATUS_COLOR[r.status] || "bg-gray-100 text-gray-800")}>
                    {r.status}
                  </Badge>
                </CardTitle>
                <div className="text-xs text-muted-foreground flex flex-col gap-1">
                  {r.requestedPickupTime && (
                    <span>Requested: {format(new Date(r.requestedPickupTime), "PPp")}</span>
                  )}
                  {r.actualPickupTime && (
                    <span>Collected: {format(new Date(r.actualPickupTime), "PPp")}</span>
                  )}
                  <span>Created: {format(new Date(r.createdAt), "PPp")}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 pt-2">
                {r.address && <p className="text-xs">Address: {r.address}</p>}
                {r.phone && <p className="text-xs">Phone: {r.phone}</p>}
                {r.notes && <p className="text-xs line-clamp-3">Notes: {r.notes}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/moderator/review/${r._id}`}>Details</Link>
                  </Button>
                  {r.status === "collected" && (
                    <Dialog open={confirmId === r._id} onOpenChange={(o)=> setConfirmId(o ? r._id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={!!updatingIds[r._id]}>{updatingIds[r._id] ? 'Finalizing...' : 'Mark Completed'}</Button>
                      </DialogTrigger>
                      <DialogContent className='max-w-sm'>
                        <DialogHeader>
                          <DialogTitle>Finalize Request</DialogTitle>
                        </DialogHeader>
                        <p className='text-xs text-muted-foreground'>Confirm completion of this collection request. This will mark it as completed and remove it from the collected queue.</p>
                        <DialogFooter className='pt-2'>
                          <Button variant='outline' size='sm' onClick={()=> setConfirmId(null)} disabled={!!updatingIds[r._id]}>Cancel</Button>
                          <Button size='sm' onClick={()=> markCompleted(r._id)} disabled={!!updatingIds[r._id]}>{updatingIds[r._id] ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Confirm'}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
