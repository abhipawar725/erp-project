// ─── Auth slice patch — add super admin redirect after login ──────────────────
// In your existing authSlice.ts, find the login success handler and update it:

// FIND this in your loginThunk or login mutation onSuccess:
//   router.push('/dashboard');

// REPLACE WITH:
//   if (user.isSuperAdmin) {
//     router.push('/super-admin');
//   } else {
//     router.push('/dashboard');
//   }

// ─── Also update selectUser to include isSuperAdmin ──────────────────────────
// Your selectUser selector already returns the full user object,
// so (user as any).isSuperAdmin should work without changes.

// ─── Sidebar guard (optional but clean) ──────────────────────────────────────
// In Sidebar.tsx, hide the "⚡ Platform Admin" nav item for non-super-admins:
// Change:
//   { id: 'super-admin', label: 'Platform Admin', icon: '⚡', href: '/super-admin', superAdminOnly: true },
// 
// The Sidebar should check isSuperAdmin before rendering that item.
// Find where nav items are rendered and add:
//
//   if (item.superAdminOnly && !(user as any)?.isSuperAdmin) return null;

// ─── Login page redirect (auth/login/page.tsx) ───────────────────────────────
// After successful login, check isSuperAdmin:
//
//   const handleLoginSuccess = (user: AuthUserPayload) => {
//     if (user.isSuperAdmin) {
//       router.push('/super-admin');
//     } else {
//       router.push('/dashboard');
//     }
//   };
