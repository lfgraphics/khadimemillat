import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type WorkflowStatus = 'pending' | 'verified' | 'collected' | 'completed' | string;

const COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  collected: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
};

export const StatusBadge: React.FC<{ status: WorkflowStatus; className?: string }> = ({ status, className }) => {
  return (
    <Badge className={cn('capitalize', COLORS[status] || 'bg-gray-100 text-gray-800', className)}>
      {status}
    </Badge>
  );
};

export default StatusBadge;
