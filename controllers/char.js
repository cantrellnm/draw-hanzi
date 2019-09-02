const hanzi = require("hanzi");
hanzi.start();

const Score = require('../models/Score');

/**
 * GET /draw/:char
 */
exports.getCharDraw = (req, res) => {
  let { char } = req.params;
  char = char.replace(/(?!([\p{Ideographic}|\p{Unified_Ideograph}|\p{Radical}]))./ug, '');
  char = char.replace(/\s{2,}/g, ' ').trim();
  if (!char) return res.sendStatus(404);
  res.render('char', {
    title: char,
    char
  });
};

/**
 * GET /char/strokes/:char
 * List of lists
 */

exports.getCharStrokes = (req, res) => {
  let { char } = req.params;
  if (char) {
    char = decodeURIComponent(char);
    try {
      let data = require('hanzi-writer-data/'+char);
      res.status(200).json(data);
    } catch(e) {
      res.sendStatus(404);
    }
  } else {
    res.sendStatus(404);
  }
};

/**
 * GET /char/data/:char
 * List of lists
 */

exports.getCharData = async (req, res) => {
  let { char } = req.params;
  if (char) {
    char = decodeURIComponent(char);
    let user = (req.user) ? req.user.id : null;
    let score = await Score.findOne({ char, user }).catch(console.error);
    let data = hanzi.definitionLookup(char);
    if (data) {
      res.status(200).json({ data, score });
    } else {
      if (char.length > 1) {
        let definitions = [];
        char.split('').forEach(c => {
          let data = hanzi.definitionLookup(c);
          if (data) definitions = definitions.concat(data);
        });
        res.status(200).json({ data: definitions, score });
      } else {
        console.log(char + ' not found in dictionary');
        res.status(200).json({ data: [], score });
      }
    }
  } else {
    res.sendStatus(404);
  }
};

/**
 * POST /char/score
 */
exports.addAttempt = async (req, res) => {
  let { char, attempt } = req.body;
  let user = (req.user) ? req.user.id : null;
  // find or create score for char
  let score = await Score.findOne({ char, user }).catch(e => {
    console.error(e);
    res.sendStatus(500);
  });
  if (!score) {
    score = new Score;
    score.char = char;
    score.user = user;
    await score.save().catch(e => {
      console.error(e);
      res.sendStatus(500);
    });
  }
  // add attempt
  let newScore = await score.addAttempt(attempt);
  if (newScore) {
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
};
