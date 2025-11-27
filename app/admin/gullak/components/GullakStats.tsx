import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import connectDB from '@/lib/db'
import Gullak from '@/models/Gullak'
import GullakCollection from '@/models/GullakCollection'
import { 
    MapPin, 
    DollarSign, 
    TrendingUp, 
    Users,
    CheckCircle,
    Clock,
    Wrench,
    AlertCircle
} from 'lucide-react'

export async function GullakStats() {
    await connectDB()

    const [
        totalGullaks,
        activeGullaks,
        inactiveGullaks,
        maintenanceGullaks,
        fullGullaks,
        totalCollections,
        totalAmount,
        thisMonthCollections
    ] = await Promise.all([
        Gullak.countDocuments(),
        Gullak.countDocuments({ status: 'active' }),
        Gullak.countDocuments({ status: 'inactive' }),
        Gullak.countDocuments({ status: 'maintenance' }),
        Gullak.countDocuments({ status: 'full' }),
        GullakCollection.countDocuments(),
        GullakCollection.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(result => result[0]?.total || 0),
        GullakCollection.countDocuments({
            collectionDate: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
        })
    ])

    const stats = [
        {
            title: 'Total Gullaks',
            value: totalGullaks,
            icon: MapPin,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
        },
        {
            title: 'Active Gullaks',
            value: activeGullaks,
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-100'
        },
        {
            title: 'Total Collections',
            value: totalCollections,
            icon: TrendingUp,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100'
        },
        {
            title: 'Total Amount',
            value: `₹${totalAmount.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100'
        }
    ]

    const statusStats = [
        { label: 'Active', count: activeGullaks, icon: CheckCircle, color: 'text-green-600' },
        { label: 'Inactive', count: inactiveGullaks, icon: Clock, color: 'text-gray-600' },
        { label: 'Maintenance', count: maintenanceGullaks, icon: Wrench, color: 'text-yellow-600' },
        { label: 'Full', count: fullGullaks, icon: AlertCircle, color: 'text-red-600' }
    ]

    return (
        <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <Card key={index}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}