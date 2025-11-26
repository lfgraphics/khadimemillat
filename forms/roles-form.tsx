"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { roleSchema } from "@/schemas/role-schema"
import { z } from "zod"
import { setRole, removeRole } from "@/actions/user-roles"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"
import Loading from "@/app/loading"

type RoleFormValues = z.infer<typeof roleSchema>

export function RoleForm({
    userId,
    role,
    actionType = "set",
}: {
    userId: string
    role?: "admin" | "field_executive" | "moderator" | "surveyor" | "accountant" | "neki_bank_manager" | "gullak_caretaker"
    actionType?: "set" | "remove"
}) {
    const [loading, setLoading] = useState(false)
    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleSchema),
        defaultValues: { id: userId, role },
    })

    async function onSubmit(values: RoleFormValues) {
        setLoading(true)
        const formData = new FormData()
        formData.append("id", values.id)
        if (values.role) {
            formData.append("role", values.role)
        }

        let res
        if (actionType === "remove") {
            res = await removeRole(formData)
        } else {
            res = await setRole(formData)
        }

        if (res.success) {
            toast.success(res.message)
        } else {
            toast.error(res.message)
        }
        setLoading(false)
    }

    return (
        <Form {...form}>
            {loading && <Loading />}
            <form onSubmit={form.handleSubmit(onSubmit)} className="inline-block">
                <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <input type="hidden" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {role && (
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <input type="hidden" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <Button
                    size="sm"
                    variant={
                        actionType === "remove"
                            ? "destructive"
                            : role === "moderator"
                                ? "secondary"
                                : role === "field_executive"
                                    ? "outline"
                                    : role === "surveyor"
                                        ? "secondary"
                                        : "default"
                    }
                    type="submit"
                >
                    {actionType === "remove" ? "Remove Role" : `Make ${role}`}
                </Button>
            </form>
        </Form>
    )
}
