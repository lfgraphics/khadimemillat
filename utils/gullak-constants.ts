import { CheckCircle, Clock, Wrench, AlertCircle } from 'lucide-react'

export const GULLAK_STATUS_CONFIG = {
    active: { 
        icon: CheckCircle, 
        color: 'text-emerald-600 dark:text-emerald-400', 
        bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
        border: 'border-emerald-200 dark:border-emerald-800',
        label: 'Active' 
    },
    inactive: { 
        icon: Clock, 
        color: 'text-muted-foreground', 
        bg: 'bg-muted/50', 
        border: 'border-muted',
        label: 'Inactive' 
    },
    maintenance: { 
        icon: Wrench, 
        color: 'text-amber-600 dark:text-amber-400', 
        bg: 'bg-amber-50 dark:bg-amber-950/20', 
        border: 'border-amber-200 dark:border-amber-800',
        label: 'Maintenance' 
    },
    full: { 
        icon: AlertCircle, 
        color: 'text-destructive', 
        bg: 'bg-destructive/10', 
        border: 'border-destructive/20',
        label: 'Full' 
    }
} as const

export type GullakStatus = keyof typeof GULLAK_STATUS_CONFIG