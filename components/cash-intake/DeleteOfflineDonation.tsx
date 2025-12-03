"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteOfflineDonationProps {
  open: boolean;
  donation: any | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteOfflineDonation({
  open,
  donation,
  onClose,
  onDeleted
}: DeleteOfflineDonationProps) {

  const handleDelete = async () => {
    if (!donation?._id) {
      toast.error("Donation ID missing");
      return;
    }

    try {
      const res = await fetch(`/api/cash-intake/delete/${donation._id}`, {
        method: "PUT",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete.");
        return;
      }

      toast.success("Donation deleted successfully!");
      onDeleted();
      onClose();

    } catch (err) {
      toast.error("Unexpected error deleting donation");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Donation?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete Donation?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 text-white" onClick={handleDelete}>
            Yes, Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
