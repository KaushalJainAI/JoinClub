import jwt from "jsonwebtoken";
import { User } from "../model/user.model.js";
import { HttpError } from "../utils/http.js";

const COOKIE = "token";
const isProd = process.env.NODE_ENV === "production";

export const cookieOptions = {
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  // Frontend and API on different domains in production need SameSite=None + Secure.
  // The CSRF header check in index.js is what protects state-changing routes then.
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
};

// `tv` (token version) lets a password change or role change log out every other session.
export const signToken = (user) => jwt.sign({ userId: user._id, tv: user.tokenVersion || 0 }, process.env.SECRET_KEY, { expiresIn: "1d" });

export const setAuthCookie = (res, user) => res.cookie(COOKIE, signToken(user), cookieOptions);
export const clearAuthCookie = (res) => res.cookie(COOKIE, "", { ...cookieOptions, maxAge: 0 });

// Role and club come from the database, not the token, so changes apply immediately.
async function loadUser(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.SECRET_KEY);
  } catch {
    return null;
  }
  const user = await User.findById(decoded.userId)
    .select("role club tokenVersion mustChangePassword emailVerified active")
    .lean();
  if (!user || (user.tokenVersion || 0) !== (decoded.tv || 0)) return null;
  return user;
}

const attach = (req, user) => {
  req.id = String(user._id);
  req.role = user.role;
  req.clubId = user.club ? String(user.club) : null;
  req.emailVerified = user.emailVerified;
  req.mustChangePassword = user.mustChangePassword;
};

// While a seeded account still has its temporary password, only these routes work.
const ALLOWED_BEFORE_PASSWORD_CHANGE = ["/api/v1/auth/me", "/api/v1/auth/logout", "/api/v1/auth/password/change", "/api/v1/auth/otp/request"];

export const isAuthenticated = async (req, res, next) => {
  try {
    const user = await loadUser(req);
    if (!user) return next(new HttpError(401, "Please log in to continue."));
    if (user.active === false) return next(new HttpError(403, "This account has been deactivated. Contact the site admin."));
    attach(req, user);
    if (user.mustChangePassword && !ALLOWED_BEFORE_PASSWORD_CHANGE.includes(req.baseUrl + req.path)) {
      const err = new HttpError(403, "Please set a new password to continue.");
      err.code = "MUST_CHANGE_PASSWORD";
      return next(err);
    }
    next();
  } catch (err) {
    next(err);
  }
};

// For routes guests can use but logged-in users get more from (e.g. the chatbot).
export const optionalAuth = async (req, res, next) => {
  try {
    const user = await loadUser(req);
    if (user && user.active !== false) attach(req, user);
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.role)) return next(new HttpError(403, "You don't have access to this."));
    next();
  };

export default isAuthenticated;
