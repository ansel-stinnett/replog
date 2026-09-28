const pg = require('pg');
const config = require('../config');

// pg returns NUMERIC as a string to avoid precision loss; weights are small
// decimals (e.g. 102.5), so converting to a JS number is safe here.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// Return DATE columns as 'YYYY-MM-DD' strings instead of local-time Date objects,
// which avoids off-by-one-day bugs across time zones.
pg.types.setTypeParser(1082, (v) => v);

const pool = new pg.Pool({ connectionString: config.databaseUrl });

module.exports = pool;
