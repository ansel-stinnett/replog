const config = require('./config');
const createApp = require('./app');

createApp().listen(config.port, () => {
  console.log(`RepLog API listening on http://localhost:${config.port}`);
});
