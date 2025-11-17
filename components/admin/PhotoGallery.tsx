'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Camera,
  User,
  Home,
  FileText,
  CreditCard,
  Stethoscope,
  GraduationCap,
  Eye,
  Download,
  ZoomIn
} from 'lucide-react';

interface PhotoGalleryProps {
  familyPhotos: any[];
  memberPhotos: any[];
}

export function PhotoGallery({ familyPhotos, memberPhotos }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'family_photo':
        return User;
      case 'house_exterior':
      case 'house_interior':
        return Home;
      case 'id_document':
      case 'income_proof':
        return FileText;
      case 'ration_card':
      case 'voter_id':
      case 'aadhar_card':
        return CreditCard;
      case 'medical_document':
        return Stethoscope;
      case 'education_document':
        return GraduationCap;
      default:
        return Camera;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'family_photo':
        return 'bg-blue-500';
      case 'house_exterior':
      case 'house_interior':
        return 'bg-green-500';
      case 'id_document':
      case 'income_proof':
        return 'bg-purple-500';
      case 'ration_card':
      case 'voter_id':
      case 'aadhar_card':
        return 'bg-orange-500';
      case 'medical_document':
        return 'bg-red-500';
      case 'education_document':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Group photos by category
  const groupedFamilyPhotos = familyPhotos.reduce((acc: any, photo: any) => {
    const category = photo.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(photo);
    return acc;
  }, {});

  const groupedMemberPhotos = memberPhotos.reduce((acc: any, photo: any) => {
    const memberKey = `${photo.memberName} (Member ${photo.memberIndex})`;
    if (!acc[memberKey]) acc[memberKey] = {};
    
    const category = photo.category || 'other';
    if (!acc[memberKey][category]) acc[memberKey][category] = [];
    acc[memberKey][category].push(photo);
    return acc;
  }, {});

  const PhotoCard = ({ photo, showMemberInfo = false }: { photo: any; showMemberInfo?: boolean }) => {
    const CategoryIcon = getCategoryIcon(photo.category);
    
    return (
      <Dialog>
        <DialogTrigger asChild>
          <div className="relative group cursor-pointer">
            <img
              src={photo.url}
              alt={photo.description || 'Survey photo'}
              className="w-full h-32 object-cover rounded-lg border transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <Badge variant="secondary" className="text-xs">
                <CategoryIcon className="w-3 h-3 mr-1" />
                {formatCategoryName(photo.category)}
              </Badge>
            </div>
            {showMemberInfo && photo.memberName && (
              <div className="absolute top-2 left-2">
                <Badge variant="outline" className="text-xs bg-white/90">
                  {photo.memberName}
                </Badge>
              </div>
            )}
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CategoryIcon className="w-5 h-5" />
              {formatCategoryName(photo.category)}
              {showMemberInfo && photo.memberName && (
                <Badge variant="outline">
                  {photo.memberName}
                </Badge>
              )}
            </DialogTitle>
            {photo.description && (
              <DialogDescription>
                {photo.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex justify-center">
            <img
              src={photo.url}
              alt={photo.description || 'Survey photo'}
              className="max-w-full max-h-96 object-contain rounded-lg"
            />
          </div>
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              {photo.uploadedAt && (
                <p>Uploaded: {new Date(photo.uploadedAt).toLocaleDateString()}</p>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={photo.url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="family" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="family">
            Family Photos ({familyPhotos.length})
          </TabsTrigger>
          <TabsTrigger value="members">
            Member Photos ({memberPhotos.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Photos ({familyPhotos.length + memberPhotos.length})
          </TabsTrigger>
        </TabsList>

        {/* Family Photos Tab */}
        <TabsContent value="family" className="space-y-6">
          {Object.keys(groupedFamilyPhotos).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No family photos uploaded</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedFamilyPhotos).map(([category, photos]: [string, any]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const CategoryIcon = getCategoryIcon(category);
                      return <CategoryIcon className="w-5 h-5" />;
                    })()}
                    {formatCategoryName(category)}
                    <Badge variant="secondary">{photos.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo: any, index: number) => (
                      <PhotoCard key={index} photo={photo} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Member Photos Tab */}
        <TabsContent value="members" className="space-y-6">
          {Object.keys(groupedMemberPhotos).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No member photos uploaded</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedMemberPhotos).map(([memberKey, categories]: [string, any]) => (
              <Card key={memberKey}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {memberKey}
                    <Badge variant="secondary">
                      {Object.values(categories).reduce((sum: number, photos: any) => sum + photos.length, 0)} photos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(categories).map(([category, photos]: [string, any]) => (
                    <div key={category}>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        {(() => {
                          const CategoryIcon = getCategoryIcon(category);
                          return <CategoryIcon className="w-4 h-4" />;
                        })()}
                        {formatCategoryName(category)}
                        <Badge variant="outline" className="text-xs">{photos.length}</Badge>
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {photos.map((photo: any, index: number) => (
                          <PhotoCard key={index} photo={photo} />
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* All Photos Tab */}
        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                All Survey Photos
                <Badge variant="secondary">
                  {familyPhotos.length + memberPhotos.length} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...familyPhotos, ...memberPhotos].map((photo: any, index: number) => (
                  <PhotoCard key={index} photo={photo} showMemberInfo={true} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Photo Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Photo Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{familyPhotos.length}</p>
              <p className="text-sm text-muted-foreground">Family Photos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{memberPhotos.length}</p>
              <p className="text-sm text-muted-foreground">Member Photos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{Object.keys(groupedMemberPhotos).length}</p>
              <p className="text-sm text-muted-foreground">Members with Photos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Set([...familyPhotos, ...memberPhotos].map(p => p.category)).size}
              </p>
              <p className="text-sm text-muted-foreground">Photo Categories</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}