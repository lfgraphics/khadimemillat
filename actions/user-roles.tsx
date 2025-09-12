'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { checkRole } from './../utils/roles'

type ActionState = { success: boolean; message: string }

export async function setRole(
    formData: FormData
): Promise<ActionState> {
    const client = await clerkClient()

    if (!checkRole('admin')) {
        return { success: false, message: 'Not Authorized' }
    }

    try {
        const res = await client.users.updateUserMetadata(
            formData.get('id') as string,
            { publicMetadata: { role: formData.get('role') } }
        )
        return {
            success: true,
            message: `Role updated to ${res.publicMetadata.role}`,
        }
    } catch (err: any) {
        return { success: false, message: err.message || 'Failed to set role' }
    }
}

export async function removeRole(
    formData: FormData
): Promise<ActionState> {
    const client = await clerkClient()

    try {
        await client.users.updateUserMetadata(formData.get('id') as string, {
            publicMetadata: { role: null },
        })
        return { success: true, message: 'Role removed successfully' }
    } catch (err: any) {
        return { success: false, message: err.message || 'Failed to remove role' }
    }
}
