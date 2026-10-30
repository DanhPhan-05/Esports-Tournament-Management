import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// Epic 1 supplies the account lookup and OAuth routes. This setup never creates a user implicitly.
export function configurePassport(findOrCreateAccount, findAccountById) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return false;
  passport.serializeUser((account, done) => done(null, String(account.id)));
  passport.deserializeUser(async (id, done) => {
    try { done(null, await findAccountById(id)); }
    catch (error) { done(error); }
  });
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try { done(null, await findOrCreateAccount(profile)); }
    catch (error) { done(error); }
  }));
  return true;
}

export default passport;
