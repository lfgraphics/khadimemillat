export { }
// Extended roles to include moderator and inquiry_officer (required for new workflows)
export type Roles = 'admin' | 'user' | 'scrapper' | 'moderator' | 'inquiry_officer'
export const RolesEnum: Roles[] = ['admin', 'user', 'scrapper', 'moderator', 'inquiry_officer']

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            role?: Roles
        }
    }
}