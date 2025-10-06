import { 
  Users, 
  Heart, 
  Truck, 
  GraduationCap, 
  Stethoscope, 
  Home, 
  Utensils, 
  Shirt, 
  Book, 
  Shield,
  HandHeart,
  Building,
  TreePine,
  Droplets,
  Zap,
  LucideIcon
} from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  Users,
  Heart,
  Truck,
  GraduationCap,
  Stethoscope,
  Home,
  Utensils,
  Shirt,
  Book,
  Shield,
  HandHeart,
  Building,
  TreePine,
  Droplets,
  Zap
}

export function getDynamicIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || Heart // Default to Heart if icon not found
}

export function getAvailableIcons(): string[] {
  return Object.keys(iconMap)
}