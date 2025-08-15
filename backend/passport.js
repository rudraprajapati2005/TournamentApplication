import 'dotenv/config';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from './models/User.model.js';


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const profile_pic = profile.photos[0]?.value;

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.create({
        googleId,
        email,
        name,
        profile_pic,
        authProvider: 'google',
        role: 'participant',
      });
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));
passport.serializeUser((user, done) => {
  // Only store the user id in the session
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user with id:', id);
    // Fetch fresh user data from database
    const user = await User.findById(id).lean();
    if (!user) {
      console.log('No user found with id:', id);
      return done(null, null);
    }
    
    // Convert Mongoose date objects to ISO strings
    const userWithFormattedDates = {
      ...user,
      dob: user.dob ? new Date(user.dob).toISOString() : undefined,
      timestamp: user.timestamp ? new Date(user.timestamp).toISOString() : undefined
    };
    
    console.log('Deserialized user:', userWithFormattedDates);
    done(null, userWithFormattedDates);
  } catch (err) {
    console.error('Error deserializing user:', err);
    done(err, null);
  }
});