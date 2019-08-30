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
