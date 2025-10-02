"use client"
/**
 * Donation Intake Page
 * Flow:
 *  - Search / create donor (Clerk + Mongo linkage)
 *  - Stage multiple items (with images, condition, marketplace listing intent)
 *  - Generate temporary barcodes (UUID) locally
 *  - On finalize: confirmation modal -> POST to full submission endpoint
 *  - Redirect to print page with persistent barcodes (Mongo IDs)
 */
import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { safeJson } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SearchableDropDownSelect, { ComboboxOption } from '@/components/searchable-dropdown-select';
import UserSearchAndCreate, { Donor } from '@/components/UserSearchAndCreate';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClickableImage } from '@/components/ui/clickable-image';
import { toast } from 'sonner';
import { EnhancedFileSelector } from '@/components/file-selector';
import { FileUploadError, UploadResult } from '@/components/file-selector/types';
import { Label } from '@/components/ui/label';

interface LocalItem {
  tempId: string;
  serverId?: string;
  name: string;
  description: string;
  donorId: string;
  donorName: string;
  condition: Condition;
  photos: { before: string[]; after: string[] };
  marketplace: { listed: boolean; demandedPrice?: number }
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class DonationErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Donation intake error:', error, errorInfo);
    // Don't show toast when error boundary is active to avoid duplicate errors
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="py-6 sm:py-8 lg:py-12 min-h-screen flex items-center justify-center">
          <div className="max-w-md mx-auto px-4 sm:px-6">
            <Card className="p-6 sm:p-8 text-center space-y-6 border-destructive/20 bg-destructive/5">
              <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Something went wrong</h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  We encountered an error while loading the donation intake page. Please refresh the page to try again.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => window.location.reload()}
                  className="min-h-[44px] px-6 font-medium touch-manipulation"
                  size="lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="min-h-[44px] px-6 font-medium touch-manipulation"
                  size="lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Go Back
                </Button>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const CONDITIONS = ["new", "good", "repairable", "scrap", "not applicable"] as const;
type Condition = typeof CONDITIONS[number];

// Predefined item names (excerpt from receipt) could be extracted to a separate file
const PRESET_ITEM_NAMES = [
  'Paper', 'Carton', 'Books', 'Plastic', 'Used clothes', 'Iron', 'Aluminium', 'Steel', 'Copper', 'Wire', 'Fan', 'Table Fan', 'Exhaust Fan', 'Radio', 'VCR', 'CD Player', 'Amplifier', 'Woofer', 'Land line phone', 'Sound box', 'Emergency Light', 'Room Heater', 'Roster', 'Rice Cooker', 'Oven', 'Cooler Motor', 'Thermas', 'Electric Stove', 'Gas Stove', 'Iron Box', 'Hair Dryer', 'Stabilizer', 'Massage Machine', 'Mixer', 'Geyser', 'A.C', 'Water Filter', 'Iron Stand', 'Vacuum Cleaner', 'Water pump', 'Watch', 'Child walker', 'Electronic accs.', 'Mobile/Tablet', 'Camera', 'Cooler', 'TV', 'Washing Machine', 'Refrigerator', 'TV Table', 'Computer Table', 'Wood Table', 'Counter Table', 'Dining Table', 'Dressing Table', 'Showcase', 'Wood bed', 'Malledaan', 'Tagat', 'Wood Almira', 'Iron Almira', 'Wood chair', 'Center Table', 'Wooden door', 'Door Frame', 'Sofa', 'Plywood', 'Wood', 'CPU', 'Moniter', 'UPS', 'Printer', 'Scanner', 'Laptop', 'Computer accs.', 'patient Bed', 'Wheel chair', 'Walker', 'Walking stick', 'Soap Nut', 'Medicine', 'Sewing Machine', 'Wash basin', 'Chair', 'Exercise cycle', 'Exercise Machine', 'Cycle', 'Glass Vessel', 'Tyres', 'Bags', 'Slippers', 'Mattress', 'Carpet', 'Water Tank', 'Crockery', 'Motor Cycle'
];

// Convert to options
const presetOptions: ComboboxOption[] = PRESET_ITEM_NAMES.map(n => ({ value: n, label: n }));



const DonationListManager: React.FC = () => {
  const [donor, setDonor] = useState<Donor | null>(null);

  // Get URL parameters using URLSearchParams
  const getUrlParams = () => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  };

  const urlParams = getUrlParams();
  const collectionRequestPrimary = urlParams.get('collectionRequest');
  const collectionRequestLegacy = urlParams.get('collectionRequestId');
  const collectionRequestId = collectionRequestPrimary || collectionRequestLegacy;
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const { user } = useUser();
  const currentRole = (user?.publicMetadata as any)?.role;
  const isScrapper = currentRole === 'scrapper';

  const emptyItem = useCallback((): LocalItem => ({ tempId: crypto.randomUUID(), name: '', description: '', donorId: donor?.mongoUserId || donor?.id || '', donorName: donor?.name || '', condition: 'good', photos: { before: [], after: [] }, marketplace: { listed: false } }), [donor]);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [currentItem, setCurrentItem] = useState<LocalItem>(emptyItem());
  const [itemNameSearch, setItemNameSearch] = useState('');
  const [preset, setPreset] = useState('');

  useEffect(() => { setCurrentItem(emptyItem()); }, [donor, emptyItem]);

  // Auto fetch donor from collection request if query param present
  useEffect(() => {
    if (!collectionRequestId) return;
    let cancelled = false;
    (async () => {
      try {
        setAutoFillLoading(true);
        const res = await fetch(`/api/protected/collection-requests/${collectionRequestId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await safeJson<any>(res);
        const req = json.request;
        if (!req || !req.donor) return;
        // Prefer enriched donorDetails from the request (already Clerk-first)
        const dd = req.donorDetails || null;
        if (!cancelled) {
          if (dd) {
            setDonor({ id: dd.id, mongoUserId: req.donorMongoId || undefined, name: dd.name, email: dd.email, phone: dd.phone, clerkUserId: dd.id });
          } else {
            // Fallback fetch
            const userRes = await fetch(`/api/protected/users?search=${encodeURIComponent(req.donor)}`, { cache: 'no-store' });
            const userJson = await safeJson<any>(userRes);
            const isMongoId = /^[a-fA-F0-9]{24}$/.test(req.donor);
            const match = (userJson.users || []).find((u: any) => u.id === req.donor || u.clerkUserId === req.donor || u.mongoUserId === req.donor);
            if (match) {
              setDonor({ id: match.id, mongoUserId: match.mongoUserId, name: match.name, email: match.email, phone: match.phone, clerkUserId: match.id });
            } else {
              // If donor is a Mongo ObjectId, set mongoUserId and avoid setting clerkUserId incorrectly
              if (isMongoId) {
                setDonor({ id: req.donor, mongoUserId: req.donor, name: 'Donor' });
              } else {
                setDonor({ id: req.donor, name: 'Donor', clerkUserId: req.donor });
              }
            }
          }
        }
      } catch (e) { console.warn('[AUTO_FILL_DONOR_FAILED]', e); }
      finally { if (!cancelled) setAutoFillLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [collectionRequestId]);

  const pushItem = async () => {
    const selectedUser = donor?.mongoUserId || donor?.id || '';

    // Validation
    if (!selectedUser) {
      toast.error('Please select a donor first');
      return;
    }

    if (!currentItem.name.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    if (currentItem.name.trim().length < 2) {
      toast.error('Item name must be at least 2 characters long');
      return;
    }

    setAddingItem(true);

    try {
      // Ensure a fresh tempId for each push regardless of memoized emptyItem
      const newItem: LocalItem = {
        ...currentItem,
        tempId: crypto.randomUUID(),
        donorId: selectedUser,
        donorName: donor?.name || '',
        name: currentItem.name.trim(),
        description: currentItem.description.trim()
      };

      setItems(prev => [newItem, ...prev]);
      setCurrentItem(emptyItem());
      setPreset('');
      setItemNameSearch('');

      toast.success(`Added "${newItem.name}" to the list`);
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item. Please try again.');
    } finally {
      setAddingItem(false);
    }
  };

  // Image management now handled by ImageUploader (uploads to Cloudinary and stores public_ids)
  const removePhoto = (phase: 'before' | 'after', index: number) => {
    try {
      setCurrentItem(ci => ({
        ...ci,
        photos: {
          ...ci.photos,
          [phase]: ci.photos[phase].filter((_, i) => i !== index)
        }
      }));
      // Don't show success toast for simple operations like removing photos
    } catch (error) {
      console.error(`Error removing ${phase} photo:`, error);
      toast.error(`Failed to remove ${phase} photo`);
    }
  };

  // Navigation function using window.location
  const navigateTo = (url: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);



  // Enhanced file selector for adding photos
  interface PhotoUploaderProps {
    onAdd: (id: string) => void;
    type: 'before' | 'after';
  }

  const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onAdd, type }) => {
    const handleFileSelect = (file: File) => {
      console.log(`${type} photo selected:`, file.name);

      // Validate file size (8MB limit)
      if (file.size > 8 * 1024 * 1024) {
        toast.error('File size must be less than 8MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, and WebP images are allowed');
        return;
      }
    };

    const handleUploadComplete = (uploadResult: UploadResult) => {
      try {
        onAdd(uploadResult.publicId);
        // Only show success toast for successful uploads, not for every photo
        toast.success(`Photo uploaded successfully`);
      } catch (error) {
        console.error(`Error adding ${type} photo:`, error);
        toast.error(`Failed to add photo`);
      }
    };

    const handleUploadError = (error: FileUploadError) => {
      console.error(`${type} photo upload error:`, error);
      // Only show toast for specific upload errors, not generic camera errors
      if (error.message && !error.message.toLowerCase().includes('camera') && !error.message.toLowerCase().includes('device')) {
        toast.error(`Upload failed: ${error.message}`);
      }
    };

    return (
      <div className="w-full h-full min-w-0">
        <EnhancedFileSelector
          onFileSelect={handleFileSelect}
          onUploadComplete={handleUploadComplete}
          onError={handleUploadError}
          maxFileSize={8 * 1024 * 1024} // 8MB
          acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          placeholder="+"
          showPreview={true}
          uploadToCloudinary={true}
          cloudinaryOptions={{
            folder: `kmwf/donation-items/${type}`,
            tags: ['donation-item', type, currentItem.tempId]
          }}
        // className="w-full h-full min-w-0 rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 cursor-pointer hover:bg-muted/40 hover:border-muted-foreground/50 hover:text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 group"
        />
      </div>
    );
  };

  const isValidObjectId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);
  const resolveDonorMongoId = async (id: string): Promise<string | null> => {
    if (isValidObjectId(id)) return id; // already mongo id
    try {
      // Use the dedicated mapping endpoint which upserts Mongo cache if missing
      const res = await fetch(`/api/protected/users/by-clerk-id/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await safeJson<any>(res);
      return json?.mongoUserId || null;
    } catch (e) { console.warn('[RESOLVE_DONOR_FAILED]', e); return null; }
  }

  const openConfirm = async () => {
    if (!selectedUser || items.length === 0) return;
    let mongoId = selectedUser;
    if (!isValidObjectId(mongoId)) {
      mongoId = await resolveDonorMongoId(selectedUser) || '';
    }
    if (!mongoId || !isValidObjectId(mongoId)) {
      console.warn('[INVALID_DONOR_ID_AFTER_RESOLVE]', selectedUser, mongoId);
      alert('Could not resolve donor Mongo ID. Ensure the donor exists or reload.');
      return;
    }
    // Patch donor ids inside working items/current state so submit uses mongo id
    setItems(prev => prev.map(p => ({ ...p, donorId: mongoId })));
    if (currentItem.donorId && !isValidObjectId(currentItem.donorId)) {
      setCurrentItem(ci => ({ ...ci, donorId: mongoId }));
    }
    setConfirmOpen(true);
  };

  const submitAll = async () => {
    if (!selectedUser || items.length === 0) return;

    setSubmitError(null);
    let donorMongoId = selectedUser;

    if (!isValidObjectId(donorMongoId)) {
      donorMongoId = await resolveDonorMongoId(selectedUser) || '';
    }

    if (!donorMongoId || !isValidObjectId(donorMongoId)) {
      console.warn('[SUBMIT_BLOCKED_INVALID_DONOR]', selectedUser, donorMongoId);
      setSubmitError('Cannot submit: donor could not be resolved.');
      return;
    }

    setFinalizing(true);

    try {
      const baseItems = items.map(i => ({
        name: i.name,
        description: i.description,
        condition: i.condition as any,
        photos: i.photos,
        marketplaceListing: {
          listed: i.marketplace.listed,
          demandedPrice: i.marketplace.demandedPrice
        }
      }));

      const payload: any = { donorId: donorMongoId, items: baseItems };
      if (collectionRequestId) payload.collectionRequestId = collectionRequestId;

      const res = await fetch('/api/protected/donation-entries/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[DONATION_SUBMIT_FAILED]', txt);
        const errorMessage = txt || 'Unknown error occurred';
        setSubmitError(`Failed to save donation: ${errorMessage}`);
        // Don't show toast when we're already showing error in modal
        return;
      }

      const json = await safeJson<any>(res);
      if (json.success && json.donationId) {
        const mapIds = json.itemIds as string[];
        setItems(prev => prev.map((it, idx) => ({ ...it, serverId: mapIds[idx] })));
        const printUrl = `/list-donation/print/${json.donationId}`;
        toast.success('Donation saved successfully!');
        navigateTo(printUrl);
      } else {
        console.error('[DONATION_SUBMIT_NO_SUCCESS]', json);
        const errorMessage = 'No success response received';
        setSubmitError(`Failed to save donation: ${errorMessage}`);
        // Don't show toast when we're already showing error in modal
      }
    } catch (err) {
      console.error('[DONATION_SUBMIT_ERROR]', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setSubmitError(`Failed to save donation: ${errorMessage}`);
      // Don't show toast when we're already showing error in modal
    } finally {
      setFinalizing(false);
      setConfirmOpen(false);
    }
  };

  // When selecting a preset or creating new preset option
  const handlePresetSelect = (val: string) => {
    setPreset(val);
    if (val) setCurrentItem(ci => ({ ...ci, name: val }));
  };
  const handleCreatePreset = (label: string) => {
    handlePresetSelect(label);
  };

  const selectedUser = donor?.mongoUserId || donor?.id || '';
  const selectedUserDetails = donor;

  const [donorPanelOpen, setDonorPanelOpen] = useState<boolean>(!donor);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10 lg:space-y-12 relative min-w-0">
      <header className="space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Donation Intake & Barcodes</h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">Create or select a donor, add detailed items with images & marketplace info, then submit to persist and generate verifiable barcodes.</p>
      </header>

      <section className="space-y-6 sm:space-y-8">
        <h2 className="font-semibold text-lg sm:text-xl">Donor</h2>
        {autoFillLoading && (
          <Card className="p-4 sm:p-6 border bg-blue-50/50 text-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-medium text-blue-700">Loading Donor Information</p>
            </div>
            <p className="text-blue-600">Fetching donor details from collection request...</p>
          </Card>
        )}

        {isScrapper && !donor && !collectionRequestId && !autoFillLoading && (
          <Card className="p-4 sm:p-6 border bg-muted/30 text-sm space-y-3">
            <p className="font-medium">Scrapper Mode</p>
            <p>You can select an existing donor below. Creating new donors is disabled. If you opened this from a verified collection request link, the donor will auto-fill.</p>
          </Card>
        )}
        <div className="w-full">
          <Collapsible open={donorPanelOpen} onOpenChange={setDonorPanelOpen}>
            <div className="flex justify-end mb-4 sm:mb-6">
              {!collectionRequestId && (
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={autoFillLoading}
                    className="h-auto min-h-[44px] px-6 py-3 font-medium hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 border-2 hover:border-accent-foreground/20 shadow-sm hover:shadow-md touch-manipulation"
                    aria-expanded={donorPanelOpen}
                    aria-controls="donor-selection-panel"
                  >
                    <span className="flex items-center gap-2">
                      {autoFillLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Loading Donor...
                        </>
                      ) : (
                        <>
                          <svg
                            className={`w-4 h-4 transition-transform duration-300 ${donorPanelOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          {donorPanelOpen ? 'Hide Donor Panel' : (donor ? 'Change Donor' : 'Select Donor')}
                        </>
                      )}
                    </span>
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
            <CollapsibleContent
              className="collapsible-content overflow-visible"
              id="donor-selection-panel"
              role="region"
              aria-labelledby="donor-selection-trigger"
            >
              <div className="space-y-6 pt-4 pb-6 px-2 sm:px-1 border-t border-border/50 bg-gradient-to-b from-muted/20 to-transparent rounded-lg overflow-visible">
                {!collectionRequestId && (
                  <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-border/50 shadow-sm overflow-visible">
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2">Donor Selection</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Search for an existing donor to associate with this donation intake.</p>
                    </div>
                    <UserSearchAndCreate onSelect={(d) => { setDonor(d); if (d) setDonorPanelOpen(false); }} enableCreate={false} />
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        {donor && (
          <Card className="relative p-4 sm:p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl hover:border-primary/40 hover:from-primary/8 hover:to-primary/15">
            {/* Selected indicator */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-t-md"></div>

            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
              <div className="flex-1 min-w-0 space-y-3 w-full sm:w-auto">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <p className="font-semibold text-lg sm:text-xl text-foreground truncate">{donor.name}</p>
                </div>

                <div className="space-y-2 pl-6">
                  {donor.email && (
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-2 min-h-[20px]">
                      <svg className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{donor.email}</span>
                    </p>
                  )}
                  {donor.phone && (
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-2 min-h-[20px]">
                      <svg className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="truncate">{donor.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {!isScrapper && (
                <div className="flex flex-col sm:items-end gap-3 flex-shrink-0 w-full sm:w-auto">
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800 border-green-200 text-xs font-medium px-3 py-1.5 hover:bg-green-200 transition-all duration-200 shadow-sm self-start sm:self-end"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Selected
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-auto min-h-[44px] px-4 py-2 text-xs sm:text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-200 focus:ring-2 focus:ring-ring focus:ring-offset-1 border border-transparent hover:border-border/50 touch-manipulation self-start sm:self-end"
                    onClick={() => setDonorPanelOpen(o => !o)}
                  >
                    <svg className={`w-3 h-3 mr-1 transition-transform duration-200 ${donorPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {donorPanelOpen ? 'Close' : 'Change'}
                  </Button>
                </div>
              )}
            </div>

            {/* Additional donor details */}
            <div className="mt-5 pt-4 border-t border-border/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-muted-foreground">
                {donor.mongoUserId && (
                  <div className="flex items-center gap-2 min-h-[24px]">
                    <span className="font-medium text-foreground/70">ID:</span>
                    <code className="bg-muted/60 px-2 py-1 rounded text-[10px] sm:text-xs font-mono border">
                      {donor.mongoUserId.slice(0, 8)}…
                    </code>
                  </div>
                )}
                <div className="flex items-center gap-2 min-h-[24px]">
                  <span className="font-medium text-foreground/70">Status:</span>
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Active
                  </span>
                </div>
              </div>
            </div>

            {autoFillLoading && !isScrapper && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className='text-xs text-muted-foreground'>Refreshing donor information…</p>
                </div>
              </div>
            )}
          </Card>
        )}
      </section>

      <section className="space-y-6 sm:space-y-8">
        <h2 className="font-semibold text-lg sm:text-xl">Add Item</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 min-w-0">
          {/* Form Fields Column */}
          <div className={`space-y-6 transition-all duration-300 min-w-0 ${selectedUser && currentItem.name.trim()
            ? 'ring-2 ring-green-200 ring-offset-2 sm:ring-offset-4 rounded-lg p-4 sm:p-6 bg-green-50/30'
            : 'p-4 sm:p-6'
            }`}>
            <div className="space-y-4">
              <Label className="text-sm font-medium text-foreground block">
                Item Name
                <span className="text-destructive ml-1" aria-label="required">*</span>
              </Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Search Presets</label>
                  <SearchableDropDownSelect
                    options={presetOptions}
                    value={preset}
                    onChange={handlePresetSelect}
                    searchTerm={itemNameSearch}
                    onSearchTermChange={setItemNameSearch}
                    onCreateOption={handleCreatePreset}
                    placeholder="Search or create item name..."
                    width="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Final Item Name</label>
                  <Input
                    value={currentItem.name}
                    onChange={e => setCurrentItem(ci => ({ ...ci, name: e.target.value }))}
                    placeholder="Enter or modify item name"
                    className={`w-full min-h-[44px] text-base transition-all duration-200 ${!currentItem.name.trim()
                      ? 'border-input focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2'
                      : 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-green-50/30'
                      }`}
                    aria-invalid={!currentItem.name.trim()}
                    required
                  />
                  {!currentItem.name.trim() && (
                    <p className="text-xs text-muted-foreground">Item name is required</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium text-foreground block">Item Condition</Label>
              <select
                className="w-full min-h-[44px] border border-input rounded-md px-3 py-3 text-base bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors duration-200 touch-manipulation"
                value={currentItem.condition}
                onChange={e => setCurrentItem(ci => ({ ...ci, condition: e.target.value as Condition }))}
                aria-label="Select item condition"
              >
                {CONDITIONS.map(c => (
                  <option key={c} value={c} className="py-2">
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground block">Marketplace Listing</Label>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border border-border rounded-lg bg-muted/10">
                  <input
                    id="list-immediately"
                    type="checkbox"
                    checked={currentItem.marketplace.listed}
                    onChange={e => setCurrentItem(ci => ({ ...ci, marketplace: { ...ci.marketplace, listed: e.target.checked } }))}
                    className="mt-0.5 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors duration-200 touch-manipulation"
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor='list-immediately' className="text-sm font-medium cursor-pointer text-foreground block">
                      List for Sale Immediately
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check this to make the item available in the marketplace after processing
                    </p>
                  </div>
                </div>
                {currentItem.marketplace.listed && (
                  <div className="space-y-2 pl-8">
                    <Label className="text-xs font-medium text-muted-foreground">Demanded Price (Optional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={currentItem.marketplace.demandedPrice ?? ''}
                        onChange={e => setCurrentItem(ci => ({ ...ci, marketplace: { ...ci.marketplace, demandedPrice: e.target.value ? Number(e.target.value) : undefined } }))}
                        className="w-full min-h-[44px] text-base pl-8 focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200"
                        aria-label="Enter demanded price in rupees"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Leave empty if price will be determined later</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium text-foreground block">Description (Optional)</Label>
              <Textarea
                value={currentItem.description}
                onChange={e => setCurrentItem(ci => ({ ...ci, description: e.target.value }))}
                placeholder="Add notes about condition, defects, special instructions, or other relevant details..."
                className="w-full min-h-[100px] resize-y text-base focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200"
                rows={4}
                aria-label="Enter item description"
              />
              <p className="text-xs text-muted-foreground">
                {currentItem.description.length}/500 characters
              </p>
            </div>
          </div>

          {/* Image Upload Column */}
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-foreground block">Before Images</Label>
                <p className="text-xs text-muted-foreground">Upload photos showing the item's current condition</p>
              </div>
              <div className="flex flex-row flex-wrap gap-3 sm:gap-4">
                {currentItem.photos.before.map((b, i) => (
                  <div key={i} className="relative group aspect-square min-w-0">
                    <ClickableImage
                      src={b}
                      alt="before"
                      className="w-full h-full object-cover rounded-md border border-border"
                      caption={`${currentItem.name || 'Item'} - Before photo`}
                      transform={{ width: 128, height: 128, crop: 'fill' }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto('before', i)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-7 h-7 sm:w-8 sm:h-8 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center shadow-lg hover:bg-destructive/90 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 focus:opacity-100 z-10 touch-manipulation"
                      aria-label="Remove before image"
                      title="Remove image"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="aspect-square min-w-0">
                  <PhotoUploader
                    type="before"
                    onAdd={(id) => setCurrentItem(ci => ({ ...ci, photos: { ...ci.photos, before: [...ci.photos.before, id] } }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-foreground block">After Images</Label>
                <p className="text-xs text-muted-foreground">Upload photos after cleaning, repair, or processing</p>
              </div>
              <div className="flex flex-row flex-wrap gap-3 sm:gap-4">
                {currentItem.photos.after.map((a, i) => (
                  <div key={i} className="relative group aspect-square min-w-0">
                    <ClickableImage
                      src={a}
                      alt="after"
                      className="w-full h-full object-cover rounded-md border border-border"
                      caption={`${currentItem.name || 'Item'} - After photo`}
                      transform={{ width: 128, height: 128, crop: 'fill' }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto('after', i)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-7 h-7 sm:w-8 sm:h-8 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center shadow-lg hover:bg-destructive/90 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 focus:opacity-100 z-10 touch-manipulation"
                      aria-label="Remove after image"
                      title="Remove image"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="aspect-square min-w-0">
                  <PhotoUploader
                    type="after"
                    onAdd={(id) => setCurrentItem(ci => ({ ...ci, photos: { ...ci.photos, after: [...ci.photos.after, id] } }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center pt-6 sm:pt-8">
          <Button
            type="button"
            onClick={pushItem}
            disabled={!selectedUser || !currentItem.name || addingItem}
            size="lg"
            className="min-w-[200px] min-h-[48px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-base px-8 py-3"
          >
            {addingItem ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Adding Item...
              </span>
            ) : !selectedUser ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Select a donor to add items
              </span>
            ) : !currentItem.name ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Enter a name
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item to List
              </span>
            )}
          </Button>
        </div>
      </section>

      <section className="space-y-6 sm:space-y-8">
        <h2 className="font-semibold text-lg sm:text-xl flex items-center gap-2">Pending Items <span className="text-xs sm:text-sm font-normal text-muted-foreground">({items.length})</span></h2>
        {items.length === 0 && <p className="text-sm sm:text-base text-muted-foreground">No items yet.</p>}
        <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 auto-rows-fr">
          {items.map(item => (
            <div key={item.tempId} className="border rounded-lg bg-card min-w-0 flex flex-col shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
              {/* Header Section */}
              <div className="p-4 pb-3 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <h3 className="font-semibold text-base truncate leading-tight" title={item.name}>{item.name}</h3>
                    <p className="text-xs text-muted-foreground truncate" title={`Donor: ${item.donorName}`}>
                      <span className="font-medium">Donor:</span> {item.donorName}
                    </p>
                  </div>
                  {item.serverId && (
                    <Badge variant="default" className="text-[10px] bg-green-100 text-green-700 border-green-200 px-2 py-1 h-auto flex-shrink-0 font-medium">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Saved
                    </Badge>
                  )}
                </div>

                {/* Enhanced Status Indicators */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wide px-2.5 py-1 h-auto font-medium flex-shrink-0 border-2 ${item.condition === 'new' ? 'border-green-400 text-green-700 bg-green-50/80' :
                      item.condition === 'good' ? 'border-blue-400 text-blue-700 bg-blue-50/80' :
                        item.condition === 'repairable' ? 'border-yellow-400 text-yellow-700 bg-yellow-50/80' :
                          item.condition === 'scrap' ? 'border-red-400 text-red-700 bg-red-50/80' :
                            'border-gray-400 text-gray-700 bg-gray-50/80'
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.condition === 'new' ? 'bg-green-500' :
                      item.condition === 'good' ? 'bg-blue-500' :
                        item.condition === 'repairable' ? 'bg-yellow-500' :
                          item.condition === 'scrap' ? 'bg-red-500' :
                            'bg-gray-500'
                      }`}></div>
                    {item.condition}
                  </Badge>

                  {item.marketplace.listed && (
                    <Badge
                      variant="default"
                      className="text-[10px] bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-2 border-emerald-300 px-2.5 py-1 h-auto font-semibold shadow-sm flex-shrink-0"
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="font-bold">₹{item.marketplace.demandedPrice || 'TBD'}</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Enhanced Image Grid */}
              <div className="px-4 pb-3 flex-1 min-h-0">
                <div className="grid grid-cols-3 gap-2.5 h-full">
                  {/* Before images with improved aspect ratio */}
                  {item.photos.before.slice(0, 2).map((b, i) => (
                    <div key={`b-${i}`} className="aspect-square min-w-0 relative group">
                      <ClickableImage
                        src={b}
                        className="w-full h-full object-cover rounded-lg border-2 border-border/40 hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md"
                        alt="before"
                        caption={`${item.name} - Before photo ${i + 1}`}
                        transform={{ width: 150, height: 150, crop: 'fill' }}
                      />
                      <div className="absolute top-1 left-1 bg-blue-500/90 text-white text-[8px] px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        BEFORE
                      </div>
                    </div>
                  ))}

                  {/* After images with improved aspect ratio */}
                  {item.photos.after.slice(0, 1).map((a, i) => (
                    <div key={`a-${i}`} className="aspect-square min-w-0 relative group">
                      <ClickableImage
                        src={a}
                        className="w-full h-full object-cover rounded-lg border-2 border-border/40 hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md"
                        alt="after"
                        caption={`${item.name} - After photo ${i + 1}`}
                        transform={{ width: 150, height: 150, crop: 'fill' }}
                      />
                      <div className="absolute top-1 left-1 bg-green-500/90 text-white text-[8px] px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        AFTER
                      </div>
                    </div>
                  ))}

                  {/* Enhanced additional images indicator */}
                  {(item.photos.before.length + item.photos.after.length) > 3 && (
                    <div className="aspect-square bg-gradient-to-br from-muted/40 to-muted/60 rounded-lg border-2 border-dashed border-muted-foreground/40 flex flex-col items-center justify-center min-w-0 hover:from-muted/60 hover:to-muted/80 transition-all duration-200">
                      <span className="text-sm font-bold text-muted-foreground">
                        +{(item.photos.before.length + item.photos.after.length) - 3}
                      </span>
                      <span className="text-[8px] xt-muted-foreground/80 font-medium">
                        MORE
                      </span>
                    </div>
                  )}

                  {/* Fill empty slots with placeholder if less than 3 images */}
                  {Array.from({ length: Math.max(0, 3 - (item.photos.before.length + item.photos.after.length)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center min-w-0">
                      <svg className="w-6 h-6 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Barcode Section */}
              <div className="border-t border-border/50 bg-gradient-to-b from-muted/20 to-muted/40 px-4 py-3 mt-auto">
                <div className="flex flex-col items-center gap-2.5">
                  {/* Improved barcode container */}
                  <div className="w-full bg-white rounded-lg px-3 py-2 shadow-sm border border-border/30 flex justify-center items-center min-h-[40px]">
                    <div className="max-w-full overflow-hidden">
                      <Barcode
                        value={item.serverId || item.tempId}
                        format="CODE128"
                        width={1.2}
                        height={28}
                        fontSize={7}
                        margin={0}
                        displayValue={false}
                        background="transparent"
                      />
                    </div>
                  </div>

                  {/* Enhanced status indicator */}
                  <div className="flex items-center justify-center gap-2 w-full">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${item.serverId ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                      }`}></div>
                    <p className="text-[10px] text-muted-foreground text-center font-mono truncate flex-1">
                      <span className="font-semibold">
                        {item.serverId ? 'SAVED' : 'TEMP'}
                      </span>
                      <span className="mx-1">•</span>
                      <span className="opacity-75">
                        {(item.serverId || item.tempId).slice(-8).toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center pt-6 sm:pt-8">
          <Button
            type="button"
            onClick={openConfirm}
            disabled={finalizing || items.length === 0 || !selectedUser}
            size="lg"
            variant={items.length > 0 && selectedUser ? "default" : "secondary"}
            className="min-w-[200px] min-h-[48px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-base px-8 py-3"
          >
            {finalizing ? (
              <span className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Submitting…
              </span>
            ) : (!selectedUser ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Select a donor to continue
              </span>
            ) : (items.length === 0 ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add at least 1 item
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H9.5a2 2 0 00-2 2v4a2 2 0 002 2h2m2-4h4m-4 0a1 1 0 11-2 0 1 1 0 012 0zm-4-3V9a2 2 0 012-2h4a2 2 0 012 2v2.5" />
                </svg>
                Finalize & Print
              </span>
            )))}
          </Button>
        </div>
        {confirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setConfirmOpen(false);
                setSubmitError(null);
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <div className="bg-background border border-border rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-lg space-y-4 sm:space-y-6 lg:space-y-8 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 min-w-0 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 id="confirm-modal-title" className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground">Confirm Finalization</h3>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  You're about to save <span className="font-semibold text-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span> for donor <span className="font-semibold text-foreground">{selectedUserDetails?.name}</span>. After saving, you'll be redirected to a printable barcode page.
                </p>

                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-destructive flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-sm text-destructive font-medium">Error</p>
                    </div>
                    <p className="text-sm text-destructive mt-1">{submitError}</p>
                  </div>
                )}

                <div className="bg-muted/30 rounded-lg p-3 sm:p-4 lg:p-6">
                  <h4 className="text-sm sm:text-base font-medium text-foreground mb-2 sm:mb-3 lg:mb-4">Items to be saved:</h4>
                  <ul className="text-sm max-h-32 sm:max-h-40 overflow-auto space-y-1 sm:space-y-2">
                    {items.map(i => (
                      <li key={i.tempId} className="flex items-center justify-between py-1.5 sm:py-2 gap-2 sm:gap-3 min-w-0 border-b border-border/30 last:border-b-0">
                        <span className="text-foreground truncate flex-1 text-sm">{i.name}</span>
                        {i.marketplace.listed && (
                          <span className="text-green-600 font-medium text-xs bg-green-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex-shrink-0">
                            ₹{i.marketplace.demandedPrice || 'TBD'}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 lg:gap-4 pt-3 sm:pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    setSubmitError(null);
                  }}
                  disabled={finalizing}
                  className="min-w-0 sm:min-w-[120px] w-full sm:w-auto min-h-[44px] sm:min-h-[48px] text-sm sm:text-base font-medium touch-manipulation"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={submitAll}
                  disabled={finalizing}
                  className="min-w-0 sm:min-w-[160px] w-full sm:w-auto min-h-[44px] sm:min-h-[48px] text-sm sm:text-base font-medium touch-manipulation"
                >
                  {finalizing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm & Save
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default function Page() {
  return (
    <DonationErrorBoundary>
      <Suspense fallback={
        <div className="py-6 sm:py-8 lg:py-12 min-h-screen flex items-center justify-center">
          <Card className="p-8 text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading donation intake...</p>
          </Card>
        </div>
      }>
        <div className="py-6 sm:py-8 lg:py-12 min-h-screen">
          <DonationListManager />
        </div>
      </Suspense>
    </DonationErrorBoundary>
  )
}
