import ListOfflineDonations from "@/components/cash-intake/ListOfflineDonations";
import { auth, clerkClient } from "@clerk/nextjs/server";

export default async function OfflineDonationPage() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Unauthorized</div>;
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = user.publicMetadata?.role as string;

  const permissions = {
    canToggleDeleted: ["admin", "moderator", "auditor"].includes(role),
    canDeleteIcon: ["admin", "moderator", "auditor"].includes(role),
  };

  return (
    <div className="p-6 flex justify-center">
      <ListOfflineDonations permissions={permissions} />
    </div>
  );
}
