import { Metadata } from "next"
import { notFound } from "next/navigation"
import WelfareProgramForm from "@/components/admin/WelfareProgramForm"
import { getWelfarePrograms } from "@/server/welfare-programs"

export const metadata: Metadata = {
  title: "Edit Welfare Program | Admin",
  description: "Edit welfare program details"
}

export default async function EditWelfareProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // Get all programs and find the one with matching ID
  const programs = await getWelfarePrograms(false)
  const program = programs.find(p => p._id === id)

  if (!program) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Welfare Program</h1>
        <WelfareProgramForm program={program} />
      </div>
    </div>
  )
}