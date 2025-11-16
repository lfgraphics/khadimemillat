import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function checkUserPermissions(allowedRoles: string[] = ['admin', 'moderator', 'inquiry_officer', 'surveyor']) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Authentication required");
  }

  // Check permissions using Clerk roles
  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  
  const userRole = clerkUser.publicMetadata?.role as string;
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    console.error(`Permission denied for user ${userId}. Current role: ${userRole}, Allowed roles: ${allowedRoles.join(', ')}`);
    throw new Error(`Insufficient permissions. Current role: ${userRole || 'none'}`);
  }

  await connectDB();

  // Get or create user in database for data consistency
  let user = await User.findOne({ clerkUserId: userId });
  if (!user) {
    user = await User.create({
      clerkUserId: userId,
      name: clerkUser.firstName && clerkUser.lastName 
        ? `${clerkUser.firstName} ${clerkUser.lastName}` 
        : (clerkUser.username || 'User'),
      email: clerkUser.emailAddresses?.[0]?.emailAddress,
      role: userRole
    });
  }

  return { user, userRole, clerkUser };
}

export async function checkUserPermissionsAPI(allowedRoles: string[] = ['admin', 'moderator', 'inquiry_officer', 'surveyor']) {
  const { userId } = await auth();
  
  if (!userId) {
    return { 
      error: "Authentication required", 
      status: 401 
    };
  }

  try {
    // Check permissions using Clerk roles
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    
    const userRole = clerkUser.publicMetadata?.role as string;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.error(`Permission denied for user ${userId}. Current role: ${userRole}, Allowed roles: ${allowedRoles.join(', ')}`);
      return { 
        error: `Insufficient permissions. Current role: ${userRole || 'none'}`, 
        status: 403 
      };
    }

    await connectDB();

    // Get or create user in database for data consistency
    let user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      user = await User.create({
        clerkUserId: userId,
        name: clerkUser.firstName && clerkUser.lastName 
          ? `${clerkUser.firstName} ${clerkUser.lastName}` 
          : (clerkUser.username || 'User'),
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        role: userRole
      });
    }

    return { user, userRole, clerkUser };
  } catch (error) {
    console.error('Permission check error:', error);
    return { 
      error: "Permission check failed", 
      status: 500 
    };
  }
}