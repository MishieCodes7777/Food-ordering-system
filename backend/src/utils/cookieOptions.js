// Shared HTTP-only auth cookie options.
//
// sameSite is configurable via COOKIE_SAME_SITE because the correct value
// depends on deployment topology we can't assume:
//   - frontend/backend on the same site (subdomains of one domain): "strict" (default) is fine.
//   - frontend/backend on fully different origins: must be "none" (and requires
//     secure:true, which NODE_ENV=production already sets below) or the browser
//     will silently drop the cookie and auth will appear broken.
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days, matches JWT expiresIn

const baseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAME_SITE || "strict",
});

export const authCookieOptions = () => ({
  ...baseOptions(),
  maxAge: MAX_AGE_MS,
});

export const clearAuthCookieOptions = () => baseOptions();
