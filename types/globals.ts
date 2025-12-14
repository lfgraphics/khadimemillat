export { }
// Extended roles to include moderator and surveyor (required for new workflows)
export type Roles = 'admin' | 'user' | 'field_executive' | 'moderator' | 'surveyor' | 'accountant' | 'neki_bank_manager' | 'gullak_caretaker' | 'member'
export const RolesEnum: Roles[] = ['admin', 'user', 'field_executive', 'moderator', 'surveyor', 'accountant', 'neki_bank_manager', 'gullak_caretaker', 'member']

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            role?: Roles
        }
    }
}