import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { AdminNavigationDashboard } from "@/components/admin/AdminNavigationDashboard";

export default async function AdminNavigationPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  await connectDB();
  
  const user = await User.findOne({ clerkUserId: userId });
  
  if (!user || !['admin', 'moderator'].includes(user.role)) {
    redirect("/unauthorized");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminNavigationDashboard />
    </div>
  );
}