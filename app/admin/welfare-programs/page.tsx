import { Metadata } from "next"
import Link from "next/link"
import { Plus, Edit, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getDynamicIcon } from "@/lib/iconUtils"
import { getWelfarePrograms } from "@/server/welfare-programs"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import { DeleteProgramButton } from "@/components/admin/DeleteProgramButton"

export const metadata: Metadata = {
  title: "Manage Welfare Programs | Admin",
  description: "Manage welfare programs and campaigns"
}

export default async function AdminWelfareProgramsPage() {
  const programs = await getWelfarePrograms(true)

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welfare Programs</h1>
          <p className="text-muted-foreground">Manage welfare programs and campaigns</p>
        </div>
        <Button asChild>
          <Link href="/admin/welfare-programs/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Program
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {programs.map((program) => {
          const IconComponent = getDynamicIcon(program.icon)

          return (
            <div key={program._id} className="bg-card rounded-lg border p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${program.iconColor}20` }}
                  >
                    <IconComponent
                      className="h-6 w-6"
                      style={{ color: program.iconColor }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-xl font-semibold">{program.title}</h3>
                      <Badge variant={program.isActive ? "default" : "secondary"}>
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mb-4 line-clamp-2">
                      <MarkdownRenderer 
                        content={program.description} 
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-semibold">₹{program.totalRaised.toLocaleString()}</div>
                        <div className="text-muted-foreground">Total Raised</div>
                      </div>
                      <div>
                        <div className="font-semibold">{program.totalCampaigns}</div>
                        <div className="text-muted-foreground">Campaigns</div>
                      </div>
                      <div>
                        <div className="font-semibold">{program.totalSupporters}</div>
                        <div className="text-muted-foreground">Supporters</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/welfare-programs/${program.slug || program._id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/welfare-programs/${program._id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteProgramButton
                    programId={program._id}
                    programName={program.title}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {programs.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No Programs Found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first welfare program to get started.
          </p>
          <Button asChild>
            <Link href="/admin/welfare-programs/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Program
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}