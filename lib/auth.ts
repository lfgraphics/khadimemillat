import { getAuth } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { Roles } from "@/types/globals";

export function requireUser(req: NextRequest) {
    const authData = getAuth(req); // or getAuth(req) depending on Clerk SDK version
    if (!authData || !authData.userId) {
        throw new Error("UNAUTHORIZED");
    }
    return authData.userId;
}

export async function checkRole(roles: Roles[] | Roles): Promise<boolean> {
    const { sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as Roles
    
    if (!userRole) return false
    
    if (Array.isArray(roles)) {
        return roles.includes(userRole)
    }
    
    return userRole === roles
}
