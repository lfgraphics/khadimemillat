"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateWhatsAppUrl } from '@/lib/utils/phone';
import { getCloudinaryUrl } from '@/lib/cloudinary-client';
import { ClickableImage } from '@/components/ui/clickable-image'
import { safeJson } from '@/lib/utils';
import { EnhancedFileSelector } from '@/components/file-selector';
import { FileUploadError, UploadResult } from '@/components/file-selector/types';

type CollectionRequest = {
  _id: string;
  donor: string;
  donorDetails?: { id: string; name: string; email?: string; phone?: string };
  collectedByDetails?: { id: string; name: string; email?: string };
  address?: string;
  phone?: string;
  notes?: string;
  requestedPickupTime?: string;
  actualPickupTime?: string;
  status: string;
  assignedFieldExecutives?: string[];
  createdAt: string;
  updatedAt: string;
  moderatorNotes?: string;
  donationEntryId?: string;
};

type DonationDetail = {
  id: string;
  donor?: { id: string; name: string; email?: string; phone?: string } | null;
  collectedBy?: { id: string; name: string; email?: string } | null;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    condition: string;
    photos: { before?: string[]; after?: string[] };
    marketplaceListing: { listed?: boolean; demandedPrice?: number; salePrice?: number; sold?: boolean };
    repairingCost?: number;
  }>;
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
  const [donation, setDonation] = useState<DonationDetail | null>(null);
  const [itemEdits, setItemEdits] = useState<Record<string, any>>({});
  const [itemSaving, setItemSaving] = useState<Record<string, boolean>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string | null>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({});
  const updateEdit = (id: string, patch: any) => {
    setItemEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const saveItem = async (id: string) => {
    if (!donation) return;
    const edit = itemEdits[id] || {};
    setItemSaving(p => ({ ...p, [id]: true }));
    setItemErrors(p => ({ ...p, [id]: null }));
    try {
      const payload: any = {};
      if (edit.condition) payload.condition = edit.condition;
      if (typeof edit.repairingCost === 'number') payload.repairingCost = edit.repairingCost;
      if ('listed' in edit || 'demandedPrice' in edit || 'salePrice' in edit || 'sold' in edit) {
        payload.marketplaceListing = {
          listed: edit.listed ?? edit.marketplaceListing?.listed,
          demandedPrice: edit.demandedPrice,
          salePrice: edit.salePrice,
          sold: edit.sold,
        };
      }
      if (Array.isArray(edit.afterPhotos)) payload.afterPhotos = edit.afterPhotos;
  const res = await fetch(`/api/protected/scrap-items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Save failed ${await res.text().catch(()=> '')}`);
  const json = await safeJson<any>(res);
  setDonation(d => d ? { ...d, items: d.items.map(it => it.id === id ? { ...it, ...json.item, marketplaceListing: json.item?.marketplaceListing || it.marketplaceListing } : it) } : d);
      setItemEdits(prev => ({ ...prev, [id]: {} }));
    } catch (e: any) {
      setItemErrors(p => ({ ...p, [id]: e.message || 'Error' }));
    } finally {
      setItemSaving(p => ({ ...p, [id]: false }));
    }
  };

  // Enhanced file selector handlers for after photos
  const handleAfterPhotoFileSelect = (itemId: string) => (file: File, previewUrl: string) => {
    // no-op
  };

  const handleAfterPhotoUploadComplete = (itemId: string) => (uploadResult: UploadResult) => {
    // Add the uploaded photo to the item's after photos
    const currentAfterPhotos = itemEdits[itemId]?.afterPhotos || [];
    updateEdit(itemId, { 
      afterPhotos: [...currentAfterPhotos, uploadResult.publicId] 
    });
    toast.success('After photo uploaded successfully');
  };

  const handleAfterPhotoUploadError = (itemId: string) => (error: FileUploadError) => {
    console.error(`After photo upload error for item ${itemId}:`, error);
    toast.error(`Upload failed: ${error.message}`);
  };

  // Component for after photo upload
  const AfterPhotoUploader: React.FC<{ itemId: string; itemName: string }> = ({ itemId, itemName }) => {
    return (
      <div className="inline-block">
        <EnhancedFileSelector
          onFileSelect={handleAfterPhotoFileSelect(itemId)}
          onUploadComplete={handleAfterPhotoUploadComplete(itemId)}
          onError={handleAfterPhotoUploadError(itemId)}
          maxFileSize={8 * 1024 * 1024} // 8MB
          acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          placeholder="Add After Photos"
          showPreview={false}
          uploadToCloudinary={true}
          cloudinaryOptions={{
            folder: 'kmwf/scrap-items/after',
            tags: ['scrap-item', 'after-photo', itemId]
          }}
          className="text-xs bg-muted px-2 py-1 rounded border hoact:bg-background transition cursor-pointer"
        />
      </div>
    );
  };
  const [moderatorNotes, setModeratorNotes] = useState("");
  const [status, setStatus] = useState("pending");
  // WhatsApp dialog state
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  const sendWhatsappConfirmation = async () => {
    const rawPhone = request?.donorDetails?.phone || request?.phone;
    if (!rawPhone) {
      toast.error('No phone number available for donor');
      return;
    }
    setSendingWhatsapp(true);
    try {
      const name = request?.donorDetails?.name || 'Donor';
      const message = `Hello ${name}, your donation has been processed and completed. Thank you for your contribution to Khadim-e-Millat Welfare Foundation!`;
      const whatsappUrl = generateWhatsAppUrl(rawPhone, message, process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE as string | undefined || '91');
      window.open(whatsappUrl, '_blank');
      try {
        await fetch('/api/protected/whatsapp/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: rawPhone, whatsappUrl, message, collectionRequestId: id })
        });
      } catch {}
      toast.success('WhatsApp opened with confirmation message');
      setWhatsappDialogOpen(false);
    } catch (e) {
      toast.error('Failed to open WhatsApp');
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const fetchRequest = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
  const res = await fetch(`/api/protected/collection-requests/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load request (${res.status}) ${await res.text().catch(()=> '')}`);
  const data = await safeJson<any>(res);
      const req = data.request;
      setRequest(req);
      setModeratorNotes(req.moderatorNotes || "");
      setStatus(req.status);
      if (req.donationEntryId) {
        try {
          const dRes = await fetch(`/api/protected/donation-entries/${req.donationEntryId}`, { cache: 'no-store' });
          if (dRes.ok) {
            const dj = await safeJson<any>(dRes);
            setDonation(dj.donation);
          }
        } catch (e) {
          console.warn('[DONATION_FETCH_FAIL]', e);
        }
      } else {
        setDonation(null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const save = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/protected/collection-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moderatorNotes, status }),
      });
      if (!res.ok) throw new Error('Update failed');
      await fetchRequest();
      toast.success('Request updated');
    } catch (e: any) {
      setError(e.message || 'Failed to update');
      toast.error(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }, [id, moderatorNotes, status, fetchRequest]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  // Using shared getCloudinaryUrl from client helper

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
                  <p>{request.donorDetails?.name || request.donorDetails?.email || request.donor}</p>
                </div>
                {request.collectedByDetails && (
                  <div>
                    <p className="text-muted-foreground">Picker</p>
                    <p>{request.collectedByDetails.name || request.collectedByDetails.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p><Badge>{request.status === 'collected' ? 'Fulfilled (collected)' : request.status}</Badge></p>
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
                {(request?.donorDetails?.phone || request?.phone) && (
                  <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={!(request?.donorDetails?.phone || request?.phone)}>Send WhatsApp</Button>
                    </DialogTrigger>
                    <DialogContent className='max-w-md'>
                      <DialogHeader>
                        <DialogTitle>Send WhatsApp Confirmation</DialogTitle>
                      </DialogHeader>
                      <div className='space-y-3'>
                        <p className='text-sm text-muted-foreground'>
                          Send a confirmation message to <span className='font-medium'>{request?.donorDetails?.name || 'Donor'}</span> at {(request?.donorDetails?.phone || request?.phone)}
                        </p>
                        <div className='bg-muted/40 p-3 rounded text-xs'>
                          Hello {request?.donorDetails?.name || 'Donor'}, your donation has been processed and completed. Thank you for your contribution to Khadim-e-Millat Welfare Foundation!
                        </div>
                      </div>
                      <DialogFooter className='pt-2'>
                        <Button variant='outline' size='sm' onClick={() => setWhatsappDialogOpen(false)}>Cancel</Button>
                        <Button size='sm' onClick={sendWhatsappConfirmation} disabled={sendingWhatsapp}>
                          {sendingWhatsapp ? <Loader2 className='h-3 w-3 animate-spin mr-2' /> : null}
                          Open WhatsApp
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
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
            {donation && (
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base'>Donation Items</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {donation.items.length === 0 && <p className='text-xs text-muted-foreground'>No items yet.</p>}
                  <div className='space-y-5'>
                    {donation.items.map(it => {
                      const edit = itemEdits[it.id] || {};
                      const combinedAfter = [ ...(it.photos?.after || []), ...(edit.afterPhotos || []) ];
                      const sale = (edit.salePrice ?? it.marketplaceListing?.salePrice);
                      const repair = (edit.repairingCost ?? it.repairingCost);
                      const profit = (typeof sale === 'number' && typeof repair === 'number') ? sale - repair : null;
                      return (
                        <div key={it.id} className='border rounded p-3 space-y-3 text-xs bg-background'>
                          <div className='flex flex-wrap justify-between gap-2'>
                            <div className='font-medium'>{it.name}</div>
                            <div className='flex items-center gap-2'>
                              <label className='text-muted-foreground'>Condition:</label>
                              <select
                                className='bg-muted/40 border rounded px-1 py-0.5 text-[11px]'
                                value={edit.condition || it.condition}
                                onChange={e => updateEdit(it.id, { condition: e.target.value })}
                              >
                                {['new','good','repairable','scrap','not applicable'].map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className='flex flex-wrap gap-2'>
                            {(it.photos?.before || []).slice(0,4).map((p,i)=>(
                              <ClickableImage
                                key={i}
                                src={p}
                                alt='Before photo'
                                className='h-14 w-14 object-cover rounded border'
                                caption={`${it.name} - Before photo ${i+1}`}
                              />
                            ))}
                            {combinedAfter.slice(0,4).map((p,i)=>(
                              <ClickableImage
                                key={i}
                                src={p}
                                alt='After photo'
                                className='h-14 w-14 object-cover rounded border ring-2 ring-green-400'
                                caption={`${it.name} - After photo ${i+1}`}
                              />
                            ))}
                          </div>
                          <div className='flex flex-wrap gap-4 items-center'>
                            <div className='flex items-center gap-1'>
                              <Switch checked={(edit.listed ?? it.marketplaceListing?.listed) || false} onCheckedChange={(v)=> updateEdit(it.id, { listed: v })} />
                              <span>Listed</span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <Switch checked={(edit.sold ?? it.marketplaceListing?.sold) || false} onCheckedChange={(v)=> updateEdit(it.id, { sold: v })} />
                              <span>Sold</span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <span>Ask:</span>
                              <Input type='number' className='h-7 w-20 text-xs' value={edit.demandedPrice ?? it.marketplaceListing?.demandedPrice ?? ''} onChange={e=> updateEdit(it.id, { demandedPrice: e.target.value === '' ? undefined : Number(e.target.value) })} />
                            </div>
                            <div className='flex items-center gap-1'>
                              <span>Sold:</span>
                              <Input type='number' className='h-7 w-20 text-xs' value={edit.salePrice ?? it.marketplaceListing?.salePrice ?? ''} onChange={e=> updateEdit(it.id, { salePrice: e.target.value === '' ? undefined : Number(e.target.value) })} />
                            </div>
                            <div className='flex items-center gap-1'>
                              <span>Repair:</span>
                              <Input type='number' className='h-7 w-20 text-xs' value={edit.repairingCost ?? it.repairingCost ?? ''} onChange={e=> updateEdit(it.id, { repairingCost: e.target.value === '' ? undefined : Number(e.target.value) })} />
                            </div>
                            {profit !== null && <span className={profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>Profit: {profit}</span>}
                          </div>
                          <div className='flex flex-wrap gap-2 items-center'>
                            <AfterPhotoUploader itemId={it.id} itemName={it.name} />
                            <Button size='sm' className='h-7 px-3' disabled={itemSaving[it.id]} onClick={()=> saveItem(it.id)}>
                              {itemSaving[it.id] ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Save'}
                            </Button>
                            {itemErrors[it.id] && <span className='text-red-500 text-[10px]'>{itemErrors[it.id]}</span>}
                            {Object.keys(edit).length > 0 && !itemSaving[it.id] && <span className='text-[10px] text-amber-500'>Unsaved changes</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className='text-[10px] text-muted-foreground'>Changes are applied per item via its Save button.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
