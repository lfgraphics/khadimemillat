export { }
// Extended roles to include moderator and surveyor (required for new workflows)
export type Roles = 'admin' | 'user' | 'field_executive' | 'moderator' | 'surveyor' | 'accountant'
export const RolesEnum: Roles[] = ['admin', 'user', 'field_executive', 'moderator', 'surveyor']

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            role?: Roles
        }
    }
}