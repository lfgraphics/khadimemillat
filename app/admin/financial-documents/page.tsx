import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { checkRole } from '@/lib/auth'
import connectDB from '@/lib/db'
import FinancialDocument from '@/models/FinancialDocument'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Download,
  Calendar,
  Users,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import Loading from '@/components/Loading'
import Link from 'next/link'
import FinancialDocumentGenerator from '@/components/admin/FinancialDocumentGenerator'

async function getFinancialDocuments() {
  await connectDB()
  
  const documents = await FinancialDocument.find({})
    .sort({ generatedAt: -1 })
    .lean()

  return documents.map((doc: any) => ({
    _id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    documentType: doc.documentType,
    period: doc.period,
    fileUrl: doc.fileUrl,
    fileSize: doc.fileSize,
    generatedBy: doc.generatedBy,
    generatedAt: doc.generatedAt.toISOString(),
    isPublic: doc.isPublic,
    memberAccessLevel: doc.memberAccessLevel,
    summary: doc.summary,
    metadata: doc.metadata
  }))
}

function getDocumentTypeLabel(type: string): string {
  const labels = {
    'annual_report': 'Annual Report',
    'quarterly_report': 'Quarterly Report',
    'monthly_report': 'Monthly Report',
    'audit_report': 'Audit Report',
    'impact_assessment': 'Impact Assessment',
    'utilization_report': 'Utilization Report'
  }
  return labels[type as keyof typeof labels] || type
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return 'N/A'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function FinancialDocumentsContent() {
  // Check if user has admin or moderator role
  const hasAccess = await checkRole(['admin', 'moderator'])
  
  if (!hasAccess) {
    redirect('/unauthorized')
  }

  const documents = await getFinancialDocuments()

  const stats = {
    total: documents.length,
    thisYear: documents.filter(d => d.period.year === new Date().getFullYear()).length,
    public: documents.filter(d => d.isPublic).length,
    memberAccess: documents.filter(d => d.memberAccessLevel === 'verified_only').length
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Financial Documents
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate and manage financial reports for transparency
          </p>
        </div>
        <div className="flex gap-2">
          <FinancialDocumentGenerator />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-secondary-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.thisYear}</p>
                <p className="text-sm text-muted-foreground">This Year</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.public}</p>
                <p className="text-sm text-muted-foreground">Public Access</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.memberAccess}</p>
                <p className="text-sm text-muted-foreground">Member Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Documents</CardTitle>
          <CardDescription>
            All financial documents generated for transparency and member access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No financial documents generated yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Generate Document" to create your first financial report
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getDocumentTypeLabel(doc.documentType)} • {doc.period.year}
                        {doc.period.quarter && ` Q${doc.period.quarter}`}
                        {doc.period.month && ` - ${new Date(doc.period.year, doc.period.month - 1).toLocaleDateString('en-US', { month: 'long' })}`}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            ₹{(doc.summary.totalDonations / 100000).toFixed(1)}L donations
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-accent-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {doc.summary.beneficiariesHelped} beneficiaries
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={doc.isPublic ? "default" : "secondary"}>
                          {doc.isPublic ? "Public" : "Private"}
                        </Badge>
                        <Badge variant="outline">
                          {doc.memberAccessLevel === 'all' ? 'All Members' : 
                           doc.memberAccessLevel === 'verified_only' ? 'Verified Only' : 'No Access'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.fileSize)} • {new Date(doc.generatedAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    
                    {doc.fileUrl ? (
                      <Link href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <FileText className="w-4 h-4 mr-2" />
                        Processing...
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function FinancialDocumentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FinancialDocumentsContent />
    </Suspense>
  )
}