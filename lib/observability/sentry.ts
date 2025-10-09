// Strict no-op observability shims to avoid runtime errors when Sentry isn't configured.
// Replace with actual implementation if needed.
export const addBreadcrumb = (..._args: any[]) => {}
export const captureException = (..._args: any[]) => {}
