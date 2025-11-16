"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Trash2, 
  Camera,
  FileText,
  CreditCard,
  GraduationCap,
  Briefcase,
  Heart,
  Users
} from "lucide-react";

interface FamilyMemberFormProps {
  form: UseFormReturn<any>;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

const socialStatusOptions = [
  { value: 'widow', label: 'Widow (W)' },
  { value: 'divorced', label: 'Divorced (D)' },
  { value: 'orphan', label: 'Orphan (O)' },
  { value: 'disabled_head', label: 'Disabled Head (DH)' },
  { value: 'disabled_head_child', label: 'Disabled Head Child (DHC)' },
  { value: 'normal_dependent', label: 'Normal Dependent (ND)' },
  { value: 'normal_dependent_child', label: 'Normal Dependent Child (NDC)' },
  { value: 'disabled', label: 'Disabled (D)' },
  { value: 'old_generation', label: 'Old Generation (OG)' },
  { value: 'handicapped_individual', label: 'Handicapped Individual (HI)' }
];

const disabilityTypes = [
  { value: 'blind', label: 'Blind' },
  { value: 'deaf', label: 'Deaf' },
  { value: 'dumb', label: 'Dumb' },
  { value: 'limb_loss', label: 'Loss of Limbs' },
  { value: 'polio', label: 'Polio' },
  { value: 'other', label: 'Other' }
];

const limbLossOptions = [
  { value: 'one_leg', label: 'One Leg' },
  { value: 'both_legs', label: 'Both Legs' },
  { value: 'one_hand', label: 'One Hand' },
  { value: 'both_hands', label: 'Both Hands' }
];

export function FamilyMemberForm({ form, index, onRemove, canRemove }: FamilyMemberFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const watchedValues = {
    hasDisability: form.watch(`familyMembers.${index}.hasDisability`),
    socialStatus: form.watch(`familyMembers.${index}.socialStatus`) || [],
    age: form.watch(`familyMembers.${index}.age`),
    relationship: form.watch(`familyMembers.${index}.relationship`),
    disabilityType: form.watch(`familyMembers.${index}.disabilityDetails.type`)
  };

  const handleSocialStatusChange = (status: string, checked: boolean) => {
    const currentStatus = watchedValues.socialStatus;
    if (checked) {
      form.setValue(`familyMembers.${index}.socialStatus`, [...currentStatus, status]);
    } else {
      form.setValue(`familyMembers.${index}.socialStatus`, currentStatus.filter((s: string) => s !== status));
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            Family Member {index + 1}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Basic Info' : 'Detailed Info'}
            </Button>
            {canRemove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {watchedValues.socialStatus.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {watchedValues.socialStatus.map((status: string) => (
              <Badge key={status} variant="secondary" className="text-xs">
                {socialStatusOptions.find(opt => opt.value === status)?.label}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label>Name *</Label>
            <Input
              {...form.register(`familyMembers.${index}.name`)}
              placeholder="Full name"
            />
          </div>

          <div>
            <Label>Age *</Label>
            <Input
              type="number"
              {...form.register(`familyMembers.${index}.age`, { valueAsNumber: true })}
              placeholder="Age"
            />
          </div>

          <div>
            <Label>Religion *</Label>
            <Input
              {...form.register(`familyMembers.${index}.religion`)}
              placeholder="Religion"
            />
          </div>

          <div>
            <Label>Relationship *</Label>
            <Input
              {...form.register(`familyMembers.${index}.relationship`)}
              placeholder="Relationship to applicant"
            />
          </div>

          <div>
            <Label>Monthly Income (₹)</Label>
            <Input
              type="number"
              {...form.register(`familyMembers.${index}.monthlyIncome`, { valueAsNumber: true })}
              placeholder="0"
            />
          </div>

          <div>
            <Label>Income from Other Sources (₹)</Label>
            <Input
              type="number"
              {...form.register(`familyMembers.${index}.incomeFromOtherSources`, { valueAsNumber: true })}
              placeholder="0"
            />
          </div>
        </div>

        {/* Social Status - Multiple Selection */}
        <div>
          <Label className="text-base font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Social Status (Multiple Selection)
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
            {socialStatusOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`social-${index}-${option.value}`}
                  checked={watchedValues.socialStatus.includes(option.value)}
                  onCheckedChange={(checked) => handleSocialStatusChange(option.value, !!checked)}
                />
                <Label htmlFor={`social-${index}-${option.value}`} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Disability Information */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`disability-${index}`}
              checked={watchedValues.hasDisability}
              onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.hasDisability`, !!checked)}
            />
            <Label htmlFor={`disability-${index}`} className="font-medium">Has Disability</Label>
          </div>

          {watchedValues.hasDisability && (
            <div className="ml-6 space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type of Disability</Label>
                  <Select
                    value={watchedValues.disabilityType}
                    onValueChange={(value) => form.setValue(`familyMembers.${index}.disabilityDetails.type`, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select disability type" />
                    </SelectTrigger>
                    <SelectContent>
                      {disabilityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {watchedValues.disabilityType === 'limb_loss' && (
                  <div>
                    <Label>Specific Details</Label>
                    <Select
                      value={form.watch(`familyMembers.${index}.disabilityDetails.specificDetails`)}
                      onValueChange={(value) => form.setValue(`familyMembers.${index}.disabilityDetails.specificDetails`, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select limb loss type" />
                      </SelectTrigger>
                      <SelectContent>
                        {limbLossOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {watchedValues.disabilityType && watchedValues.disabilityType !== 'limb_loss' && (
                  <div>
                    <Label>Specific Details</Label>
                    <Input
                      {...form.register(`familyMembers.${index}.disabilityDetails.specificDetails`)}
                      placeholder="Describe the disability"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showAdvanced && (
          <>
            <Separator />
            
            {/* Certificates */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`certificates-${index}`}
                checked={form.watch(`familyMembers.${index}.certificates`)}
                onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.certificates`, !!checked)}
              />
              <Label htmlFor={`certificates-${index}`} className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Has Certificates
              </Label>
            </div>

            {/* Pension Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`pension-${index}`}
                  checked={form.watch(`familyMembers.${index}.pensionDetails.hasPension`)}
                  onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.pensionDetails.hasPension`, !!checked)}
                />
                <Label htmlFor={`pension-${index}`} className="font-medium">Receives Pension</Label>
              </div>

              {form.watch(`familyMembers.${index}.pensionDetails.hasPension`) && (
                <div className="ml-6 grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Pension Type</Label>
                    <Input
                      {...form.register(`familyMembers.${index}.pensionDetails.pensionType`)}
                      placeholder="e.g., Widow pension, Disability pension"
                    />
                  </div>
                  <div>
                    <Label>Pension Source</Label>
                    <Input
                      {...form.register(`familyMembers.${index}.pensionDetails.pensionSource`)}
                      placeholder="e.g., Government, Private"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Daughter Status (if applicable) */}
            {watchedValues.relationship?.toLowerCase().includes('daughter') && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Daughter Status</Label>
                <div className="ml-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`daughter-over18-${index}`}
                      checked={form.watch(`familyMembers.${index}.daughterStatus.isOver18`)}
                      onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.daughterStatus.isOver18`, !!checked)}
                    />
                    <Label htmlFor={`daughter-over18-${index}`}>Over 18 years old</Label>
                  </div>

                  {form.watch(`familyMembers.${index}.daughterStatus.isOver18`) && (
                    <div>
                      <Label>Marital Status</Label>
                      <Select
                        value={form.watch(`familyMembers.${index}.daughterStatus.maritalStatus`)}
                        onValueChange={(value) => form.setValue(`familyMembers.${index}.daughterStatus.maritalStatus`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="married">Married (M)</SelectItem>
                          <SelectItem value="unmarried">Unmarried (UM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Education Details */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Education Details
              </Label>
              <div className="ml-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`attending-school-${index}`}
                    checked={form.watch(`familyMembers.${index}.educationDetails.attendingSchool`)}
                    onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.educationDetails.attendingSchool`, !!checked)}
                  />
                  <Label htmlFor={`attending-school-${index}`}>Currently Attending School/College</Label>
                </div>

                {form.watch(`familyMembers.${index}.educationDetails.attendingSchool`) && (
                  <div>
                    <Label>School/College Type</Label>
                    <Select
                      value={form.watch(`familyMembers.${index}.educationDetails.schoolType`)}
                      onValueChange={(value) => form.setValue(`familyMembers.${index}.educationDetails.schoolType`, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select school type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="government_school">Government School (GS)</SelectItem>
                        <SelectItem value="government_college">Government College (GC)</SelectItem>
                        <SelectItem value="private_school">Private School (PS)</SelectItem>
                        <SelectItem value="private_college">Private College (PC)</SelectItem>
                        <SelectItem value="madrasa">Madrasa (M)</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`attending-maktab-${index}`}
                    checked={form.watch(`familyMembers.${index}.educationDetails.attendingMaktab`)}
                    onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.educationDetails.attendingMaktab`, !!checked)}
                  />
                  <Label htmlFor={`attending-maktab-${index}`}>Attending Maktab</Label>
                </div>
              </div>
            </div>

            {/* Skills and Employment */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Skills & Employment
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Technical Skills</Label>
                  <Textarea
                    {...form.register(`familyMembers.${index}.skillsAndEmployment.technicalSkills`)}
                    placeholder="List technical skills"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Other Skills</Label>
                  <Textarea
                    {...form.register(`familyMembers.${index}.skillsAndEmployment.otherSkills`)}
                    placeholder="List other skills"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Employment Details</Label>
                  <Textarea
                    {...form.register(`familyMembers.${index}.skillsAndEmployment.employmentDetails`)}
                    placeholder="Describe employment status and details"
                    rows={2}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`unemployed-${index}`}
                    checked={form.watch(`familyMembers.${index}.skillsAndEmployment.isUnemployed`)}
                    onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.skillsAndEmployment.isUnemployed`, !!checked)}
                  />
                  <Label htmlFor={`unemployed-${index}`}>Currently Unemployed (UE)</Label>
                </div>
              </div>
            </div>

            {/* Identity Documents */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Identity Documents
              </Label>
              
              {/* Aadhaar Details */}
              <div className="space-y-3">
                <Label className="font-medium">Aadhaar Card</Label>
                <div className="ml-4 space-y-3">
                  <div>
                    <Label>Aadhaar Number</Label>
                    <Input
                      {...form.register(`familyMembers.${index}.identityDocuments.aadhaar.number`)}
                      placeholder="12-digit Aadhaar number"
                      maxLength={12}
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`aadhaar-correction-${index}`}
                        checked={form.watch(`familyMembers.${index}.identityDocuments.aadhaar.needsCorrection`)}
                        onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.identityDocuments.aadhaar.needsCorrection`, !!checked)}
                      />
                      <Label htmlFor={`aadhaar-correction-${index}`}>Needs Correction</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`aadhaar-new-${index}`}
                        checked={form.watch(`familyMembers.${index}.identityDocuments.aadhaar.needsNew`)}
                        onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.identityDocuments.aadhaar.needsNew`, !!checked)}
                      />
                      <Label htmlFor={`aadhaar-new-${index}`}>Needs New</Label>
                    </div>
                  </div>
                  {form.watch(`familyMembers.${index}.identityDocuments.aadhaar.needsCorrection`) && (
                    <div>
                      <Label>Correction Type</Label>
                      <Input
                        {...form.register(`familyMembers.${index}.identityDocuments.aadhaar.correctionType`)}
                        placeholder="Describe what needs correction"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Voter ID Details */}
              <div className="space-y-3">
                <Label className="font-medium">Voter ID Card</Label>
                <div className="ml-4 space-y-3">
                  <div>
                    <Label>Voter ID Number</Label>
                    <Input
                      {...form.register(`familyMembers.${index}.identityDocuments.voterId.number`)}
                      placeholder="Voter ID number"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`voter-correction-${index}`}
                        checked={form.watch(`familyMembers.${index}.identityDocuments.voterId.needsCorrection`)}
                        onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.identityDocuments.voterId.needsCorrection`, !!checked)}
                      />
                      <Label htmlFor={`voter-correction-${index}`}>Needs Correction</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`voter-new-${index}`}
                        checked={form.watch(`familyMembers.${index}.identityDocuments.voterId.needsNew`)}
                        onCheckedChange={(checked) => form.setValue(`familyMembers.${index}.identityDocuments.voterId.needsNew`, !!checked)}
                      />
                      <Label htmlFor={`voter-new-${index}`}>Needs New</Label>
                    </div>
                  </div>
                  {form.watch(`familyMembers.${index}.identityDocuments.voterId.needsCorrection`) && (
                    <div>
                      <Label>Correction Type</Label>
                      <Input
                        {...form.register(`familyMembers.${index}.identityDocuments.voterId.correctionType`)}
                        placeholder="Describe what needs correction"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Bank Details (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input
                    {...form.register(`familyMembers.${index}.bankDetails.bankName`)}
                    placeholder="Bank name"
                  />
                </div>
                <div>
                  <Label>Branch Name</Label>
                  <Input
                    {...form.register(`familyMembers.${index}.bankDetails.branchName`)}
                    placeholder="Branch name"
                  />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    {...form.register(`familyMembers.${index}.bankDetails.accountNumber`)}
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input
                    {...form.register(`familyMembers.${index}.bankDetails.ifscCode`)}
                    placeholder="IFSC code"
                  />
                </div>
              </div>
            </div>

            {/* Photo and Documents */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Photo & Documents (Optional)
              </Label>
              <div className="text-sm text-muted-foreground">
                Photos and documents can be uploaded in the final step of the survey.
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}