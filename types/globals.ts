export { }
// Extended roles to include moderator (required for new workflows)
export type Roles = 'admin' | 'user' | 'scrapper' | 'moderator'
export const RolesEnum: Roles[] = ['admin', 'user', 'scrapper', 'moderator']

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            role?: Roles
        }
    }
}