# Password Change Feature Design

## Summary

Add password change functionality in two places:
1. **Admin panel** — Edit user modal with optional password reset
2. **Self-service** — Profile page where any user can change their own password (requires current password verification)

## 1. Admin Edit User Modal

**Location:** `src/app/(main)/admin/users/page.tsx`

Add a pencil/edit icon button to each user card. Clicking opens a modal pre-filled with the user's current name, email, and role. Password field is optional — only updates if filled.

- Reuses existing `Modal`, `Input`, `Button` components
- Calls existing `PUT /api/users/[id]` endpoint (already supports all fields)
- No current password required (admin privilege)

## 2. Self-Service Password Change

### API: `PUT /api/users/me/password`

**Location:** `src/app/api/users/me/password/route.ts`

Request body:
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (min 8 chars)"
}
```

Logic:
1. Get session via `auth()`
2. Fetch user from DB by session user ID
3. Verify `currentPassword` against stored `passwordHash` via bcrypt
4. Hash `newPassword` and update DB
5. Return `{ success: true }`

Error cases:
- 401 if not authenticated
- 400 if current password is wrong
- 400 if validation fails (new password too short)

### UI: Profile Page

**Location:** `src/app/(main)/profile/page.tsx`

Simple page with:
- User info display (name, email, role — read-only)
- "Change Password" section with three fields: current password, new password, confirm new password
- Client-side validation: new password === confirm, min 8 chars
- Success toast on completion, clear form

### Navigation

Add a "Profile" link to the header dropdown menu (between user info and Admin Settings/Sign Out), using `User` icon. Accessible to all authenticated users.

## Architecture Notes

- No new components needed — reuses existing `Input`, `Button`, `Modal`, toast system
- No schema changes — uses existing `users` table
- No middleware changes — `/profile` is already covered by `(main)` layout auth
- Follows existing API pattern: `{ success: boolean, data?: T, error?: string }`
