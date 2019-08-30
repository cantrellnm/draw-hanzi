const List = require('../models/List');

/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
  List.find({public: true}).exec((err, lists) => {
    if (err) return res.status(500).send('Server error loading lists');
    res.render('home', {
      title: 'Home',
      public_lists: lists
    });
  });
};

/**
 * GET /about
 * About page.
 */
exports.about = (req, res) => {
  res.render('about', {
    title: 'About'
  });
};

/**
 * GET /privacy
 * Privacy policy
 */
exports.privacy = (req, res) => {
  res.render('privacy', {
    title: 'Privacy Policy'
  });
};

/**
 * GET /tos
 * Terms of service
 */
exports.tos = (req, res) => {
  res.render('tos', {
    title: 'Terms of Service'
  });
};
