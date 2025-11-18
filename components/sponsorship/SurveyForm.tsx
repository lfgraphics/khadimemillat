"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { submitSurveyResponse } from "@/actions/sponsorship-actions";
import Link from "next/link";
import PhotoCapture from "./PhotoCapture";
import { FamilyMemberForm } from "./FamilyMemberForm";
import { FamilyPhotoCapture } from "./FamilyPhotoCapture";
import { SurveyPhoto } from "@/types/survey";
import { 
  Save, 
  Send, 
  User, 
  Users, 
  Home, 
  DollarSign,
  Camera,
  FileText,
  MapPin,
  Phone,
  CreditCard,
  Calculator
} from "lucide-react";

// Survey validation schema
const familyMemberSchema = z.object({
  name: z.string().min(2, "Name is required"),
  age: z.number().min(0).max(120),
  religion: z.string().min(1, "Religion is required"),
  relationship: z.string().min(1, "Relationship is required"),
  educationLevel: z.enum(['illiterate', 'primary', 'middle', 'matric', 'intermediate', 'graduate', 'postgraduate', 'other']),
  occupation: z.string().optional(),
  monthlyIncome: z.number().min(0).default(0),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
  healthStatus: z.enum(['healthy', 'chronically_ill', 'disabled', 'elderly']),
  employmentStatus: z.enum(['employed', 'unemployed', 'student', 'retired', 'disabled', 'homemaker']),
  isDependent: z.boolean().default(false),
  hasDisability: z.boolean().default(false),
  disabilityType: z.string().optional(),
  
  // Extended fields
  socialStatus: z.array(z.enum(['widow', 'divorced', 'orphan', 'disabled_head', 'disabled_head_child', 'normal_dependent', 'normal_dependent_child', 'disabled', 'old_generation', 'handicapped_individual'])).default([]),
  disabilityDetails: z.object({
    type: z.enum(['blind', 'deaf', 'dumb', 'limb_loss', 'polio', 'other']).optional(),
    specificDetails: z.string().optional()
  }).optional(),
  certificates: z.boolean().default(false),
  pensionDetails: z.object({
    hasPension: z.boolean().default(false),
    pensionType: z.string().optional(),
    pensionSource: z.string().optional()
  }).optional(),
  daughterStatus: z.object({
    isOver18: z.boolean().optional(),
    maritalStatus: z.enum(['married', 'unmarried']).optional()
  }).optional(),
  educationDetails: z.object({
    attendingSchool: z.boolean().default(false),
    schoolType: z.enum(['government_school', 'government_college', 'private_school', 'private_college', 'madrasa', 'none']).optional(),
    attendingMaktab: z.boolean().default(false)
  }).optional(),
  skillsAndEmployment: z.object({
    technicalSkills: z.string().optional(),
    otherSkills: z.string().optional(),
    employmentDetails: z.string().optional(),
    isUnemployed: z.boolean().optional()
  }).optional(),
  incomeFromOtherSources: z.number().min(0).default(0),
  identityDocuments: z.object({
    aadhaar: z.object({
      number: z.string().optional(),
      needsCorrection: z.boolean().default(false),
      correctionType: z.string().optional(),
      needsNew: z.boolean().default(false)
    }).optional(),
    voterId: z.object({
      number: z.string().optional(),
      needsCorrection: z.boolean().default(false),
      correctionType: z.string().optional(),
      needsNew: z.boolean().default(false)
    }).optional()
  }).optional(),
  bankDetails: z.object({
    bankName: z.string().optional(),
    branchName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional()
  }).optional(),
  photo: z.string().optional(),
  documents: z.array(z.string()).optional()
});

const surveySchema = z.object({
  personalDetails: z.object({
    fullName: z.string().min(2, "Full name is required"),
    fatherName: z.string().min(2, "Father's name is required"),
    aadhaar: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits").optional().or(z.literal("")),
    contactNumber: z.string().min(10, "Valid contact number required"),
    fullAddress: z.string().min(10, "Complete address required"),
    district: z.string().min(2, "District is required"),
    pinCode: z.string().min(4, "Pin code is required"),
    surveyDate: z.date().default(() => new Date()),
    surveyNumber: z.string().min(1, "Survey number is required")
  }),
  familyMembers: z.array(familyMemberSchema).min(1, "At least one family member required"),
  bankDetails: z.array(z.object({
    bankName: z.string().min(1, "Bank name required"),
    branchName: z.string().min(1, "Branch name required"),
    accountNumber: z.string().min(1, "Account number required"),
    ifscCode: z.string().min(1, "IFSC code required")
  })).optional(),
  housingDetails: z.object({
    houseType: z.enum(['owned', 'rented', 'shared', 'hut', 'temporary']),
    roofType: z.enum(['concrete', 'asbestos', 'tin', 'thatch', 'other']),
    wallType: z.enum(['brick', 'mud', 'wood', 'tin', 'other']),
    toiletFacility: z.enum(['private', 'shared', 'public', 'none']),
    waterConnection: z.boolean(),
    electricityConnection: z.boolean(),
    gasConnection: z.boolean(),
    rentAmount: z.number().min(0).optional(),
    housingCondition: z.enum(['good', 'fair', 'poor', 'very_poor']),
    
    // Extended housing details
    utilityBills: z.object({
      electricityBillAmount: z.number().min(0).optional(),
      gasBillAmount: z.number().min(0).optional(),
      waterBillAmount: z.number().min(0).optional()
    }).optional(),
    gasConnectionDetails: z.object({
      hasGasConnection: z.boolean().default(false),
      gasCompany: z.enum(['HP', 'Indane', 'Bharat_Gas', 'Other']).optional(),
      companyName: z.string().optional()
    }).optional(),
    cookingMethod: z.object({
      primary: z.enum(['gas', 'wood', 'kerosene', 'coal', 'electric', 'other']).default('wood'),
      details: z.string().optional()
    }).optional(),
    rationCard: z.object({
      hasRationCard: z.boolean().default(false),
      cardType: z.enum(['white', 'pink', 'yellow', 'other']).optional(),
      needsCorrection: z.boolean().default(false),
      correctionType: z.string().optional()
    }).optional()
  }),
  incomeExpenses: z.object({
    monthlyEarnings: z.object({
      primaryIncome: z.number().min(0),
      secondaryIncome: z.number().min(0),
      otherEarnings: z.number().min(0)
    }),
    monthlyExpenses: z.object({
      rent: z.number().min(0),
      electricityBill: z.number().min(0),
      educationExpenses: z.number().min(0),
      medicalExpenses: z.number().min(0),
      foodExpenses: z.number().min(0),
      otherExpenses: z.number().min(0)
    }),
    otherEarningsSource: z.string().optional()
  }).refine((data) => {
    // If other earnings > 0, source must be provided
    if (data.monthlyEarnings.otherEarnings > 0 && !data.otherEarningsSource?.trim()) {
      return false;
    }
    return true;
  }, {
    message: "Source of other earnings is required when amount is specified",
    path: ["otherEarningsSource"]
  }),
  officerReport: z.object({
    housingConditionNotes: z.string().min(10, "Housing condition notes required"),
    employmentVerification: z.string().min(10, "Employment verification required"),
    neighborReferences: z.string().optional(),
    supportingEvidence: z.string().optional(),
    officerRecommendation: z.string().min(20, "Officer recommendation required"),
    officerScore: z.number().min(0).max(5),
    verificationStatus: z.enum(['verified', 'partially_verified', 'unverified']),
    additionalNotes: z.string().optional()
  })
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SurveyFormProps {
  request: any;
  existingSurvey?: any;
  officerId: string;
}

export function SurveyForm({ request, existingSurvey, officerId }: SurveyFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showGlobalErrors, setShowGlobalErrors] = useState(false);
  const [photos, setPhotos] = useState<SurveyPhoto[]>([]);
  const [surveyStatus, setSurveyStatus] = useState<'draft' | 'submitted' | 'verified'>(
    existingSurvey?.status || 'draft'
  );

  // Make toast and surveyId available globally for photo uploads
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).toast = toast;
      // Set surveyId for photo uploads
      (window as any).currentSurveyId = existingSurvey?.surveyId || `SUR-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
  }, [existingSurvey]);

  // Cleanup function for component unmount
  React.useEffect(() => {
    return () => {
      // Clean up auto-save interval on unmount
      if (typeof window !== 'undefined') {
        const autoSaveInterval = (window as any).surveyAutoSaveInterval;
        if (autoSaveInterval) {
          clearInterval(autoSaveInterval);
          delete (window as any).surveyAutoSaveInterval;
        }
      }
    };
  }, []);
  
  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;
  const draftKey = `survey-draft-${request._id}`;

  // Function to clean up all draft copies
  const cleanupDrafts = async () => {
    try {
      // 1. Clear localStorage draft
      localStorage.removeItem(draftKey);
      
      // 2. Delete database draft (if it exists as a separate document)
      // This will be handled by the backend when we submit the survey
      // The backend should update existing drafts to 'submitted' status
      
      // 3. Clear any auto-save timers
      if (typeof window !== 'undefined') {
        const autoSaveInterval = (window as any).surveyAutoSaveInterval;
        if (autoSaveInterval) {
          clearInterval(autoSaveInterval);
          delete (window as any).surveyAutoSaveInterval;
        }
      }
      
      // 4. Clear last saved timestamp
      setLastSavedAt(null);
      
      console.log('Draft cleanup completed successfully');
    } catch (error) {
      console.error('Error during draft cleanup:', error);
      // Don't fail the submission if cleanup fails
    }
  };

  const form = useForm({
    resolver: zodResolver(surveySchema) as any,
    defaultValues: existingSurvey ? {
      personalDetails: {
        ...existingSurvey.personalDetails,
        surveyDate: existingSurvey.personalDetails?.surveyDate ? new Date(existingSurvey.personalDetails.surveyDate) : new Date()
      },
      familyMembers: existingSurvey.familyMembers,
      bankDetails: existingSurvey.bankDetails || [],
      housingDetails: existingSurvey.housingDetails,
      incomeExpenses: existingSurvey.incomeExpenses,
      officerReport: existingSurvey.officerReport
    } : {
      personalDetails: {
        fullName: request.applicantName,
        fatherName: request.fatherName,
        aadhaar: "", // Will be collected during survey (optional)
        contactNumber: request.contactInfo.phone,
        fullAddress: request.fullAddress,
        district: "", // Will be collected during survey
        pinCode: "",
        surveyDate: new Date(),
        surveyNumber: `SUR-${Date.now()}`
      },
      familyMembers: [{
        name: request.applicantName,
        age: 30,
        religion: "Islam",
        relationship: "self",
        educationLevel: "primary",
        occupation: "",
        monthlyIncome: 0,
        maritalStatus: "single",
        healthStatus: "healthy",
        employmentStatus: "unemployed",
        isDependent: false,
        hasDisability: false,
        socialStatus: [],
        certificates: false,
        incomeFromOtherSources: 0
      }],
      bankDetails: [],
      housingDetails: {
        houseType: "owned",
        roofType: "concrete",
        wallType: "brick",
        toiletFacility: "private",
        waterConnection: false,
        electricityConnection: false,
        gasConnection: false,
        housingCondition: "fair",
        utilityBills: {
          electricityBillAmount: 0,
          gasBillAmount: 0,
          waterBillAmount: 0
        },
        gasConnectionDetails: {
          hasGasConnection: false
        },
        cookingMethod: {
          primary: "wood"
        },
        rationCard: {
          hasRationCard: false,
          needsCorrection: false
        }
      },
      incomeExpenses: {
        monthlyEarnings: {
          primaryIncome: 0,
          secondaryIncome: 0,
          otherEarnings: 0
        },
        monthlyExpenses: {
          rent: 0,
          electricityBill: 0,
          educationExpenses: 0,
          medicalExpenses: 0,
          foodExpenses: 0,
          otherExpenses: 0
        },
        otherEarningsSource: ""
      },
      officerReport: {
        housingConditionNotes: "",
        employmentVerification: "",
        neighborReferences: "",
        supportingEvidence: "",
        officerRecommendation: "",
        officerScore: 3,
        verificationStatus: "unverified",
        additionalNotes: ""
      }
    }
  });

  // Ensure all required fields are properly set
  useEffect(() => {
    // Fix surveyDate if it's a string
    const personalDetails = form.watch("personalDetails");
    if (personalDetails?.surveyDate && typeof personalDetails.surveyDate === 'string') {
      form.setValue("personalDetails.surveyDate", new Date(personalDetails.surveyDate));
    }
    
    // Ensure all family members have required fields set
    const familyMembers = form.watch("familyMembers") || [];
    let needsUpdate = false;
    
    const updatedMembers = familyMembers.map((member: any) => {
      const updated = { ...member };
      
      // Ensure employment status is set
      if (!updated.employmentStatus) {
        updated.employmentStatus = "unemployed";
        needsUpdate = true;
      }
      
      // Ensure other required fields are set
      if (!updated.educationLevel) {
        updated.educationLevel = "primary";
        needsUpdate = true;
      }
      
      if (!updated.maritalStatus) {
        updated.maritalStatus = "single";
        needsUpdate = true;
      }
      
      if (!updated.healthStatus) {
        updated.healthStatus = "healthy";
        needsUpdate = true;
      }
      
      // Ensure occupation is set (optional but good to have)
      if (!updated.occupation) {
        updated.occupation = "";
        needsUpdate = true;
      }
      
      return updated;
    });
    
    if (needsUpdate) {
      form.setValue("familyMembers", updatedMembers);
    }
  }, [form]);

  // Load draft from localStorage or server on component mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        // First try localStorage
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft);
          
          // Restore form data
          if (draftData.formData) {
            Object.keys(draftData.formData).forEach(key => {
              let value = draftData.formData[key];
              
              // Handle date conversion for surveyDate
              if (key === 'personalDetails' && value?.surveyDate) {
                value = {
                  ...value,
                  surveyDate: new Date(value.surveyDate)
                };
              }
              
              form.setValue(key as any, value);
            });
          }
          
          // Restore current step
          if (draftData.currentStep) {
            setCurrentStep(draftData.currentStep);
          }
          
          // Restore photos (without file objects, just metadata)
          if (draftData.photos) {
            setPhotos(draftData.photos);
          }
          
          // Set last saved timestamp
          if (draftData.savedAt) {
            setLastSavedAt(new Date(draftData.savedAt));
          }
          
          toast.success("Draft loaded successfully!", {
            description: `Restored from ${new Date(draftData.savedAt).toLocaleString()}`
          });
          return;
        }
        
        // If no localStorage draft, try to load from server
        try {
          const response = await fetch(`/api/sponsorship/survey/draft?requestId=${request._id}`);
          if (response.ok) {
            const { draft } = await response.json();
            
            // Restore form data from server draft
            if (draft.personalDetails) {
              const personalDetails = {
                ...draft.personalDetails,
                surveyDate: draft.personalDetails.surveyDate ? new Date(draft.personalDetails.surveyDate) : new Date()
              };
              form.setValue('personalDetails', personalDetails);
            }
            if (draft.familyMembers) form.setValue('familyMembers', draft.familyMembers);
            if (draft.bankDetails) form.setValue('bankDetails', draft.bankDetails);
            if (draft.housingDetails) form.setValue('housingDetails', draft.housingDetails);
            if (draft.incomeExpenses) form.setValue('incomeExpenses', draft.incomeExpenses);
            if (draft.officerReport) form.setValue('officerReport', draft.officerReport);
            
            if (draft.lastSyncedAt) {
              setLastSavedAt(new Date(draft.lastSyncedAt));
            }
            
            toast.success("Server draft loaded successfully!", {
              description: `Restored from ${new Date(draft.lastSyncedAt).toLocaleString()}`
            });
          }
        } catch (serverError) {
          console.log('No server draft found, starting fresh');
        }
        
      } catch (error) {
        console.error('Error loading draft:', error);
        // Clear corrupted draft
        localStorage.removeItem(draftKey);
      }
    };

    loadDraft();
  }, [draftKey, form, request._id]);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = async () => {
      // Only auto-save if there's actual form data and user has interacted
      const formData = form.getValues();
      const hasData = Object.values(formData).some(value => {
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(v => v !== '' && v !== 0 && v !== false);
        }
        return value !== '' && value !== 0 && value !== false;
      });
      
      if (hasData && !isSavingDraft) {
        setIsAutoSaving(true);
        await saveDraft();
        setIsAutoSaving(false);
      }
    };

    // Auto-save every 1 minute
    const autoSaveInterval = setInterval(autoSave, 60000);
    
    // Save on beforeunload (page refresh/close)
    const handleBeforeUnload = () => {
      const formData = form.getValues();
      const draftData = {
        formData,
        currentStep,
        photos: photos.map(photo => ({
          ...photo,
          file: undefined
        })),
        savedAt: new Date().toISOString(),
        requestId: request._id
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(autoSaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentStep, photos, draftKey, form, request._id]);

  const { fields: familyFields, append: appendFamily, remove: removeFamily } = useFieldArray({
    control: form.control,
    name: "familyMembers"
  });

  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({
    control: form.control,
    name: "bankDetails"
  });

  // Auto-calculation functions
  const calculateFamilyIncomes = () => {
    const familyMembers = form.watch("familyMembers") || [];
    
    const primaryIncome = familyMembers.reduce((total: number, member: any) => 
      total + (member.monthlyIncome || 0), 0
    );
    
    const secondaryIncome = familyMembers.reduce((total: number, member: any) => 
      total + (member.incomeFromOtherSources || 0), 0
    );
    
    return { primaryIncome, secondaryIncome };
  };

  const calculateHousingExpenses = () => {
    const housingDetails = form.watch("housingDetails");
    
    const rent = housingDetails?.rentAmount || 0;
    const electricity = housingDetails?.utilityBills?.electricityBillAmount || 0;
    const gas = housingDetails?.utilityBills?.gasBillAmount || 0;
    const water = housingDetails?.utilityBills?.waterBillAmount || 0;
    
    return { rent, electricity, gas, water };
  };

  // Real-time calculation functions (avoiding double counting)
  const calculateTotalIncome = () => {
    const familyMembers = form.watch("familyMembers") || [];
    const otherEarnings = form.watch("incomeExpenses.monthlyEarnings.otherEarnings") || 0;
    
    // Calculate from source data (family members) + manual other earnings
    const familyPrimaryIncome = familyMembers.reduce((total: number, member: any) => 
      total + (member.monthlyIncome || 0), 0
    );
    
    const familySecondaryIncome = familyMembers.reduce((total: number, member: any) => 
      total + (member.incomeFromOtherSources || 0), 0
    );
    
    return familyPrimaryIncome + familySecondaryIncome + otherEarnings;
  };

  const calculateTotalExpenses = () => {
    const housingDetails = form.watch("housingDetails");
    const incomeExpenses = form.watch("incomeExpenses.monthlyExpenses");
    
    // Housing-related expenses (from housing section)
    const rent = housingDetails?.rentAmount || 0;
    const utilityBills = (housingDetails?.utilityBills?.electricityBillAmount || 0) +
                        (housingDetails?.utilityBills?.gasBillAmount || 0) +
                        (housingDetails?.utilityBills?.waterBillAmount || 0);
    
    // Manual expenses (from income & expenses section)
    const manualExpenses = (incomeExpenses?.educationExpenses || 0) +
                          (incomeExpenses?.medicalExpenses || 0) +
                          (incomeExpenses?.foodExpenses || 0) +
                          (incomeExpenses?.otherExpenses || 0);
    
    return rent + utilityBills + manualExpenses;
  };

  // Auto-populate income and expenses when step 4 is reached
  const autoPopulateIncomeExpenses = () => {
    const { primaryIncome, secondaryIncome } = calculateFamilyIncomes();
    const { rent, electricity } = calculateHousingExpenses();
    
    // Set calculated values for display purposes only
    // These are readonly fields and won't be included in the final calculation
    form.setValue("incomeExpenses.monthlyEarnings.primaryIncome", primaryIncome);
    form.setValue("incomeExpenses.monthlyEarnings.secondaryIncome", secondaryIncome);
    form.setValue("incomeExpenses.monthlyExpenses.rent", rent);
    form.setValue("incomeExpenses.monthlyExpenses.electricityBill", electricity);
    
    // Show a toast to explain what happened
    toast.info("Income and expense fields auto-populated", {
      description: "Values calculated from family and housing data. Total calculation uses source data to avoid double counting.",
      duration: 4000
    });
  };

  const handleSubmit = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    try {
      // Check if all photos are uploaded (no blob URLs or uploading flag)
      const uploadingPhotos = photos.filter(photo => photo.uploading);
      const blobPhotos = photos.filter(photo => photo.url.startsWith('blob:'));
      const hasLocalPhotos = uploadingPhotos.length > 0 || blobPhotos.length > 0;
      
      if (hasLocalPhotos) {
        toast.error(`Please wait for all photos to finish uploading before submitting. (${uploadingPhotos.length + blobPhotos.length} photos still uploading)`);
        setIsSubmitting(false);
        return;
      }

      const result = await submitSurveyResponse(request._id, {
        ...data,
        photos
      });

      if (result.success) {
        // Clean up all draft copies to reduce data redundancy
        await cleanupDrafts();
        setSurveyStatus('submitted');
        
        toast.success("Survey submitted successfully! You can still edit it until it's verified.");
        // Don't redirect immediately, allow editing
        setTimeout(() => {
          window.location.href = "/surveyor";
        }, 3000);
      } else {
        toast.error(result.error || "Failed to submit survey");
      }
    } catch (error) {
      console.error("Survey submission error:", error);
      toast.error("Failed to submit survey");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDraft = async () => {
    setIsSavingDraft(true);
    
    try {
      const formData = form.getValues();
      const draftData = {
        formData,
        currentStep,
        photos: photos.map(photo => ({
          ...photo,
          file: undefined // Don't save file objects to localStorage
        })),
        savedAt: new Date().toISOString(),
        requestId: request._id
      };
      
      // Save to localStorage for immediate persistence
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      
      // Also save to database for cross-device access
      try {
        const response = await fetch('/api/sponsorship/survey/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId: request._id,
            draftData: {
              ...draftData,
              photos: undefined // Don't save photos to database draft
            }
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save draft to server');
        }
      } catch (serverError) {
        console.warn('Failed to save draft to server, but saved locally:', serverError);
      }
      
      setLastSavedAt(new Date());
      
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error("Failed to save draft", {
        description: "Please try again or continue without saving."
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const nextStep = async () => {
    setIsValidating(true);
    
    try {
      const fieldsToValidate = getFieldsForStep(currentStep);
      
      // Force a small delay to ensure form values are properly registered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const isValid = await form.trigger(fieldsToValidate as any);
      
      if (isValid) {
        const nextStepNumber = Math.min(currentStep + 1, totalSteps);
        setCurrentStep(nextStepNumber);
        
        // Auto-populate income and expenses when reaching step 4
        if (nextStepNumber === 4) {
          autoPopulateIncomeExpenses();
        }
        
        toast.success(`${getStepName(currentStep)} completed successfully!`);
      } else {
        // Show validation errors and toast
        const errors = form.formState.errors;
        const stepName = getStepName(currentStep);
        
        // Get specific error messages
        const errorMessages = getValidationErrorMessages(errors, currentStep);
        
        const errorDetails = getDetailedErrorAnalysis(errors, currentStep);
        
        if (errorDetails.length > 0) {
          const criticalErrors = errorDetails.filter(e => e.severity === 'error');
          const warnings = errorDetails.filter(e => e.severity === 'warning');
          
          if (criticalErrors.length > 0) {
            toast.error(`${criticalErrors.length} error${criticalErrors.length > 1 ? 's' : ''} found in ${stepName}`, {
              description: criticalErrors.slice(0, 2).map(e => `• ${e.field}: ${e.message}`).join('\n') + 
                          (criticalErrors.length > 2 ? `\n• And ${criticalErrors.length - 2} more errors...` : ''),
              duration: 8000
            });
          }
          
          if (warnings.length > 0) {
            toast.warning(`${warnings.length} warning${warnings.length > 1 ? 's' : ''} in ${stepName}`, {
              description: warnings.slice(0, 2).map(e => `• ${e.field}: ${e.message}`).join('\n'),
              duration: 5000
            });
          }
        } else {
          toast.error(`Please complete all required fields in ${stepName} before proceeding.`, {
            description: 'Check the form above for any missing or invalid information.',
            duration: 5000
          });
        }
        
        // Scroll to first error field
        scrollToFirstError();
        
        // Add shake animation to the form
        const formElement = document.querySelector('[data-step-content]');
        if (formElement) {
          formElement.classList.add('animate-pulse');
          setTimeout(() => {
            formElement.classList.remove('animate-pulse');
          }, 600);
        }
        
        // Log detailed error information for debugging
        console.group(`🚨 Validation Errors - Step ${currentStep} (${stepName})`);
        errorDetails.forEach((error, index) => {
          const fieldValue = form.getValues(error.path as any);
          console.log(`${index + 1}. ${error.field}:`, {
            message: error.message,
            path: error.path,
            severity: error.severity,
            currentValue: fieldValue,
            valueLength: typeof fieldValue === 'string' ? fieldValue.length : 'N/A',
            valueType: typeof fieldValue
          });
        });
        console.groupEnd();
      }
    } finally {
      setIsValidating(false);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step: number) => {
    switch (step) {
      case 1: return ['personalDetails'];
      case 2: return ['familyMembers'];
      case 3: return ['housingDetails'];
      case 4: return ['incomeExpenses'];
      case 5: return ['officerReport'];
      case 6: 
        // Validate photos based on family member requirements
        const familyMembers = form.watch("familyMembers") || [];
        const photoErrors: string[] = [];
        
        familyMembers.forEach((member: any, index: number) => {
          // Check member photo
          const memberPhotos = photos.filter(p => p.memberIndex === index && p.category === 'member_photo');
          if (memberPhotos.length === 0) {
            photoErrors.push(`${member.name}: Member photo is required`);
          }
          
          // Check certificates if marked as having them
          if (member.certificates) {
            const certificatePhotos = photos.filter(p => p.memberIndex === index && p.category === 'certificate');
            if (certificatePhotos.length === 0) {
              photoErrors.push(`${member.name}: Certificate photos are required`);
            }
          }
          
          // Check identity documents if they need correction or are new
          if (member.identityDocuments?.aadhaar?.needsCorrection || member.identityDocuments?.aadhaar?.needsNew) {
            const aadhaarPhotos = photos.filter(p => p.memberIndex === index && p.documentType === 'aadhaar');
            if (aadhaarPhotos.length === 0) {
              photoErrors.push(`${member.name}: Aadhaar document photo is required`);
            }
          }
          
          if (member.identityDocuments?.voterId?.needsCorrection || member.identityDocuments?.voterId?.needsNew) {
            const voterIdPhotos = photos.filter(p => p.memberIndex === index && p.documentType === 'voterId');
            if (voterIdPhotos.length === 0) {
              photoErrors.push(`${member.name}: Voter ID document photo is required`);
            }
          }
        });
        
        return photoErrors;
      default: return [];
    }
  };

  const getStepName = (step: number) => {
    switch (step) {
      case 1: return 'Personal Details';
      case 2: return 'Family Members';
      case 3: return 'Housing Details';
      case 4: return 'Income & Expenses';
      case 5: return 'Officer Report';
      case 6: return 'Photos & Documentation';
      default: return 'Current Step';
    }
  };

  const getDetailedErrorAnalysis = (errors: any, step: number) => {
    const errorDetails: Array<{
      field: string;
      message: string;
      path: string;
      severity: 'error' | 'warning';
    }> = [];
    
    const addError = (field: string, message: string, path: string, severity: 'error' | 'warning' = 'error') => {
      errorDetails.push({ field, message, path, severity });
    };
    
    switch (step) {
      case 1:
        if (errors.personalDetails?.fullName) {
          addError('Full Name', errors.personalDetails.fullName.message || 'Full name is required', 'personalDetails.fullName');
        }
        if (errors.personalDetails?.fatherName) {
          addError("Father's Name", errors.personalDetails.fatherName.message || "Father's name is required", 'personalDetails.fatherName');
        }
        if (errors.personalDetails?.contactNumber) {
          addError('Contact Number', errors.personalDetails.contactNumber.message || 'Valid contact number is required', 'personalDetails.contactNumber');
        }
        if (errors.personalDetails?.fullAddress) {
          addError('Address', errors.personalDetails.fullAddress.message || 'Complete address is required', 'personalDetails.fullAddress');
        }
        if (errors.personalDetails?.district) {
          addError('District', errors.personalDetails.district.message || 'District is required', 'personalDetails.district');
        }
        if (errors.personalDetails?.pinCode) {
          addError('Pin Code', errors.personalDetails.pinCode.message || 'Pin code is required', 'personalDetails.pinCode');
        }
        if (errors.personalDetails?.aadhaar) {
          addError('Aadhaar Number', errors.personalDetails.aadhaar.message || 'Aadhaar must be 12 digits', 'personalDetails.aadhaar');
        }
        if (errors.personalDetails?.surveyNumber) {
          addError('Survey Number', errors.personalDetails.surveyNumber.message || 'Survey number is required', 'personalDetails.surveyNumber');
        }
        break;
      
      case 2:
        if (errors.familyMembers) {
          const familyErrors = errors.familyMembers;
          if (Array.isArray(familyErrors)) {
            familyErrors.forEach((memberError: any, index: number) => {
              const memberName = form.watch(`familyMembers.${index}.name`) || `Member ${index + 1}`;
              
              if (memberError?.name) {
                addError(`${memberName} - Name`, memberError.name.message || 'Name is required', `familyMembers.${index}.name`);
              }
              if (memberError?.age) {
                addError(`${memberName} - Age`, memberError.age.message || 'Valid age (0-120) is required', `familyMembers.${index}.age`);
              }
              if (memberError?.religion) {
                addError(`${memberName} - Religion`, memberError.religion.message || 'Religion is required', `familyMembers.${index}.religion`);
              }
              if (memberError?.relationship) {
                addError(`${memberName} - Relationship`, memberError.relationship.message || 'Relationship is required', `familyMembers.${index}.relationship`);
              }
              if (memberError?.educationLevel) {
                addError(`${memberName} - Education`, memberError.educationLevel.message || 'Education level is required', `familyMembers.${index}.educationLevel`);
              }
              if (memberError?.maritalStatus) {
                addError(`${memberName} - Marital Status`, memberError.maritalStatus.message || 'Marital status is required', `familyMembers.${index}.maritalStatus`);
              }
              if (memberError?.healthStatus) {
                addError(`${memberName} - Health Status`, memberError.healthStatus.message || 'Health status is required', `familyMembers.${index}.healthStatus`);
              }
              if (memberError?.employmentStatus) {
                addError(`${memberName} - Employment`, memberError.employmentStatus.message || 'Employment status is required', `familyMembers.${index}.employmentStatus`);
              }
              if (memberError?.monthlyIncome) {
                addError(`${memberName} - Income`, memberError.monthlyIncome.message || 'Valid income amount is required', `familyMembers.${index}.monthlyIncome`);
              }
              if (memberError?.incomeFromOtherSources) {
                addError(`${memberName} - Other Income`, memberError.incomeFromOtherSources.message || 'Valid other income amount is required', `familyMembers.${index}.incomeFromOtherSources`);
              }
              
              // Check nested objects
              if (memberError?.disabilityDetails) {
                if (memberError.disabilityDetails.type) {
                  addError(`${memberName} - Disability Type`, 'Disability type is required when disability is marked', `familyMembers.${index}.disabilityDetails.type`);
                }
              }
              
              if (memberError?.identityDocuments?.aadhaar) {
                if (memberError.identityDocuments.aadhaar.number) {
                  addError(`${memberName} - Aadhaar`, 'Invalid Aadhaar number format', `familyMembers.${index}.identityDocuments.aadhaar.number`);
                }
              }
              
              if (memberError?.identityDocuments?.voterId) {
                if (memberError.identityDocuments.voterId.number) {
                  addError(`${memberName} - Voter ID`, 'Invalid Voter ID format', `familyMembers.${index}.identityDocuments.voterId.number`);
                }
              }
            });
          }
          if (familyErrors.message) {
            addError('Family Members', 'At least one family member is required', 'familyMembers');
          }
        }
        break;
      
      case 3:
        if (errors.housingDetails?.houseType) {
          addError('House Type', errors.housingDetails.houseType.message || 'House type is required', 'housingDetails.houseType');
        }
        if (errors.housingDetails?.housingCondition) {
          addError('Housing Condition', errors.housingDetails.housingCondition.message || 'Housing condition is required', 'housingDetails.housingCondition');
        }
        if (errors.housingDetails?.toiletFacility) {
          addError('Toilet Facility', errors.housingDetails.toiletFacility.message || 'Toilet facility information is required', 'housingDetails.toiletFacility');
        }
        if (errors.housingDetails?.roofType) {
          addError('Roof Type', errors.housingDetails.roofType.message || 'Roof type is required', 'housingDetails.roofType');
        }
        if (errors.housingDetails?.wallType) {
          addError('Wall Type', errors.housingDetails.wallType.message || 'Wall type is required', 'housingDetails.wallType');
        }
        if (errors.housingDetails?.rentAmount) {
          addError('Rent Amount', errors.housingDetails.rentAmount.message || 'Valid rent amount is required for rented properties', 'housingDetails.rentAmount');
        }
        
        // Check utility bills
        if (errors.housingDetails?.utilityBills) {
          const utilityErrors = errors.housingDetails.utilityBills;
          if (utilityErrors.electricityBillAmount) {
            addError('Electricity Bill', 'Valid electricity bill amount is required', 'housingDetails.utilityBills.electricityBillAmount');
          }
          if (utilityErrors.gasBillAmount) {
            addError('Gas Bill', 'Valid gas bill amount is required', 'housingDetails.utilityBills.gasBillAmount');
          }
          if (utilityErrors.waterBillAmount) {
            addError('Water Bill', 'Valid water bill amount is required', 'housingDetails.utilityBills.waterBillAmount');
          }
        }
        
        // Check gas connection details
        if (errors.housingDetails?.gasConnectionDetails?.gasCompany) {
          addError('Gas Company', 'Gas company selection is required when gas connection exists', 'housingDetails.gasConnectionDetails.gasCompany');
        }
        
        // Check ration card
        if (errors.housingDetails?.rationCard) {
          const rationErrors = errors.housingDetails.rationCard;
          if (rationErrors.cardType) {
            addError('Ration Card Type', 'Ration card type is required when card exists', 'housingDetails.rationCard.cardType');
          }
          if (rationErrors.correctionType) {
            addError('Correction Details', 'Correction details are required when correction is needed', 'housingDetails.rationCard.correctionType');
          }
        }
        break;
      
      case 4:
        if (errors.incomeExpenses?.otherEarningsSource) {
          addError('Other Earnings Source', errors.incomeExpenses.otherEarningsSource.message || 'Source of other earnings is required when amount is specified', 'incomeExpenses.otherEarningsSource');
        }
        if (errors.incomeExpenses?.monthlyEarnings) {
          const earningsErrors = errors.incomeExpenses.monthlyEarnings;
          if (earningsErrors.primaryIncome) {
            addError('Primary Income', 'Valid primary income amount is required', 'incomeExpenses.monthlyEarnings.primaryIncome');
          }
          if (earningsErrors.secondaryIncome) {
            addError('Secondary Income', 'Valid secondary income amount is required', 'incomeExpenses.monthlyEarnings.secondaryIncome');
          }
          if (earningsErrors.otherEarnings) {
            addError('Other Earnings', 'Valid other earnings amount is required', 'incomeExpenses.monthlyEarnings.otherEarnings');
          }
        }
        if (errors.incomeExpenses?.monthlyExpenses) {
          const expenseErrors = errors.incomeExpenses.monthlyExpenses;
          Object.keys(expenseErrors).forEach(key => {
            if (expenseErrors[key]) {
              const fieldName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              addError(fieldName, `Valid ${fieldName.toLowerCase()} amount is required`, `incomeExpenses.monthlyExpenses.${key}`);
            }
          });
        }
        break;
      
      case 5:
        if (errors.officerReport?.housingConditionNotes) {
          addError('Housing Condition Notes', errors.officerReport.housingConditionNotes.message || 'Housing condition notes are required (minimum 10 characters)', 'officerReport.housingConditionNotes');
        }
        if (errors.officerReport?.employmentVerification) {
          addError('Employment Verification', errors.officerReport.employmentVerification.message || 'Employment verification is required (minimum 10 characters)', 'officerReport.employmentVerification');
        }
        if (errors.officerReport?.officerRecommendation) {
          addError('Officer Recommendation', errors.officerReport.officerRecommendation.message || 'Officer recommendation is required (minimum 20 characters)', 'officerReport.officerRecommendation');
        }
        if (errors.officerReport?.officerScore) {
          addError('Officer Score', errors.officerReport.officerScore.message || 'Officer score is required (0-5)', 'officerReport.officerScore');
        }
        if (errors.officerReport?.verificationStatus) {
          addError('Verification Status', errors.officerReport.verificationStatus.message || 'Verification status is required', 'officerReport.verificationStatus');
        }
        if (errors.officerReport?.neighborReferences) {
          addError('Neighbor References', errors.officerReport.neighborReferences.message || 'Neighbor references have validation issues', 'officerReport.neighborReferences', 'warning');
        }
        if (errors.officerReport?.supportingEvidence) {
          addError('Supporting Evidence', errors.officerReport.supportingEvidence.message || 'Supporting evidence have validation issues', 'officerReport.supportingEvidence', 'warning');
        }
        break;
      
      case 6:
        // Photo validation errors
        const photoValidationErrors = getFieldsForStep(6) as string[];
        photoValidationErrors.forEach(errorMsg => {
          addError('Photo Requirement', errorMsg, 'photos');
        });
        break;
    }
    
    return errorDetails;
  };

  const getValidationErrorMessages = (errors: any, step: number) => {
    const errorDetails = getDetailedErrorAnalysis(errors, step);
    return errorDetails.map(error => `${error.field}: ${error.message}`);
  };

  const getAllFormErrors = () => {
    const allErrors: Array<{
      step: number;
      stepName: string;
      errors: Array<{
        field: string;
        message: string;
        path: string;
        severity: 'error' | 'warning';
      }>;
    }> = [];

    for (let step = 1; step <= totalSteps; step++) {
      const stepErrors = getDetailedErrorAnalysis(form.formState.errors, step);
      if (stepErrors.length > 0) {
        allErrors.push({
          step,
          stepName: getStepName(step),
          errors: stepErrors
        });
      }
    }

    return allErrors;
  };

  const scrollToFirstError = () => {
    // Find the first element with an error class and scroll to it
    setTimeout(() => {
      const errorElement = document.querySelector('.text-red-500, [aria-invalid="true"]');
      if (errorElement) {
        errorElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Focus the input if it's focusable
        const input = errorElement.closest('.space-y-4')?.querySelector('input, textarea, select');
        if (input && 'focus' in input) {
          (input as HTMLElement).focus();
        }
      }
    }, 100);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Details Verification
              </CardTitle>
              {form.formState.errors.personalDetails && Object.keys(form.formState.errors.personalDetails).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                      <span className="text-red-500 text-lg">⚠</span>
                      <span>Please fix the following errors:</span>
                      <Badge variant="destructive" className="text-xs">
                        {getDetailedErrorAnalysis(form.formState.errors, 1).length} errors
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={scrollToFirstError}
                      className="text-xs h-7 px-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Go to first error
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {getDetailedErrorAnalysis(form.formState.errors, 1).map((error, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 bg-white rounded border border-red-200">
                        <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-red-800 text-sm">{error.field}</div>
                          <div className="text-red-600 text-xs mt-0.5">{error.message}</div>
                          <div className="text-red-400 text-xs mt-1 font-mono">Field: {error.path}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const element = document.querySelector(`[name="${error.path}"], #${error.path.split('.').pop()}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              if ('focus' in element) (element as HTMLElement).focus();
                            }
                          }}
                          className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                        >
                          Fix
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hidden fields */}
              <input
                type="hidden"
                {...form.register("personalDetails.surveyDate", {
                  setValueAs: (value) => {
                    if (value instanceof Date) return value;
                    if (typeof value === 'string') return new Date(value);
                    return new Date();
                  }
                })}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    {...form.register("personalDetails.fullName")}
                    className={(form.formState.errors.personalDetails as any)?.fullName ? 'border-red-500 focus:border-red-500' : ''}
                    aria-invalid={(form.formState.errors.personalDetails as any)?.fullName ? 'true' : 'false'}
                  />
                  {(form.formState.errors.personalDetails as any)?.fullName && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <span className="text-red-500">⚠</span>
                      Full name is required
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fatherName">Father's Name *</Label>
                  <Input
                    id="fatherName"
                    {...form.register("personalDetails.fatherName")}
                    className={(form.formState.errors.personalDetails as any)?.fatherName ? 'border-red-500 focus:border-red-500' : ''}
                    aria-invalid={(form.formState.errors.personalDetails as any)?.fatherName ? 'true' : 'false'}
                  />
                  {(form.formState.errors.personalDetails as any)?.fatherName && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <span className="text-red-500">⚠</span>
                      Father's name is required
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="aadhaar">Aadhaar Number (Optional)</Label>
                  <Input
                    id="aadhaar"
                    {...form.register("personalDetails.aadhaar")}
                    placeholder="123456789012"
                    maxLength={12}
                  />
                  {(form.formState.errors.personalDetails as any)?.aadhaar && (
                    <p className="text-sm text-red-500 mt-1">
                      Aadhaar must be 12 digits
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Aadhaar number is optional but helps with verification
                  </p>
                </div>

                <div>
                  <Label htmlFor="contactNumber">Contact Number *</Label>
                  <Input
                    id="contactNumber"
                    {...form.register("personalDetails.contactNumber")}
                    className={(form.formState.errors.personalDetails as any)?.contactNumber ? 'border-red-500 focus:border-red-500' : ''}
                    aria-invalid={(form.formState.errors.personalDetails as any)?.contactNumber ? 'true' : 'false'}
                  />
                  {(form.formState.errors.personalDetails as any)?.contactNumber && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <span className="text-red-500">⚠</span>
                      Valid contact number is required
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="district">District *</Label>
                  <Input
                    id="district"
                    {...form.register("personalDetails.district")}
                  />
                </div>

                <div>
                  <Label htmlFor="pinCode">Pin Code *</Label>
                  <Input
                    id="pinCode"
                    {...form.register("personalDetails.pinCode")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fullAddress">Complete Address *</Label>
                <Textarea
                  id="fullAddress"
                  {...form.register("personalDetails.fullAddress")}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="surveyNumber">Survey Number *</Label>
                <Input
                  id="surveyNumber"
                  {...form.register("personalDetails.surveyNumber")}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Family Members Details
              </CardTitle>
              {form.formState.errors.familyMembers && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                      <span className="text-red-500 text-lg">⚠</span>
                      <span>Please fix the following errors:</span>
                      <Badge variant="destructive" className="text-xs">
                        {getDetailedErrorAnalysis(form.formState.errors, 2).length} errors
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={scrollToFirstError}
                      className="text-xs h-7 px-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Go to first error
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {getDetailedErrorAnalysis(form.formState.errors, 2).map((error, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 bg-white rounded border border-red-200">
                        <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-red-800 text-sm">{error.field}</div>
                          <div className="text-red-600 text-xs mt-0.5">{error.message}</div>
                          <div className="text-red-400 text-xs mt-1 font-mono">Field: {error.path}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const element = document.querySelector(`[name="${error.path}"]`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              if ('focus' in element) (element as HTMLElement).focus();
                            }
                          }}
                          className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                        >
                          Fix
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {familyFields.map((field, index) => (
                <FamilyMemberForm
                  key={field.id}
                  form={form}
                  index={index}
                  onRemove={() => removeFamily(index)}
                  canRemove={familyFields.length > 1}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendFamily({
                  name: "",
                  age: 0,
                  religion: "Islam",
                  relationship: "",
                  educationLevel: "primary",
                  occupation: "",
                  monthlyIncome: 0,
                  maritalStatus: "single",
                  healthStatus: "healthy",
                  employmentStatus: "unemployed",
                  isDependent: false,
                  hasDisability: false,
                  socialStatus: [],
                  certificates: false,
                  incomeFromOtherSources: 0
                })}
                className="w-full"
              >
                Add Family Member
              </Button>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Housing Details
              </CardTitle>
              {form.formState.errors.housingDetails && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                      <span className="text-red-500 text-lg">⚠</span>
                      <span>Please fix the following errors:</span>
                      <Badge variant="destructive" className="text-xs">
                        {getDetailedErrorAnalysis(form.formState.errors, 3).length} errors
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={scrollToFirstError}
                      className="text-xs h-7 px-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Go to first error
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {getDetailedErrorAnalysis(form.formState.errors, 3).map((error, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 bg-white rounded border border-red-200">
                        <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-red-800 text-sm">{error.field}</div>
                          <div className="text-red-600 text-xs mt-0.5">{error.message}</div>
                          <div className="text-red-400 text-xs mt-1 font-mono">Field: {error.path}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const element = document.querySelector(`[name="${error.path}"]`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              if ('focus' in element) (element as HTMLElement).focus();
                            }
                          }}
                          className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                        >
                          Fix
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Housing Information */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>House Type *</Label>
                  <Select
                    value={form.watch("housingDetails.houseType")}
                    onValueChange={(value) => form.setValue("housingDetails.houseType", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owned">Owned</SelectItem>
                      <SelectItem value="rented">Rented</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                      <SelectItem value="hut">Hut</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Housing Condition *</Label>
                  <Select
                    value={form.watch("housingDetails.housingCondition")}
                    onValueChange={(value) => form.setValue("housingDetails.housingCondition", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="very_poor">Very Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Toilet Facility *</Label>
                  <Select
                    value={form.watch("housingDetails.toiletFacility")}
                    onValueChange={(value) => form.setValue("housingDetails.toiletFacility", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Utility Connections */}
              <div className="space-y-4">
                <h4 className="font-medium">Utility Connections</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="waterConnection"
                        checked={form.watch("housingDetails.waterConnection")}
                        onCheckedChange={(checked) => form.setValue("housingDetails.waterConnection", !!checked)}
                      />
                      <Label htmlFor="waterConnection">Water Connection</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="electricityConnection"
                        checked={form.watch("housingDetails.electricityConnection")}
                        onCheckedChange={(checked) => form.setValue("housingDetails.electricityConnection", !!checked)}
                      />
                      <Label htmlFor="electricityConnection">Electricity Connection</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gasConnection"
                        checked={form.watch("housingDetails.gasConnectionDetails.hasGasConnection")}
                        onCheckedChange={(checked) => form.setValue("housingDetails.gasConnectionDetails.hasGasConnection", !!checked)}
                      />
                      <Label htmlFor="gasConnection">Gas Connection</Label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {form.watch("housingDetails.waterConnection") && (
                      <div>
                        <Label>Water Bill Amount (₹/month)</Label>
                        <Input
                          type="number"
                          {...form.register("housingDetails.utilityBills.waterBillAmount", { valueAsNumber: true })}
                          placeholder="Monthly water bill"
                        />
                      </div>
                    )}

                    {form.watch("housingDetails.electricityConnection") && (
                      <div>
                        <Label>Electricity Bill Amount (₹/month)</Label>
                        <Input
                          type="number"
                          {...form.register("housingDetails.utilityBills.electricityBillAmount", { valueAsNumber: true })}
                          placeholder="Monthly electricity bill"
                        />
                      </div>
                    )}

                    {form.watch("housingDetails.gasConnectionDetails.hasGasConnection") && (
                      <div className="space-y-2">
                        <div>
                          <Label>Gas Bill Amount (₹/month)</Label>
                          <Input
                            type="number"
                            {...form.register("housingDetails.utilityBills.gasBillAmount", { valueAsNumber: true })}
                            placeholder="Monthly gas bill"
                          />
                        </div>
                        <div>
                          <Label>Gas Company</Label>
                          <Select
                            value={form.watch("housingDetails.gasConnectionDetails.gasCompany")}
                            onValueChange={(value) => form.setValue("housingDetails.gasConnectionDetails.gasCompany", value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gas company" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HP">HP Gas</SelectItem>
                              <SelectItem value="Indane">Indane Gas</SelectItem>
                              <SelectItem value="Bharat_Gas">Bharat Gas</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {form.watch("housingDetails.gasConnectionDetails.gasCompany") === "Other" && (
                          <div>
                            <Label>Company Name</Label>
                            <Input
                              {...form.register("housingDetails.gasConnectionDetails.companyName")}
                              placeholder="Enter company name"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cooking Method */}
              <div className="space-y-4">
                <h4 className="font-medium">Cooking Method</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Cooking Method</Label>
                    <Select
                      value={form.watch("housingDetails.cookingMethod.primary")}
                      onValueChange={(value) => form.setValue("housingDetails.cookingMethod.primary", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cooking method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gas">Gas</SelectItem>
                        <SelectItem value="wood">Wood</SelectItem>
                        <SelectItem value="kerosene">Kerosene</SelectItem>
                        <SelectItem value="coal">Coal</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Details</Label>
                    <Input
                      {...form.register("housingDetails.cookingMethod.details")}
                      placeholder="Additional cooking method details"
                    />
                  </div>
                </div>
              </div>

              {/* Ration Card */}
              <div className="space-y-4">
                <h4 className="font-medium">Ration Card Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasRationCard"
                      checked={form.watch("housingDetails.rationCard.hasRationCard")}
                      onCheckedChange={(checked) => form.setValue("housingDetails.rationCard.hasRationCard", !!checked)}
                    />
                    <Label htmlFor="hasRationCard">Has Ration Card</Label>
                  </div>

                  {form.watch("housingDetails.rationCard.hasRationCard") && (
                    <div className="ml-6 space-y-3">
                      <div>
                        <Label>Card Type</Label>
                        <Select
                          value={form.watch("housingDetails.rationCard.cardType")}
                          onValueChange={(value) => form.setValue("housingDetails.rationCard.cardType", value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select card type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="white">White Card</SelectItem>
                            <SelectItem value="pink">Pink Card</SelectItem>
                            <SelectItem value="yellow">Yellow Card</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="rationCardCorrection"
                          checked={form.watch("housingDetails.rationCard.needsCorrection")}
                          onCheckedChange={(checked) => form.setValue("housingDetails.rationCard.needsCorrection", !!checked)}
                        />
                        <Label htmlFor="rationCardCorrection">Needs Correction</Label>
                      </div>

                      {form.watch("housingDetails.rationCard.needsCorrection") && (
                        <div>
                          <Label>Correction Type</Label>
                          <Input
                            {...form.register("housingDetails.rationCard.correctionType")}
                            placeholder="Describe what needs correction"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {form.watch("housingDetails.houseType") === "rented" && (
                <div>
                  <Label>Monthly Rent (₹)</Label>
                  <Input
                    type="number"
                    {...form.register("housingDetails.rentAmount", { valueAsNumber: true })}
                    placeholder="Monthly rent amount"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Income & Expenses
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoPopulateIncomeExpenses}
                  className="text-xs"
                >
                  <Calculator className="w-3 h-3 mr-1" />
                  Recalculate
                </Button>
              </div>
              {form.formState.errors.incomeExpenses && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                      <span className="text-red-500 text-lg">⚠</span>
                      <span>Please fix the following errors:</span>
                      <Badge variant="destructive" className="text-xs">
                        {getDetailedErrorAnalysis(form.formState.errors, 4).length} errors
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={scrollToFirstError}
                      className="text-xs h-7 px-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Go to first error
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {getDetailedErrorAnalysis(form.formState.errors, 4).map((error, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 bg-white rounded border border-red-200">
                        <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-red-800 text-sm">{error.field}</div>
                          <div className="text-red-600 text-xs mt-0.5">{error.message}</div>
                          <div className="text-red-400 text-xs mt-1 font-mono">Field: {error.path}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const element = document.querySelector(`[name="${error.path}"]`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              if ('focus' in element) (element as HTMLElement).focus();
                            }
                          }}
                          className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                        >
                          Fix
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Income Summary */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Real-time Calculation Summary
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Income:</span>
                    <div className="font-medium text-green-600">
                      ₹{calculateTotalIncome().toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Family + Other earnings
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Expenses:</span>
                    <div className="font-medium text-red-600">
                      ₹{calculateTotalExpenses().toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Housing + Manual expenses
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Amount:</span>
                    <div className={`font-medium ${
                      (calculateTotalIncome() - calculateTotalExpenses()) >= 0 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{(calculateTotalIncome() - calculateTotalExpenses()).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {calculateTotalIncome() - calculateTotalExpenses() >= 0 ? 'Surplus' : 'Deficit'}
                    </div>
                  </div>
                </div>
                
                {/* Detailed Breakdown */}
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Calculation Breakdown
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-medium text-green-800 mb-2">Income Sources:</div>
                      <div className="space-y-1 text-green-700">
                        <div>• Family Primary Income: ₹{(form.watch("familyMembers") || []).reduce((total: number, member: any) => total + (member.monthlyIncome || 0), 0).toLocaleString()}</div>
                        <div>• Family Other Sources: ₹{(form.watch("familyMembers") || []).reduce((total: number, member: any) => total + (member.incomeFromOtherSources || 0), 0).toLocaleString()}</div>
                        <div>• Additional Earnings: ₹{(form.watch("incomeExpenses.monthlyEarnings.otherEarnings") || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-red-800 mb-2">Expense Sources:</div>
                      <div className="space-y-1 text-red-700">
                        <div>• Housing Rent: ₹{(form.watch("housingDetails.rentAmount") || 0).toLocaleString()}</div>
                        <div>• Utility Bills: ₹{((form.watch("housingDetails.utilityBills.electricityBillAmount") || 0) + (form.watch("housingDetails.utilityBills.gasBillAmount") || 0) + (form.watch("housingDetails.utilityBills.waterBillAmount") || 0)).toLocaleString()}</div>
                        <div>• Education: ₹{(form.watch("incomeExpenses.monthlyExpenses.educationExpenses") || 0).toLocaleString()}</div>
                        <div>• Medical: ₹{(form.watch("incomeExpenses.monthlyExpenses.medicalExpenses") || 0).toLocaleString()}</div>
                        <div>• Food: ₹{(form.watch("incomeExpenses.monthlyExpenses.foodExpenses") || 0).toLocaleString()}</div>
                        <div>• Other: ₹{(form.watch("incomeExpenses.monthlyExpenses.otherExpenses") || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">Monthly Earnings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      Primary Income (₹)
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Display Only</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register("incomeExpenses.monthlyEarnings.primaryIncome", { valueAsNumber: true })}
                      placeholder="0"
                      className="bg-blue-50 border-blue-200"
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Sum of all family member monthly incomes
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      Secondary Income (₹)
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Display Only</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register("incomeExpenses.monthlyEarnings.secondaryIncome", { valueAsNumber: true })}
                      placeholder="0"
                      className="bg-blue-50 border-blue-200"
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Sum of all family member other income sources
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      Other Earnings (₹)
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Included in Total</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register("incomeExpenses.monthlyEarnings.otherEarnings", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Additional income sources not covered above
                    </p>
                  </div>
                </div>
                
                {/* Other Earnings Source Details */}
                {(form.watch("incomeExpenses.monthlyEarnings.otherEarnings") || 0) > 0 && (
                  <div className="mt-4">
                    <Label>Source of Other Earnings *</Label>
                    <Textarea
                      {...form.register("incomeExpenses.otherEarningsSource")}
                      placeholder="Please specify the source of other earnings (e.g., rental income, business profit, government schemes, etc.)"
                      rows={2}
                      className={`mt-1 ${(form.formState.errors.incomeExpenses as any)?.otherEarningsSource ? 'border-red-500 focus:border-red-500' : ''}`}
                      aria-invalid={(form.formState.errors.incomeExpenses as any)?.otherEarningsSource ? 'true' : 'false'}
                    />
                    {(form.formState.errors.incomeExpenses as any)?.otherEarningsSource && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <span className="text-red-500">⚠</span>
                        Source of other earnings is required when amount is specified
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Required when other earnings amount is specified
                    </p>
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Income Source Details</h5>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>• Primary Income: Auto-calculated from family member incomes (display only)</div>
                    <div>• Secondary Income: Auto-calculated from family member other sources (display only)</div>
                    <div>• Other Earnings: Manual entry for additional income sources (included in total)</div>
                    <div className="font-medium mt-2 text-blue-900">Note: Total calculation uses source data to avoid double counting</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">Monthly Expenses</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      Rent (₹)
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Display Only</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register("incomeExpenses.monthlyExpenses.rent", { valueAsNumber: true })}
                      placeholder="0"
                      className="bg-orange-50 border-orange-200"
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      From housing details
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      Electricity (₹)
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Display Only</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register("incomeExpenses.monthlyExpenses.electricityBill", { valueAsNumber: true })}
                      placeholder="0"
                      className="bg-orange-50 border-orange-200"
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      From utility bills in housing
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      Education (₹)
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Included in Total</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register("incomeExpenses.monthlyExpenses.educationExpenses", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      School fees, books, etc.
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      Medical (₹)
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Included in Total</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register("incomeExpenses.monthlyExpenses.medicalExpenses", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Healthcare, medicines, etc.
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      Food (₹)
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Included in Total</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register("incomeExpenses.monthlyExpenses.foodExpenses", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Groceries, meals, etc.
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      Other Expenses (₹)
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Included in Total</span>
                    </Label>
                    <Input
                      type="number"
                      {...form.register("incomeExpenses.monthlyExpenses.otherExpenses", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Transportation, clothing, etc.
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <h5 className="font-medium text-orange-900 mb-2">Expense Calculation Details</h5>
                  <div className="text-sm text-orange-800 space-y-1">
                    <div>• Rent: Auto-filled from housing details (display only)</div>
                    <div>• Electricity: Auto-filled from utility bills (display only)</div>
                    <div>• Gas & Water: Calculated from housing utility bills (not shown here)</div>
                    <div>• Manual expenses: Education, medical, food, other (included in total)</div>
                    <div className="font-medium mt-2 text-orange-900">Note: Total calculation uses source data to avoid double counting</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Officer Report & Verification
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const isValid = await form.trigger('officerReport');
                    toast.info(`Validation ${isValid ? 'passed' : 'failed'}`, {
                      description: `Officer report fields ${isValid ? 'are valid' : 'have errors'}`
                    });
                  }}
                  className="text-xs"
                >
                  Check Validation
                </Button>
              </div>
              {form.formState.errors.officerReport && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-red-800 font-medium">
                      <span className="text-red-500 text-lg">⚠</span>
                      <span>Please fix the following errors:</span>
                      <Badge variant="destructive" className="text-xs">
                        {getDetailedErrorAnalysis(form.formState.errors, 5).length} errors
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={scrollToFirstError}
                      className="text-xs h-7 px-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Go to first error
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {getDetailedErrorAnalysis(form.formState.errors, 5).map((error, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 bg-white rounded border border-red-200">
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          error.severity === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${
                            error.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                          }`}>{error.field}</div>
                          <div className={`text-xs mt-0.5 ${
                            error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                          }`}>{error.message}</div>
                          <div className="text-gray-400 text-xs mt-1 font-mono">Field: {error.path}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const element = document.querySelector(`[name="${error.path}"]`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              if ('focus' in element) (element as HTMLElement).focus();
                            }
                          }}
                          className={`text-xs h-6 px-2 ${
                            error.severity === 'error' 
                              ? 'text-red-600 hover:text-red-700' 
                              : 'text-yellow-600 hover:text-yellow-700'
                          }`}
                        >
                          Fix
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Housing Condition Notes *</Label>
                <Textarea
                  {...form.register("officerReport.housingConditionNotes")}
                  placeholder="Describe the housing condition in detail..."
                  rows={3}
                  className={(form.formState.errors.officerReport as any)?.housingConditionNotes ? 'border-red-500 focus:border-red-500' : ''}
                  aria-invalid={(form.formState.errors.officerReport as any)?.housingConditionNotes ? 'true' : 'false'}
                />
                <div className="flex justify-between items-center mt-1">
                  <div>
                    {(form.formState.errors.officerReport as any)?.housingConditionNotes && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <span className="text-red-500">⚠</span>
                        {(form.formState.errors.officerReport as any).housingConditionNotes.message || 'Housing condition notes are required (minimum 10 characters)'}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className={`${
                      (form.watch("officerReport.housingConditionNotes") || "").length >= 10 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(form.watch("officerReport.housingConditionNotes") || "").length}/10 min
                    </span>
                    {(form.watch("officerReport.housingConditionNotes") || "").length >= 10 && (
                      <span className="text-green-600 ml-1">✓</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Employment Verification *</Label>
                <Textarea
                  {...form.register("officerReport.employmentVerification")}
                  placeholder="Verify employment status and income sources..."
                  rows={3}
                  className={(form.formState.errors.officerReport as any)?.employmentVerification ? 'border-red-500 focus:border-red-500' : ''}
                  aria-invalid={(form.formState.errors.officerReport as any)?.employmentVerification ? 'true' : 'false'}
                />
                <div className="flex justify-between items-center mt-1">
                  <div>
                    {(form.formState.errors.officerReport as any)?.employmentVerification && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <span className="text-red-500">⚠</span>
                        {(form.formState.errors.officerReport as any).employmentVerification.message || 'Employment verification is required (minimum 10 characters)'}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className={`${
                      (form.watch("officerReport.employmentVerification") || "").length >= 10 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(form.watch("officerReport.employmentVerification") || "").length}/10 min
                    </span>
                    {(form.watch("officerReport.employmentVerification") || "").length >= 10 && (
                      <span className="text-green-600 ml-1">✓</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Neighbor References</Label>
                <Textarea
                  {...form.register("officerReport.neighborReferences")}
                  placeholder="Information from neighbors about the family..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Officer Recommendation *</Label>
                <Textarea
                  {...form.register("officerReport.officerRecommendation")}
                  placeholder="Your recommendation for this case..."
                  rows={3}
                  className={(form.formState.errors.officerReport as any)?.officerRecommendation ? 'border-red-500 focus:border-red-500' : ''}
                  aria-invalid={(form.formState.errors.officerReport as any)?.officerRecommendation ? 'true' : 'false'}
                />
                <div className="flex justify-between items-center mt-1">
                  <div>
                    {(form.formState.errors.officerReport as any)?.officerRecommendation && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <span className="text-red-500">⚠</span>
                        {(form.formState.errors.officerReport as any).officerRecommendation.message || 'Officer recommendation is required (minimum 20 characters)'}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className={`${
                      (form.watch("officerReport.officerRecommendation") || "").length >= 20 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(form.watch("officerReport.officerRecommendation") || "").length}/20 min
                    </span>
                    {(form.watch("officerReport.officerRecommendation") || "").length >= 20 && (
                      <span className="text-green-600 ml-1">✓</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Officer Score (0-5) *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    {...form.register("officerReport.officerScore", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label>Verification Status *</Label>
                  <Select
                    value={form.watch("officerReport.verificationStatus")}
                    onValueChange={(value) => form.setValue("officerReport.verificationStatus", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="partially_verified">Partially Verified</SelectItem>
                      <SelectItem value="unverified">Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  {...form.register("officerReport.additionalNotes")}
                  placeholder="Any additional observations or notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <FamilyPhotoCapture
            familyMembers={form.watch("familyMembers") || []}
            photos={photos}
            onPhotosChange={setPhotos}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/surveyor">
                ← Back to Dashboard
              </Link>
            </Button>
            <div>
              <h2 className="text-xl font-semibold">Survey for {request.applicantName}</h2>
              <p className="text-sm text-muted-foreground">Request ID: {request.requestId}</p>
              {existingSurvey && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={existingSurvey.status === 'submitted' ? 'secondary' : 'outline'}>
                    {existingSurvey.status === 'submitted' ? 'Editing Submitted Survey' : 'Editing Draft'}
                  </Badge>
                  {existingSurvey.status === 'submitted' && (
                    <span className="text-xs text-muted-foreground">
                      (Can edit until verified)
                    </span>
                  )}
                </div>
              )}
              {(lastSavedAt || isAutoSaving) && (
                <div className="text-xs flex items-center gap-1 mt-1">
                  {isAutoSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-blue-600">Auto-saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">Auto-saved at {lastSavedAt?.toLocaleTimeString()}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Step {currentStep} of {totalSteps}
            </Badge>
            {getAllFormErrors().length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowGlobalErrors(!showGlobalErrors)}
                className="text-xs border-red-300 text-red-700 hover:bg-red-50"
              >
                <span className="text-red-500 mr-1">⚠</span>
                {getAllFormErrors().reduce((total, step) => total + step.errors.length, 0)} errors
              </Button>
            )}

            {lastSavedAt && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to clear the saved draft? This action cannot be undone.')) {
                    localStorage.removeItem(draftKey);
                    setLastSavedAt(null);
                    toast.success('Draft cleared successfully');
                    window.location.reload();
                  }
                }}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                Clear Draft
              </Button>
            )}
          </div>
        </div>
        
        <Progress value={progress} className="w-full" />
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Personal</span>
          <span>Family</span>
          <span>Housing</span>
          <span>Income</span>
          <span>Report</span>
          <span>Photos</span>
        </div>
      </div>

      {/* Global Error Summary */}
      {showGlobalErrors && getAllFormErrors().length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-red-800 flex items-center gap-2">
              <span className="text-red-500 text-lg">⚠</span>
              Form Validation Summary
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowGlobalErrors(false)}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </Button>
          </div>
          <div className="space-y-4">
            {getAllFormErrors().map((stepError, stepIndex) => (
              <div key={stepIndex} className="bg-white rounded border border-red-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-red-800">
                    Step {stepError.step}: {stepError.stepName}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {stepError.errors.length} errors
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentStep(stepError.step);
                        setShowGlobalErrors(false);
                        setTimeout(scrollToFirstError, 100);
                      }}
                      className="text-xs h-6 px-2 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Go to step
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  {stepError.errors.slice(0, 3).map((error, errorIndex) => (
                    <div key={errorIndex} className="text-sm text-red-600 flex items-center gap-2">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      <span className="font-medium">{error.field}:</span>
                      <span>{error.message}</span>
                    </div>
                  ))}
                  {stepError.errors.length > 3 && (
                    <div className="text-xs text-red-500 ml-3">
                      ... and {stepError.errors.length - 3} more errors
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-6">
        <div data-step-content>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous
              </Button>
            )}
            
            <div className="flex flex-col items-start gap-1">
              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                disabled={isSavingDraft}
                className="min-w-[120px]"
              >
                {isSavingDraft ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
              {lastSavedAt && (
                <p className="text-xs text-muted-foreground">
                  Last saved: {lastSavedAt.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {currentStep < totalSteps ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={isValidating}
                  className="min-w-[100px]"
                >
                  {isValidating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Validating...
                    </>
                  ) : (
                    'Next Step'
                  )}
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Survey
                    </>
                  )}
                </Button>
              )}
            </div>
            {currentStep < totalSteps && (
              <p className="text-xs text-muted-foreground">
                Click to validate and proceed to next step
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}