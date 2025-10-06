import { Metadata } from "next"
import WelfareProgramForm from "@/components/admin/WelfareProgramForm"

export const metadata: Metadata = {
  title: "Create Welfare Program | Admin",
  description: "Create a new welfare program"
}

export default function CreateWelfareProgramPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create Welfare Program</h1>
        <WelfareProgramForm />
      </div>
    </div>
  )
}