import { NextRequest, NextResponse } from 'next/server';
import { checkUserPermissionsAPI } from '@/lib/auth-utils';
import User from '@/models/User';
import connectDB from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ clerkUserId: string }> }
) {
    try {
        // Check permissions - only authenticated users can view user data
        const authResult = await checkUserPermissionsAPI(['admin', 'moderator', 'accountant', 'auditor']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { clerkUserId } = await params;
        
        await connectDB();
        
        const user = await User.findOne({ clerkUserId }).select('name email role').lean() as { name: string; email?: string; role: string } | null;

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'User retrieved successfully',
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}