/**
 * Workflow Validation - Ensures sponsorship flow aligns with documentation
 * Based on app/workflow/page.tsx documentation
 */

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  requiredRole: string[];
  requiredData: string[];
  nextSteps: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface WorkflowValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  currentStep: string;
  completedSteps: string[];
  nextPossibleSteps: string[];
}

// Workflow steps as defined in the documentation
export const WORKFLOW_STEPS: Record<string, WorkflowStep> = {
  // Step 1: Simple Request Submission
  request_submission: {
    id: 'request_submission',
    name: 'Request Submission',
    description: 'Beneficiary submits simple request form with basic information',
    requiredRole: ['user'],
    requiredData: ['applicantName', 'fatherName', 'phone', 'fullAddress', 'reasonForRequest'],
    nextSteps: ['admin_assignment'],
    status: 'pending'
  },

  // Step 2: Admin Assignment
  admin_assignment: {
    id: 'admin_assignment',
    name: 'Admin Assignment',
    description: 'Admin assigns inquiry officer to the request',
    requiredRole: ['admin', 'moderator'],
    requiredData: ['assignedOfficer', 'assignedDate'],
    nextSteps: ['field_survey'],
    status: 'pending'
  },

  // Step 3: Field Survey
  field_survey: {
    id: 'field_survey',
    name: 'Field Survey',
    description: 'Inquiry officer conducts detailed home survey',
    requiredRole: ['inquiry_officer'],
    requiredData: [
      'personalDetails', 'familyMembers', 'housingDetails', 
      'incomeExpenses', 'officerReport', 'photos'
    ],
    nextSteps: ['verification_review'],
    status: 'pending'
  },

  // Step 4: Verification & Review
  verification_review: {
    id: 'verification_review',
    name: 'Verification & Review',
    description: 'Verification officer reviews survey and assigns category',
    requiredRole: ['admin', 'moderator'],
    requiredData: ['calculatedScores', 'category', 'verificationStatus'],
    nextSteps: ['beneficiary_approval'],
    status: 'pending'
  },

  // Step 5: Beneficiary Approval
  beneficiary_approval: {
    id: 'beneficiary_approval',
    name: 'Beneficiary Approval',
    description: 'Final approval and beneficiary card generation',
    requiredRole: ['admin', 'moderator'],
    requiredData: ['beneficiaryCard', 'eligibleFacilities', 'approvedBy'],
    nextSteps: ['sponsorship_matching'],
    status: 'pending'
  },

  // Step 6: Sponsorship Matching
  sponsorship_matching: {
    id: 'sponsorship_matching',
    name: 'Sponsorship Matching',
    description: 'Approved beneficiary available for sponsorship',
    requiredRole: ['user', 'admin'],
    requiredData: ['sponsorshipStatus'],
    nextSteps: [],
    status: 'pending'
  }
};

// Role permissions as defined in documentation
export const ROLE_PERMISSIONS = {
  user: {
    canSubmitRequest: true,
    canViewOwnStatus: true,
    canSponsor: true,
    canAccessSurvey: false,
    canAssignOfficers: false,
    canApprove: false
  },
  inquiry_officer: {
    canSubmitRequest: false,
    canViewOwnStatus: true,
    canSponsor: false,
    canAccessSurvey: true,
    canAssignOfficers: false,
    canApprove: false
  },
  moderator: {
    canSubmitRequest: false,
    canViewOwnStatus: true,
    canSponsor: true,
    canAccessSurvey: true,
    canAssignOfficers: true,
    canApprove: true
  },
  admin: {
    canSubmitRequest: false,
    canViewOwnStatus: true,
    canSponsor: true,
    canAccessSurvey: true,
    canAssignOfficers: true,
    canApprove: true
  }
};

/**
 * Validates if a request follows the proper workflow
 */
export function validateWorkflow(
  request: any,
  survey?: any,
  beneficiaryCard?: any,
  userRole?: string
): WorkflowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const completedSteps: string[] = [];
  let currentStep = 'request_submission';

  // Step 1: Request Submission Validation
  if (request) {
    const step = WORKFLOW_STEPS.request_submission;
    const missingData = step.requiredData.filter(field => {
      if (field === 'applicantName') return !request.applicantName;
      if (field === 'fatherName') return !request.fatherName;
      if (field === 'phone') return !request.contactInfo?.phone;
      if (field === 'fullAddress') return !request.fullAddress;
      if (field === 'reasonForRequest') return !request.basicRequest?.reasonForRequest;
      return false;
    });

    if (missingData.length === 0) {
      completedSteps.push('request_submission');
      currentStep = 'admin_assignment';
    } else {
      errors.push(`Request submission incomplete. Missing: ${missingData.join(', ')}`);
    }
  } else {
    errors.push('No request found');
    return {
      isValid: false,
      errors,
      warnings,
      currentStep,
      completedSteps,
      nextPossibleSteps: []
    };
  }

  // Step 2: Admin Assignment Validation
  if (request.assignedOfficer && request.assignedDate) {
    completedSteps.push('admin_assignment');
    currentStep = 'field_survey';
  } else if (request.status === 'assigned') {
    warnings.push('Request marked as assigned but missing officer or date');
  }

  // Step 3: Field Survey Validation
  if (survey) {
    const step = WORKFLOW_STEPS.field_survey;
    const missingData = step.requiredData.filter(field => {
      if (field === 'personalDetails') return !survey.personalDetails;
      if (field === 'familyMembers') return !survey.familyMembers?.length;
      if (field === 'housingDetails') return !survey.housingDetails;
      if (field === 'incomeExpenses') return !survey.incomeExpenses;
      if (field === 'officerReport') return !survey.officerReport;
      if (field === 'photos') return !survey.photos?.length;
      return false;
    });

    if (missingData.length === 0) {
      completedSteps.push('field_survey');
      currentStep = 'verification_review';
    } else if (survey.status === 'draft') {
      warnings.push(`Survey in progress. Missing: ${missingData.join(', ')}`);
    }
  }

  // Step 4: Verification & Review
  if (survey?.calculatedScores && survey?.status === 'submitted') {
    completedSteps.push('verification_review');
    currentStep = 'beneficiary_approval';
  }

  // Step 5: Beneficiary Approval
  if (beneficiaryCard) {
    completedSteps.push('beneficiary_approval');
    currentStep = 'sponsorship_matching';
  }

  // Role-based validation
  if (userRole) {
    const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
    if (!permissions) {
      errors.push(`Invalid user role: ${userRole}`);
    }
  }

  // Determine next possible steps
  const nextPossibleSteps = WORKFLOW_STEPS[currentStep]?.nextSteps || [];

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    currentStep,
    completedSteps,
    nextPossibleSteps
  };
}

/**
 * Validates role permissions for specific actions
 */
export function validateRolePermission(
  userRole: string,
  action: keyof typeof ROLE_PERMISSIONS.user
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
  return permissions ? permissions[action] : false;
}

/**
 * Gets the workflow status display information
 */
export function getWorkflowStatusDisplay(validation: WorkflowValidation) {
  const stepNames = {
    request_submission: 'Request Submitted',
    admin_assignment: 'Officer Assigned',
    field_survey: 'Survey Completed',
    verification_review: 'Verified',
    beneficiary_approval: 'Approved',
    sponsorship_matching: 'Available for Sponsorship'
  };

  return {
    currentStepName: stepNames[validation.currentStep as keyof typeof stepNames] || 'Unknown',
    completedStepsNames: validation.completedSteps.map(step => 
      stepNames[step as keyof typeof stepNames]
    ),
    progressPercentage: (validation.completedSteps.length / Object.keys(WORKFLOW_STEPS).length) * 100
  };
}