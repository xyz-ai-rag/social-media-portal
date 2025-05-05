import {Sequelize } from 'sequelize';
import pgvector from 'pgvector/sequelize';
import pg from 'pg';

// Add logging
console.log('=== DATABASE CONNECTION DETAILS ===');
console.log(`Environment: ${process.env.DEPLOY_ENV || process.env.NODE_ENV}`);
console.log(`Running on Vercel: ${!!process.env.VERCEL}`);
console.log(`Database Name: ${process.env.PG_DATABASE || 'defaultdb'}`);
console.log(`Database User: ${process.env.PG_USER}`);
console.log(`Database Host: ${process.env.PG_SERVER}`);
console.log(`Database Port: ${process.env.PG_PORT || 5432}`);
console.log(`Fixie SOCKS Host available: ${!!process.env.FIXIE_SOCKS_HOST}`);

pgvector.registerType(Sequelize);
// hard coding the database name to connect
const sequelizeDBName = process.env.PG_DATABASE || 'defaultdb';

// Log the config being used
console.log('Creating Sequelize instance with the following config:');
console.log('- Max pool size:', 20);
console.log('- Min pool size:', 0);
console.log('- Acquire timeout:', 30000);
console.log('- Idle timeout:', 10000);
console.log('- SSL enabled:', true);

const sequelizeDbConnection = new Sequelize(sequelizeDBName, process.env.PG_USER!, process.env.PG_PASSWORD!, {
  host: process.env.PG_SERVER!,
  port:process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
  dialect: 'postgres',
  dialectModule: pg,
  logging: msg => console.log('[Sequelize]', msg), // Enable logging here
  dialectOptions: {
    // using ssl when production
    ssl: 
    {
        require: true, 
        rejectUnauthorized: false, 
      }
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
});

console.log('Sequelize instance created, attempting to authenticate...');

// Enhanced error handling for authenticate
sequelizeDbConnection.authenticate()
  .then(() => {
    console.log('✅ Successfully connected to the database');
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
    console.error('=== CONNECTION FAILURE SUMMARY ===');
    console.error(`Failed to connect to ${process.env.PG_SERVER}:${process.env.PG_PORT || 5432}`);
    console.error(`Environment: ${process.env.DEPLOY_ENV || process.env.NODE_ENV}`);
    console.error(`Running on Vercel: ${!!process.env.VERCEL}`);
  });

export { sequelizeDbConnection };