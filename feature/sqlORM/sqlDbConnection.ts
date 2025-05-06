import { Sequelize } from 'sequelize';
import pgvector from 'pgvector/sequelize';
import pg from 'pg';

pgvector.registerType(Sequelize);

const deployEnv = process.env.DEPLOY_ENV || process.env.NODE_ENV;
const isTestEnv = deployEnv === 'test';

const DB_NAME: string = isTestEnv ? process.env.NEON_PG_DATABASE! : (process.env.PG_DATABASE || 'defaultdb');
const DB_USER: string = isTestEnv ? process.env.NEON_PG_USER! : process.env.PG_USER!;
const DB_PASS: string = isTestEnv ? process.env.NEON_PG_PASSWORD! : process.env.PG_PASSWORD!;
const DB_HOST: string = isTestEnv ? process.env.NEON_PG_HOST! : process.env.PG_SERVER!;
const DB_PORT: number = isTestEnv ? parseInt(process.env.NEON_PG_PORT || '5432') : (process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432);

// Logging connection details
console.log('=== DATABASE CONNECTION DETAILS ===');
console.log(`Environment: ${deployEnv}`);
console.log(`Running on Vercel: ${!!process.env.VERCEL}`);
console.log(`Database Name: ${DB_NAME}`);
console.log(`Database User: ${DB_USER}`);
console.log(`Database Host: ${DB_HOST}`);
console.log(`Database Port: ${DB_PORT}`);
console.log(`Fixie SOCKS Host available: ${!!process.env.FIXIE_SOCKS_HOST}`);

// Log the config being used
console.log('Creating Sequelize instance with the following config:');
console.log('- Max pool size:', 20);
console.log('- Min pool size:', 0);
console.log('- Acquire timeout:', 30000);
console.log('- Idle timeout:', 10000);
console.log('- SSL enabled:', true);

const sequelizeDbConnection = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  dialectModule: pg,
  logging: msg => console.log('[Sequelize]', msg),
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    }
  },
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

console.log('Sequelize instance created, attempting to authenticate...');

sequelizeDbConnection.authenticate()
  .then(() => {
    console.log('✅ Successfully connected to the database');
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
    console.error('=== CONNECTION FAILURE SUMMARY ===');
    console.error(`Failed to connect to ${DB_HOST}:${DB_PORT}`);
    console.error(`Environment: ${deployEnv}`);
    console.error(`Running on Vercel: ${!!process.env.VERCEL}`);
  });

export { sequelizeDbConnection };
