const env = process.env.NODE_ENV || 'development';

module.exports = (req, res, next) => {
  if (env === 'production' && req.header('x-forwarded-proto') !== 'https') {
		res.redirect('https://' + req.header('host') + req.url);
	} else {
		next();
	}
};
