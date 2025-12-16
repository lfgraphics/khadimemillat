'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteProgramButtonProps {
  programId: string
  programName: string
}

export function DeleteProgramButton({ programId, programName }: DeleteProgramButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${programName}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/welfare-programs/${programId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete program')
      }

      toast.success('Program deleted successfully!')
      router.refresh()
      
    } catch (error) {
      console.error('Error deleting program:', error)
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
