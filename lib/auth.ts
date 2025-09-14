import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export function requireUser(req: NextRequest) {
    const auth = getAuth(req); // or getAuth(req) depending on Clerk SDK version
    if (!auth || !auth.userId) {
        throw new Error("UNAUTHORIZED");
    }
    return auth.userId;
}
