const passport = require('passport');
const refresh = require('passport-oauth2-refresh');
const axios = require('axios');
const { Strategy: LocalStrategy } = require('passport-local');
const { OAuth2Strategy: GoogleStrategy } = require('passport-google-oauth');
const _ = require('lodash');
const moment = require('moment');

const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  User.findOne({ email: email.toLowerCase() }, (err, user) => {
    if (err) { return done(err); }
    if (!user) {
      return done(null, false, { msg: `Email ${email} not found.` });
    }
    if (!user.password) {
      return done(null, false, { msg: 'Your account was registered using a sign-in provider. To enable password login, sign in using a provider, and then set a password under your user profile.' });
    }
    user.comparePassword(password, (err, isMatch) => {
      if (err) { return done(err); }
      if (isMatch) {
        return done(null, user);
      }
      return done(null, false, { msg: 'Invalid email or password.' });
    });
  });
}));

/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */

/**
 * Sign in with Google.
 */
const googleStrategyConfig = new GoogleStrategy({
  clientID: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: '/auth/google/callback',
  passReqToCallback: true
}, (req, accessToken, refreshToken, params, profile, done) => {
  if (req.user) {
    User.findOne({ google: profile.id }, (err, existingUser) => {
      if (err) { return done(err); }
      if (existingUser && (existingUser.id !== req.user.id)) {
        req.flash('errors', { msg: 'There is already a Google account that belongs to you. Sign in with that account or delete it, then link it with your current account.' });
        done(err);
      } else {
        User.findById(req.user.id, (err, user) => {
          if (err) { return done(err); }
          user.google = profile.id;
          user.tokens.push({
            kind: 'google',
            accessToken,
            accessTokenExpires: moment().add(params.expires_in, 'seconds').format(),
            refreshToken,
          });
          user.profile.name = user.profile.name || profile.displayName;
          user.profile.gender = user.profile.gender || profile._json.gender;
          user.profile.picture = user.profile.picture || profile._json.picture;
          user.save((err) => {
            req.flash('info', { msg: 'Google account has been linked.' });
            done(err, user);
          });
        });
      }
    });
  } else {
    User.findOne({ google: profile.id }, (err, existingUser) => {
      if (err) { return done(err); }
      if (existingUser) {
        return done(null, existingUser);
      }
      User.findOne({ email: profile.emails[0].value }, (err, existingEmailUser) => {
        if (err) { return done(err); }
        if (existingEmailUser) {
          req.flash('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.' });
          done(err);
        } else {
          const user = new User();
          user.email = profile.emails[0].value;
          user.google = profile.id;
          user.tokens.push({
            kind: 'google',
            accessToken,
            accessTokenExpires: moment().add(params.expires_in, 'seconds').format(),
            refreshToken,
          });
          user.profile.name = profile.displayName;
          user.profile.gender = profile._json.gender;
          user.profile.picture = profile._json.picture;
          user.save((err) => {
            done(err, user);
          });
        }
      });
    });
  }
});
passport.use('google', googleStrategyConfig);
refresh.use('google', googleStrategyConfig);

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = (req, res, next) => {
  const provider = req.path.split('/')[2];
  const token = req.user.tokens.find((token) => token.kind === provider);
  if (token) {
    // Is there an access token expiration and access token expired?
    // Yes: Is there a refresh token?
    //     Yes: Does it have expiration and if so is it expired?
    //       Yes, Quickbooks - We got nothing, redirect to res.redirect(`/auth/${provider}`);
    //       No, Quickbooks and Google- refresh token and save, and then go to next();
    //    No:  Treat it like we got nothing, redirect to res.redirect(`/auth/${provider}`);
    // No: we are good, go to next():
    if (token.accessTokenExpires && moment(token.accessTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
      if (token.refreshToken) {
        if (token.refreshTokenExpires && moment(token.refreshTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
          res.redirect(`/auth/${provider}`);
        } else {
          refresh.requestNewAccessToken(`${provider}`, token.refreshToken, (err, accessToken, refreshToken, params) => {
            User.findById(req.user.id, (err, user) => {
              user.tokens.some((tokenObject) => {
                if (tokenObject.kind === provider) {
                  tokenObject.accessToken = accessToken;
                  if (params.expires_in) tokenObject.accessTokenExpires = moment().add(params.expires_in, 'seconds').format();
                  return true;
                }
                return false;
              });
              req.user = user;
              user.markModified('tokens');
              user.save((err) => {
                if (err) console.log(err);
                next();
              });
            });
          });
        }
      } else {
        res.redirect(`/auth/${provider}`);
      }
    } else {
      next();
    }
  } else {
    res.redirect(`/auth/${provider}`);
  }
};
