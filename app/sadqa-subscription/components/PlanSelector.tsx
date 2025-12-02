'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, CreditCard, Award, Heart } from 'lucide-react'

interface Plan {
  _id: string
  planType: 'daily' | 'weekly' | 'monthly' | 'yearly'
  displayName: string
  description: string
  minAmount: number
  maxAmount: number
  suggestedAmount: number
  intervalCount: number
  intervalUnit: string
  isActive: boolean
  displayOrder: number
}

interface PlanSelectorProps {
  plans: Plan[]
  onPlanSelect: (plan: Plan) => void
  prefilledAmount?: number
}

const planIcons = {
  daily: Clock,
  weekly: Calendar,
  monthly: CreditCard,
  yearly: Award
}

const planColors = {
  daily: 'from-blue-500 to-cyan-500',
  weekly: 'from-green-500 to-emerald-500',
  monthly: 'from-purple-500 to-pink-500',
  yearly: 'from-orange-500 to-red-500'
}

export default function PlanSelector({ plans, onPlanSelect, prefilledAmount }: PlanSelectorProps) {
  const getRecommendedPlan = (amount?: number) => {
    if (!amount) return 'monthly'
    
    // Suggest plan based on amount
    if (amount <= 100) return 'daily'
    if (amount <= 500) return 'weekly'
    if (amount <= 2000) return 'monthly'
    return 'yearly'
  }

  const recommendedPlanType = getRecommendedPlan(prefilledAmount)

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {plans.map((plan) => {
        const Icon = planIcons[plan.planType]
        const isRecommended = plan.planType === recommendedPlanType
        const isAmountInRange = prefilledAmount 
          ? prefilledAmount >= plan.minAmount && prefilledAmount <= plan.maxAmount
          : false

        return (
          <Card 
            key={plan._id} 
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
              isRecommended ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onPlanSelect(plan)}
          >
            {isRecommended && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                Recommended
              </Badge>
            )}
            
            <CardHeader className="text-center pb-2">
              <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${planColors[plan.planType]} flex items-center justify-center mb-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg">{plan.displayName}</CardTitle>
            </CardHeader>
            
            <CardContent className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {plan.description}
              </p>
              
              <div className="space-y-2">
                <div className="text-lg font-bold">
                  ₹{plan.minAmount} - ₹{plan.maxAmount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Suggested: ₹{plan.suggestedAmount}
                </div>
              </div>

              {prefilledAmount && isAmountInRange && (
                <div className="flex items-center justify-center gap-1 text-sm text-green-600">
                  <Heart className="w-4 h-4" />
                  Perfect for ₹{prefilledAmount}
                </div>
              )}

              <Button 
                variant={isRecommended ? "default" : "outline"} 
                size="sm" 
                className="w-full"
              >
                Select {plan.planType.charAt(0).toUpperCase() + plan.planType.slice(1)}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}