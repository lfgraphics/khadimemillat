"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  moderatorNotes?: string;
};

const STATUS_OPTIONS = ["pending", "verified", "collected", "completed"];

export default function ModeratorReviewDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { isSignedIn } = useUser();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<CollectionRequest | null>(null);
  const [moderatorNotes, setModeratorNotes] = useState("");
  const [status, setStatus] = useState("pending");

  const fetchRequest = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/protected/collection-requests/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
  const data = await res.json();
  const req = data.request;
  setRequest(req);
  setModeratorNotes(req.moderatorNotes || "");
  setStatus(req.status);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  const save = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/protected/collection-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderatorNotes, status }),
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchRequest();
      toast.success('Request updated');
    } catch (e: any) {
      setError(e.message || "Failed to update");
      toast.error(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/moderator/review">← Back</Link>
        </Button>
        <h1 className="text-xl font-semibold">Review Collection Request</h1>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {!loading && request && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Donor</p>
                  <p>{typeof request.donor === "string" ? request.donor : [request.donor?.firstName, request.donor?.lastName].filter(Boolean).join(" ") || request.donor?.email || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p><Badge>{request.status}</Badge></p>
                </div>
                {request.address && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p>{request.address}</p>
                  </div>
                )}
                {request.phone && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p>{request.phone}</p>
                  </div>
                )}
                {request.requestedPickupTime && (
                  <div>
                    <p className="text-muted-foreground">Requested Time</p>
                    <p>{format(new Date(request.requestedPickupTime), "PPp")}</p>
                  </div>
                )}
                {request.actualPickupTime && (
                  <div>
                    <p className="text-muted-foreground">Collected Time</p>
                    <p>{format(new Date(request.actualPickupTime), "PPp")}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{format(new Date(request.createdAt), "PPp")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p>{format(new Date(request.updatedAt), "PPp")}</p>
                </div>
                {request.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Donor Notes</p>
                    <p className="whitespace-pre-wrap text-xs bg-muted/40 p-2 rounded border">{request.notes}</p>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium">Moderator Notes</label>
                <Textarea
                  value={moderatorNotes}
                  onChange={(e) => setModeratorNotes(e.target.value)}
                  placeholder="Add any observations about quality, weight estimation, or issues..."
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={(v)=> setStatus(v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button disabled={saving} variant="default">{saving ? <><Loader2 className='h-4 w-4 animate-spin mr-2' /> Saving</> : 'Save Changes'}</Button>
                  </DialogTrigger>
                  <DialogContent className='max-w-sm'>
                    <DialogHeader>
                      <DialogTitle>Confirm Save</DialogTitle>
                    </DialogHeader>
                    <p className='text-xs text-muted-foreground'>Apply changes to moderator notes and status (currently <span className='font-medium'>{status}</span>)?</p>
                    <DialogFooter className='pt-2'>
                      <Button variant='outline' size='sm'>Cancel</Button>
                      <Button size='sm' onClick={save} disabled={saving}>{saving ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Confirm'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => router.push('/moderator/review')}>Done</Button>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workflow Guidance</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p><strong>Collected</strong>: Items have been physically picked up and await moderation review.</p>
                <p><strong>Completed</strong>: Final state after verifying notes and integrity. Trigger downstream finalization logic (future enhancement).</p>
                <p>Use moderator notes for quality assessment or discrepancies (e.g., weight mismatch, contamination).</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
