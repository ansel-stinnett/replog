// Chain of responsibility: this middleware sits in front of every protected
// router. It either passes the request along with req.userId set, or ends the
// chain with 401.
module.exports = function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'You need to log in first.' });
  }
  req.userId = req.session.userId;
  return next();
};
