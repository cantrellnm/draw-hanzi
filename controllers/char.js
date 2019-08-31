const hanzi = require("hanzi");
hanzi.start();

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

exports.getCharData = (req, res) => {
  let { char } = req.params;
  if (char) {
    char = decodeURIComponent(char);
    let data = hanzi.definitionLookup(char);
    if (data) {
      res.status(200).json({ data });
    } else {
      if (char.length > 1) {
        let definitions = [];
        char.split('').forEach(c => {
          let data = hanzi.definitionLookup(c);
          if (data) definitions = definitions.concat(data);
        });
        res.status(200).json({ data: definitions });
      } else {
        console.log(char + ' not found in dictionary');
        res.status(200).json({ data: [] });
      }
    }
  } else {
    res.sendStatus(404);
  }
};
