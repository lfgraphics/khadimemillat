"use client";

import React, { useEffect, useState } from 'react';
import { safeJson } from '@/lib/utils';
import SearchableDropDownSelect, { ComboboxOption } from '@/components/searchable-dropdown-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface Donor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  clerkUserId?: string;
  mongoUserId?: string;
}

interface UserSearchAndCreateProps {
  onSelect: (donor: Donor | null) => void;
  initialDonorId?: string;
  className?: string;
  enableCreate?: boolean;
}

export const UserSearchAndCreate: React.FC<UserSearchAndCreateProps> = ({
  onSelect,
  initialDonorId,
  className,
  enableCreate = false,
}) => {
  const [users, setUsers] = useState<Donor[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(initialDonorId || '');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', mobile: '' });
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Debounced search
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const url = new URL('/api/protected/users', window.location.origin);
        if (search.trim()) url.searchParams.set('search', search.trim());
  const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) {
          if (res.status === 403) {
            setUsers([]);
            return;
          }
          throw new Error('Failed to fetch users');
        }
  const json = await safeJson<any>(res);
        if (json.users) {
          const mapped: Donor[] = json.users.map((u: any) => ({
            id: u.id, // Clerk ID primary
            mongoUserId: u.mongoUserId || u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            clerkUserId: u.id,
          }));
          setUsers(mapped);
        }
      } catch (e) { if ((e as any).name !== 'AbortError') console.error(e); }
      finally { setLoadingSearch(false); }
    }, 350);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [search]);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoadingInitial(true);
      try {
        // Upsert current user mapping silently to help donor resolution later
        try { await fetch('/api/protected/users?self=1'); } catch {}
  const res = await fetch('/api/protected/users');
        if (!res.ok) {
          if (res.status === 403) {
            setUsers([]);
          } else {
            throw new Error('Failed to fetch users');
          }
        } else {
          const json = await safeJson<any>(res);
          if (json.users) {
            const mapped: Donor[] = json.users.map((u: any) => ({
              id: u.id, // Clerk ID
              mongoUserId: u.mongoUserId || u._id,
              name: u.name,
              email: u.email,
              phone: u.phone,
              clerkUserId: u.id,
            }));
            setUsers(mapped);
          }
        }
      } catch (e) { console.error(e); } finally { setLoadingInitial(false); }
    })();
  }, []);

  // Emit selection when selectedUserId changes
  useEffect(() => {
    const donor = users.find(u => u.id === selectedUserId || u.mongoUserId === selectedUserId) || null;
    onSelect(donor);
  }, [selectedUserId, users, onSelect]);

  const userOptions: ComboboxOption[] = users.map(u => ({ value: u.id, label: u.name }));

  const handleCreateUser = async () => {
    // Direct creation disabled per Clerk-first. Consider building a Clerk invite flow.
    return;
  };

  const selected = users.find(u => u.mongoUserId === selectedUserId || u.id === selectedUserId);

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block">
            Select Donor
            <span className="text-destructive ml-1" aria-label="required">*</span>
          </label>
          <SearchableDropDownSelect
            options={userOptions}
            value={selectedUserId}
            onChange={v => setSelectedUserId(v)}
            searchTerm={search}
            onSearchTermChange={setSearch}
            placeholder={loadingSearch ? "Searching..." : "Search donor..."}
            width="w-full"
          />
          {loadingSearch && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>Searching users...</span>
            </div>
          )}
          {(!loadingSearch && !loadingInitial && users.length === 0 && !search.trim()) && (
            <p className="text-xs text-muted-foreground">Start typing to search for users.</p>
          )}
          {(!loadingSearch && search.trim() && users.length === 0) && (
            <p className="text-xs text-amber-600">No users found matching "{search}".</p>
          )}
        </div>
        {selected && (
          <div className="mt-3 text-xs border border-border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="font-medium text-foreground mb-2">Selected Donor Details:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><span className="font-medium text-muted-foreground">Name:</span> <span className="text-foreground">{selected.name}</span></div>
              {selected.email && <div><span className="font-medium text-muted-foreground">Email:</span> <span className="text-foreground">{selected.email}</span></div>}
              {selected.phone && <div><span className="font-medium text-muted-foreground">Phone:</span> <span className="text-foreground">{selected.phone}</span></div>}
              {selected.clerkUserId && <div className="col-span-full"><span className="font-medium text-muted-foreground">Clerk ID:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{selected.clerkUserId}</code></div>}
              {selected.mongoUserId && <div className="col-span-full"><span className="font-medium text-muted-foreground">Mongo ID:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{selected.mongoUserId}</code></div>}
            </div>
          </div>
        )}
      </div>
      {enableCreate && (
        <div className="mt-6 border border-border rounded-lg p-4 space-y-4 bg-muted/10">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium text-foreground">Quick Create Donor</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <Input 
                placeholder="Enter full name" 
                value={userForm.name} 
                onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mobile Number</label>
              <Input 
                placeholder="Enter mobile number" 
                value={userForm.mobile} 
                onChange={e => setUserForm(f => ({ ...f, mobile: e.target.value }))}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Action</label>
              <Button 
                type="button" 
                onClick={handleCreateUser} 
                disabled
                className="w-full min-h-[44px] opacity-50 cursor-not-allowed"
              >
                Create User
              </Button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-amber-800">Feature Disabled</p>
                <p className="text-xs text-amber-700 mt-1">Direct user creation is disabled. Please invite users via Clerk. Contact admin if needed.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSearchAndCreate;
