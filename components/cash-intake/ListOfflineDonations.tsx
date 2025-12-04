"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, DollarSign, List, Download, Pencil, MoreVertical, Trash, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { exportToCSV } from "@/utils/csvExported";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import EditOfflineDonation from "./EditDonations";
import DeleteOfflineDonation from "./DeleteOfflineDonation";

interface Permissions {
  canToggleDeleted: boolean;
  canDeleteIcon: boolean;
}

export default function ListOfflineDonation({ permissions }: { permissions: Permissions }) {
  const [donations, setDonations] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const [limit, setLimit] = useState(25);
  const [editingDonation, setEditingDonation] = useState(null);
  const [deletingDonation, setDeletingDonation] = useState(null);
  const { canToggleDeleted, canDeleteIcon } = permissions;
  const [showDeleted, setShowDeleted] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true);
      const res = await fetch(`/api/cash-intake/list?showDeleted=${showDeleted}`);
      const data = await res.json();
      setDonations(data.donations);
      setLoading(false);
      setRole(data.role)
    };

    fetchDonations();
  }, [showDeleted]);

  const filtered = donations.filter((d) => {
    const s = search.toLowerCase();

    return (
      d.donorName.toLowerCase().includes(s) ||
      (d.collectedBy?.name || "").toLowerCase().includes(s) ||
      (d.notes || "").toLowerCase().includes(s) ||
      (d.donorNumber?.toString() || "").includes(s)
    );
  });

  const refreshDonations = async () => {
    try {
      const res = await fetch(`/api/cash-intake/list?showDeleted=${showDeleted}`);
      const data = await res.json();
      if (data.success) {
        setDonations(data.donations);
      }
    } catch (err) {
      console.error("Failed to refresh donations", err);
    }
  };

  if (role === null || role === undefined) {
    return null
  }
  return (

    <div className="w-full max-w-6xl mx-auto mb-6 flex flex-col gap-4" >
      <div className="flex gap-4">

        <Card className="flex-1">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Donations</p>
              <p className="text-3xl font-bold">
                ₹ {filtered.reduce((sum, d) => sum + Number(d.amount || 0), 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8" />
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-3xl font-bold">
                {filtered.length}
              </p>
            </div>
            <List className="w-8 h-8" />
          </CardContent>
        </Card>
      </div>

      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-2xl font-bold">Offline Donations</CardTitle>

            {canToggleDeleted && (
              <div className="flex items-center gap-3">
                <Label className="flex items-center gap-1 cursor-pointer">
                  {showDeleted ? <EyeOff size={18} /> : <Eye size={18} />}
                  <span>Show Deleted</span>
                </Label>

                <Switch
                  checked={showDeleted}
                  onCheckedChange={setShowDeleted}
                />
              </div>
            )}

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border rounded-md px-2 py-1 text-sm"
            >
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={filtered.length}>All</option>
            </select>
          </div>

          <div className="flex gap-2">
            {role !== "auditor" && (
              <Button
                onClick={() => router.push("/cash-intake")}
              >Add Donation <Plus className="w-4 h-4 ml-2" /></Button>)}

            <Button
              variant="secondary"
              onClick={() => {
                const rows = filtered.map((d, i) => ({
                  index: i + 1,
                  donorName: d.donorName || "-",
                  amount: d.amount || 0,
                  collectedBy: d.collectedBy?.name || "-",
                  receivedAt: new Date(d.receivedAt).toLocaleDateString(),
                  notes: d.notes || "-",
                }));

                exportToCSV("offline-donations", rows);
              }}
            >
              Export CSV <Download className="w-4 h-4 ml-2" />
            </Button>
          </div>

        </CardHeader>

        <CardContent className="space-y-6">
          <Input
            placeholder="Search donor, collector, notes, number..."
            className="max-w-sm"
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground">No matching donations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr</TableHead>
                  <TableHead>Donor Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Phone No</TableHead>
                  {role !== "auditor" && (
                    <TableHead>Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.slice(0, limit).map((d, i) => (
                  <TableRow key={d._id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{d.donorName}</TableCell>
                    <TableCell className="font-semibold text-green-700">
                      ₹{d.amount}
                    </TableCell>
                    <TableCell>{d.collectedBy?.name || "-"}</TableCell>
                    <TableCell>
                      {new Date(d.receivedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div
                        className={
                          d.notes?.length > 35
                            ? `cursor-pointer break-words break-all ${expanded === i ? "whitespace-normal" : "truncate"
                            }`
                            : "whitespace-normal break-words break-all"
                        }
                        onClick={() => {
                          if (d.notes?.length <= 35) return;
                          setExpanded(expanded === i ? null : i);
                        }}
                      >
                        {d.notes || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{d.donorNumber || "-"}</TableCell>

                    <TableCell className="text-left">


                      {role !== "auditor" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" className="w-32">

                            {(role === "admin" || role === "moderator" ||
                              (role === "accountant" && d.createdBy === "accountant")) && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setEditingDonation({ ...d, _id: d._id.toString() })
                                  }
                                  className="flex items-center gap-2"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}

                            {(role === "admin" || role === "moderator") && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setDeletingDonation({ ...d, _id: d._id.toString() })
                                }
                                className="flex items-center gap-2 text-red-600"
                              >
                                <Trash className="w-4 h-4" />
                                Delete
                              </DropdownMenuItem>
                            )}

                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                    </TableCell>
                    <TableCell className="text-center">
                      {canDeleteIcon && !d.isPublic && (
                        <Trash2 className="w-5 h-5 text-red-500" />
                      )}
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
              <EditOfflineDonation
                open={!!editingDonation}
                donation={editingDonation}
                onClose={() => setEditingDonation(null)}
                onUpdated={refreshDonations}
              />
              <DeleteOfflineDonation
                open={!!deletingDonation}
                donation={deletingDonation}
                onClose={() => setDeletingDonation(null)}
                onDeleted={refreshDonations}
              />
            </Table>
          )}
        </CardContent>
      </Card>
    </div >
  );
}
