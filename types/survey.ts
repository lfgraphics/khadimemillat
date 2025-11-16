export interface SurveyPhoto {
  id: string;
  file?: File; // Optional for uploaded photos
  url: string;
  category: 'member_photo' | 'certificate' | 'identity' | 'other_document' | 'housing' | 'documentation' | 'family' | 'other';
  memberIndex?: number;
  documentType?: string;
  description?: string;
  timestamp: Date;
  uploading?: boolean; // For upload progress
  publicId?: string; // Cloudinary public ID
}

export interface FamilyMember {
  name: string;
  age: number;
  religion: string;
  relationship: string;
  educationLevel: string;
  occupation?: string;
  monthlyIncome: number;
  maritalStatus: string;
  healthStatus: string;
  employmentStatus: string;
  isDependent: boolean;
  hasDisability: boolean;
  disabilityType?: string;
  
  // Extended fields
  socialStatus: string[];
  certificates: boolean;
  incomeFromOtherSources: number;
  identityDocuments?: {
    aadhaar?: {
      number?: string;
      needsCorrection: boolean;
      correctionType?: string;
      needsNew: boolean;
    };
    voterId?: {
      number?: string;
      needsCorrection: boolean;
      correctionType?: string;
      needsNew: boolean;
    };
  };
}