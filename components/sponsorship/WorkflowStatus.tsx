"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { validateWorkflow, getWorkflowStatusDisplay } from "@/lib/workflow-validation";
import {
  CheckCircle2,
  Clock,
  UserCheck,
  FileText,
  XCircle
} from "lucide-react";

interface WorkflowStatusProps {
  status: string;
  priority?: string;
  assignedOfficer?: string;
  className?: string;
  request?: any;
  survey?: any;
  beneficiaryCard?: any;
}

export function WorkflowStatus({ 
  status, 
  priority, 
  assignedOfficer, 
  className, 
  request, 
  survey, 
  beneficiaryCard 
}: WorkflowStatusProps) {
  // Validate workflow compliance
  const validation = validateWorkflow(request, survey, beneficiaryCard);
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        icon: Clock,
        label: "Pending Assignment",
        description: "Waiting for surveyor assignment",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 border-yellow-200"
      },
      assigned: {
        icon: UserCheck,
        label: "Assigned to Surveyor",
        description: "Survey officer assigned, awaiting field visit",
        color: "text-blue-600",
        bgColor: "bg-background border-blue-200"
      },
      surveyed: {
        icon: FileText,
        label: "Survey Completed",
        description: "Field survey completed, awaiting review",
        color: "text-purple-600",
        bgColor: "bg-purple-50 border-purple-200"
      },
      approved: {
        icon: CheckCircle2,
        label: "Approved",
        description: "Beneficiary card generated, eligible for sponsorship",
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200"
      },
      rejected: {
        icon: XCircle,
        label: "Rejected",
        description: "Application rejected after review",
        color: "text-red-600",
        bgColor: "bg-red-50 border-red-200"
      },
      cancelled: {
        icon: XCircle,
        label: "Cancelled",
        description: "Application cancelled by applicant",
        color: "text-gray-600",
        bgColor: "bg-gray-50 border-gray-200"
      }
    };

    return configs[status as keyof typeof configs] || configs.pending;
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      low: { color: "bg-green-100 text-green-800", label: "Low Priority" },
      medium: { color: "bg-yellow-100 text-yellow-800", label: "Medium Priority" },
      high: { color: "bg-orange-100 text-orange-800", label: "High Priority" },
      urgent: { color: "bg-red-100 text-red-800", label: "Urgent" }
    };

    return configs[priority as keyof typeof configs] || configs.medium;
  };

  const statusConfig = getStatusConfig(status);
  const priorityConfig = priority ? getPriorityConfig(priority) : null;
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={`${statusConfig.bgColor} ${className}`}>
      <CardContent className="p-4">
        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-white ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className={`font-medium text-sm ${statusConfig.color}`}>
                  {statusConfig.label}
                </h4>
              </div>
            </div>
            {priorityConfig && (
              <Badge className={`${priorityConfig.color} text-xs px-2 py-1`}>
                {priorityConfig.label.replace(' Priority', '')}
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">
            {statusConfig.description}
          </p>
          
          {assignedOfficer && (
            <p className="text-xs text-muted-foreground mb-3">
              Assigned to: {assignedOfficer}
            </p>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-white ${statusConfig.color}`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className={`font-medium ${statusConfig.color}`}>
                  {statusConfig.label}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {statusConfig.description}
                </p>
                {assignedOfficer && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned to: {assignedOfficer}
                  </p>
                )}
              </div>
            </div>
            
            {priorityConfig && (
              <Badge className={priorityConfig.color}>
                {priorityConfig.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Workflow Progress - Mobile Friendly */}
        <div className="mt-4">
          {/* Mobile: Compact Progress Bar */}
          <div className="md:hidden">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {status === 'pending' && '1/4'}
                {status === 'assigned' && '2/4'}
                {status === 'surveyed' && '3/4'}
                {status === 'approved' && '4/4'}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  status === 'approved' ? 'bg-green-600' :
                  status === 'surveyed' ? 'bg-purple-600' :
                  status === 'assigned' ? 'bg-blue-600' :
                  'bg-yellow-600'
                }`}
                style={{ 
                  width: 
                    status === 'pending' ? '25%' :
                    status === 'assigned' ? '50%' :
                    status === 'surveyed' ? '75%' :
                    status === 'approved' ? '100%' : '0%'
                }}
              />
            </div>
            
            {/* Current Step Indicator */}
            <div className="flex items-center justify-center">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                status === 'approved' ? 'bg-green-100 text-green-800' :
                status === 'surveyed' ? 'bg-purple-100 text-purple-800' :
                status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {status === 'pending' && 'Awaiting Assignment'}
                {status === 'assigned' && 'Survey in Progress'}
                {status === 'surveyed' && 'Under Review'}
                {status === 'approved' && 'Completed'}
              </div>
            </div>
          </div>

          {/* Desktop: Horizontal Steps */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className={`flex items-center gap-1 ${
              ['pending', 'assigned', 'surveyed', 'approved'].includes(status) 
                ? 'text-green-600' 
                : 'text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                ['pending', 'assigned', 'surveyed', 'approved'].includes(status)
                  ? 'bg-green-600'
                  : 'bg-gray-300'
              }`} />
              <span>Submitted</span>
            </div>
            
            <div className={`w-4 h-px ${
              ['assigned', 'surveyed', 'approved'].includes(status)
                ? 'bg-green-600'
                : 'bg-gray-300'
            }`} />
            
            <div className={`flex items-center gap-1 ${
              ['assigned', 'surveyed', 'approved'].includes(status)
                ? 'text-green-600'
                : status === 'pending'
                ? 'text-yellow-600'
                : 'text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                ['assigned', 'surveyed', 'approved'].includes(status)
                  ? 'bg-green-600'
                  : status === 'pending'
                  ? 'bg-yellow-600'
                  : 'bg-gray-300'
              }`} />
              <span>Assigned</span>
            </div>
            
            <div className={`w-4 h-px ${
              ['surveyed', 'approved'].includes(status)
                ? 'bg-green-600'
                : 'bg-gray-300'
            }`} />
            
            <div className={`flex items-center gap-1 ${
              ['surveyed', 'approved'].includes(status)
                ? 'text-green-600'
                : status === 'assigned'
                ? 'text-blue-600'
                : 'text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                ['surveyed', 'approved'].includes(status)
                  ? 'bg-green-600'
                  : status === 'assigned'
                  ? 'bg-blue-600'
                  : 'bg-gray-300'
              }`} />
              <span>Surveyed</span>
            </div>
            
            <div className={`w-4 h-px ${
              status === 'approved' ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            
            <div className={`flex items-center gap-1 ${
              status === 'approved'
                ? 'text-green-600'
                : status === 'surveyed'
                ? 'text-purple-600'
                : 'text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                status === 'approved'
                  ? 'bg-green-600'
                  : status === 'surveyed'
                  ? 'bg-purple-600'
                  : 'bg-gray-300'
              }`} />
              <span>Approved</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}