import { ROLES } from "@/utils/roles"
import { clerkClient } from "@clerk/nextjs/server"
import { SearchUsers } from "@/components/search-users"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RoleForm } from "@/forms/roles-form"

export default async function AdminDashboard(params: {
    searchParams: Promise<{ search?: string }>
}) {

    const query = (await params.searchParams).search
    const client = await clerkClient()
    const users = query ? (await client.users.getUserList({ query })).data : []

    return (
        <div className="space-y-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-foreground">
                        Admin Dashboard
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This section is restricted to users with the{" "}
                        <span className="font-medium">admin</span> role.
                    </p>
                    <div className="mt-4">
                        <SearchUsers />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {users.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        No users found. Try searching above.
                    </p>
                ) : (
                    users.map((user) => (
                        <Card key={user.id} className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg text-foreground">
                                    {user.firstName} {user.lastName}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {
                                        user.emailAddresses.find(
                                            (email) => email.id === user.primaryEmailAddressId
                                        )?.emailAddress
                                    }
                                </p>
                            </CardHeader>
                            <CardContent>
                                <Separator className="my-3" />
                                <div className="text-sm">
                                    <span className="font-medium">Role:</span>{" "}
                                    {user.publicMetadata.role as string || "None"}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {
                                        ROLES.map((role, index) => (
                                            <RoleForm key={index} userId={user.id} role={role} />
                                        ))
                                    }
                                    {user.publicMetadata.role as string && <RoleForm userId={user.id} actionType="remove" />}
                                    {/* <form action={setRole}>
                                        <input type="hidden" value={user.id} name="id" />
                                        <input type="hidden" value="admin" name="role" />
                                        <Button size="sm" variant="default">
                                            Make Admin
                                        </Button>
                                    </form>

                                    <form action={setRole}>
                                        <input type="hidden" value={user.id} name="id" />
                                        <input type="hidden" value="moderator" name="role" />
                                        <Button size="sm" variant="secondary">
                                            Make Moderator
                                        </Button>
                                    </form>

                                    <form action={setRole}>
                                        <input type="hidden" value={user.id} name="id" />
                                        <input type="hidden" value="contributor" name="role" />
                                        <Button size="sm" variant="outline">
                                            Make Contributor
                                        </Button>
                                    </form>

                                    <form action={removeRole}>
                                        <input type="hidden" value={user.id} name="id" />
                                        <Button size="sm" variant="destructive">
                                            Remove Role
                                        </Button>
                                    </form> */}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
