"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="flex flex-col items-center gap-3">
                    <div className="rounded-full bg-red-100 p-3">
                        <XCircle className="h-10 w-10 text-red-600" />
                    </div>

                    <CardTitle className="text-2xl font-semibold text-red-700">
                        Access Denied
                    </CardTitle>
                </CardHeader>

                <CardContent className="text-center text-md text-muted-foreground px-8">
                    You don’t have permission to access this page.
                </CardContent>

                <CardFooter className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => router.back()}>
                        Go Back
                    </Button>

                    <Link href="/">
                        <Button>Home</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
