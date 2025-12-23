"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PhoneInput } from "@/components/ui/phone-input"
import { ArrowLeft, Loader2, Package } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function CreateCollectionRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    requestedPickupTime: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.phone || !formData.address) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/protected/collection-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create collection request")
      }

      toast.success("Collection request created successfully")
      router.push("/admin/verify-requests")
    } catch (error: any) {
      console.error("[CREATE_REQUEST_ERROR]", error)
      toast.error(error.message || "Failed to create collection request")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Get minimum datetime for input (current time + 1 hour)
  const getMinDateTime = () => {
    const now = new Date()
    now.setHours(now.getHours() + 1)
    return now.toISOString().slice(0, 16)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/verify-requests">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Requests
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Collection Request</h1>
            <p className="text-muted-foreground">
              Create a new scrap pickup request for a donor
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Request Details
            </CardTitle>
            <CardDescription>
              Fill in the donor and pickup information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Donor Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Donor Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Enter donor's name"
                  required
                  disabled={loading}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => updateField("phone", value)}
                  placeholder="Enter phone number"
                  disabled={loading}
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  Pickup Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Enter complete pickup address with landmarks"
                  rows={3}
                  required
                  disabled={loading}
                />
              </div>

              {/* Pickup Time */}
              <div className="space-y-2">
                <Label htmlFor="requestedPickupTime">
                  Requested Pickup Time
                </Label>
                <Input
                  id="requestedPickupTime"
                  type="datetime-local"
                  value={formData.requestedPickupTime}
                  onChange={(e) => updateField("requestedPickupTime", e.target.value)}
                  min={getMinDateTime()}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Specify when the donor prefers pickup
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Any special instructions or additional information"
                  rows={3}
                  disabled={loading}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Request"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/verify-requests")}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}