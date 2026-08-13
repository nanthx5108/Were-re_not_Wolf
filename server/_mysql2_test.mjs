import mysql from 'mysql2/promise';
const configs = [
  { name: '127.0.0.1', host:'127.0.0.1' },
  { name: 'localhost', host:'localhost' },
  { name: '::1', host:'::1' }
];
for (const cfg of configs) {
  try {
    console.log('TEST', cfg.name);
    const conn = await mysql.createConnection({ host: cfg.host, port: 3306, user: 'root', password: '', connectTimeout: 5000, authPlugins: {} });
    const [rows] = await conn.query('SELECT VERSION() AS version');
    console.log('OK', cfg.name, JSON.stringify(rows));
    await conn.end();
  } catch (err) {
    console.error('ERROR', cfg.name, err.code || err.message, err.fatal || '', err.errno || '');
  }
}
