import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/index.js";

export function configurePassport() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return passport;

  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
      if (!user) {
        user = await User.create({
          email,
          fullName: profile.displayName || email,
          googleId: profile.id,
          avatarUrl: profile.photos?.[0]?.value,
          emailVerifiedAt: new Date(),
          status: "Active"
        });
      } else if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  }));

  return passport;
}
