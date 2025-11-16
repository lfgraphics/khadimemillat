"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { assignOfficer } from "@/actions/sponsorship-actions";
import { UserCheck } from "lucide-react";

interface AssignOfficerFormProps {
  requestId: string;
  officers: Array<{
    _id: string;
    name: string;
    email?: string;
  }>;
  onAssigned?: () => void;
}

export function AssignOfficerForm({ requestId, officers, onAssigned }: AssignOfficerFormProps) {
  const [selectedOfficer, setSelectedOfficer] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedOfficer) {
      toast.error("Please select an officer");
      return;
    }

    setIsAssigning(true);
    try {
      const result = await assignOfficer(requestId, selectedOfficer);
      
      if (result.success) {
        toast.success(`Request assigned to ${result.data?.assignedOfficer || 'officer'}`);
        setSelectedOfficer("");
        onAssigned?.();
      } else {
        toast.error(result.error || "Failed to assign officer");
      }
    } catch (error) {
      toast.error("Failed to assign officer");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select officer" />
        </SelectTrigger>
        <SelectContent>
          {officers.map((officer) => (
            <SelectItem key={officer._id} value={officer._id}>
              {officer.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button 
        onClick={handleAssign} 
        disabled={!selectedOfficer || isAssigning}
        size="sm"
      >
        <UserCheck className="w-4 h-4 mr-2" />
        {isAssigning ? "Assigning..." : "Assign"}
      </Button>
    </div>
  );
}