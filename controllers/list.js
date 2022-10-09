const validator = require('validator');

const List = require('../models/List');
const Score = require('../models/Score');


/**
 * GET /lists
 * List of public lists
 */

exports.getPublicLists = (req, res) => {
  List.find({public: true}).sort('name').exec((err, lists) => {
    if (err) return res.status(500).send('Server error loading lists');
    res.render('list/public', {
      title: 'Lists',
      public_lists: lists
    });
  });
};

/**
 * GET /account/lists
 * List of lists
 */

exports.getLists = (req, res) => {
  res.render('list/index', {
    title: 'Your Lists'
  });
};

/**
 * GET /account/lists/new
 * Form to create new list
 */
exports.newList = (req, res) => {
  let list = new List();
  res.render('list/new', {
    title: 'New List',
    list
  });
};
/**
 * Post /account/lists/new
 * Create new list from form
 */
exports.createList = (req, res) => {
  let { user } = req;
  let { name, content } = req.body;
  let list = new List();
  list.name = name;
  list.content = filterListContent(content);
  list.user = user.id;
  list.save();

  user.lists.push(list.id);
  user.save();

  req.flash('success', { msg: 'List was created successfully.' });
  res.redirect('/account/lists');
};

/**
 * GET /account/lists/:id
 * View list
 */
exports.viewList = (req, res) => {
  let { id } = req.params;
  let list = List.findById(id).exec((err, list) => {
    if (err || (!list.public && !list.user.equals(req.user.id))) return res.status(404).send('List Not Found');
    res.render('list/view', {
      title: list.name+' List',
      list
    });
  });
};

/**
  * GET /account/lists/:id/edit
  * Edit list
 */
exports.editList = (req, res) => {
  let { id } = req.params;
  let list = List.findById(id).exec((err, list) => {
    if (err || !list.user.equals(req.user.id)) return res.status(404).send('List Not Found');
    res.render('list/edit', {
      title: `Edit ${list.name} List`,
      list
    });
  });
};
/**
  * POST /account/lists/:id/edit
  * Update list
 */
exports.updateList = (req, res) => {
  let { id } = req.params;
  let { name, content } = req.body;
  let list = List.findById(id).exec((err, list) => {
    if (err || !list.user.equals(req.user.id)) return res.status(404).send('List Not Found');
    list.name = name;
    list.content = filterListContent(content);
    list.save();
    res.redirect(`/account/list/${list.id}`);
  });
};

/**
  * POST /account/lists/:id/delete
  * Delete list
 */
exports.deleteList = (req, res) => {
  let { id } = req.params;
  let list = List.findById(id).exec(async (err, list) => {
    if (err || !list.user.equals(req.user.id)) return res.status(404).send('List Not Found');
    await List.deleteOne({ _id: id });
    req.flash('info', { msg: `The list "${list.name}" has been deleted.` });
    res.redirect('/account/lists');
  });
};

/**
  * POST /account/sort
  * Sort list content
 */
exports.sortList = async (req, res) => {
  let { content } = req.body;
  content = content.split(' ');
  let scores = {};
  let user = (req.user) ? req.user.id : null;
  for (let val of content) {
    scores[val] =  await Score.findOne({ char: val, user });
  }
  let list = content.sort((a, b) => {
    // no score first, lower score first, fewer total attempts first
    if (!scores[a] && scores[b]) return -1;
    if (scores[a] && !scores[b]) return 1;
    if (!scores[a] && !scores[b]) return 0;
    // both scores exist, compare fields
    if (scores[a].score < scores[b].score) return -1;
    if (scores[a].score > scores[b].score) return 1;
    // scores equal
    if (scores[a].totalAttempts < scores[b].totalAttempts) return -1;
    if (scores[a].totalAttempts > scores[b].totalAttempts) return 1;
    // all equal
    return 0;
  });
  return res.status(200).json({ list });
};

function filterListContent(content) {
  // remove characters that aren't in given unicode blocks or whitespace
  content = content.replace(/(?!([\p{Ideographic}|\p{Unified_Ideograph}|\p{Radical}]|\s))./ug, '');
  return content.replace(/\s{2,}/g, ' ').trim();
}
