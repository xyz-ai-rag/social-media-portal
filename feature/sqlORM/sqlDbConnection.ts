// src/lib/db.ts
import { Sequelize } from 'sequelize';
import pgvector from 'pgvector/sequelize';
import pg from 'pg';
import { SocksClient, SocksClientOptions } from 'socks';
import { URL } from 'url';

pgvector.registerType(Sequelize);

const DB_NAME = process.env.PG_DATABASE ?? 'defaultdb';
const DB_USER = process.env.PG_USER!;
const DB_PASS = process.env.PG_PASSWORD!;
const DB_HOST = process.env.PG_SERVER!;
const DB_PORT = process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432;

// Log connection details (mask password for security)
console.log('=== DATABASE CONNECTION DETAILS ===');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Database Name: ${DB_NAME}`);
console.log(`Database User: ${DB_USER}`);
console.log(`Database Host: ${DB_HOST}`);
console.log(`Database Port: ${DB_PORT}`);
console.log(`Fixie SOCKS Host available: ${!!process.env.FIXIE_SOCKS_HOST}`);

// Determine if we should use proxy (for both test and production environments)
const useProxy = process.env.NODE_ENV === 'test'
console.log(`Using proxy: ${useProxy}`);

// Base dialectOptions (always SSL)
const dialectOptions: any = {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
};

// Setup SOCKS proxy if needed
if (useProxy) {
  const socksUrl = process.env.FIXIE_SOCKS_HOST;
  if (!socksUrl) {
    console.error('❌ Missing FIXIE_SOCKS_HOST environment variable!');
    throw new Error('Missing FIXIE_SOCKS_HOST environment variable');
  }

  try {
    console.log(`Parsing SOCKS URL: ${socksUrl.replace(/:[^:]*@/, ':***@')}`); // Hide password in logs
    const proxy = new URL(socksUrl);
    
    console.log(`SOCKS Proxy Details:`);
    console.log(`- Hostname: ${proxy.hostname}`);
    console.log(`- Port: ${proxy.port}`);
    console.log(`- Username available: ${!!proxy.username}`);
    console.log(`- Password available: ${!!proxy.password}`);

    // Use a SOCKS5 tunnel for Postgres connections
    dialectOptions.stream = async () => {
      console.log(`Attempting to create SOCKS connection to ${DB_HOST}:${DB_PORT} via ${proxy.hostname}:${proxy.port}`);
      
      const socksOpts: SocksClientOptions = {
        proxy: {
          host: proxy.hostname,
          port: Number(proxy.port),
          type: 5,
          userId: proxy.username,
          password: proxy.password,
        },
        command: 'connect',
        destination: { host: DB_HOST, port: DB_PORT },
      };

      try {
        console.log('Calling SocksClient.createConnection...');
        const info = await SocksClient.createConnection(socksOpts);
        console.log('✅ SOCKS connection established successfully');
        return info.socket;
      } catch (err) {
        console.error('❌ Failed to establish SOCKS connection:', err);
        throw err;
      }
    };
  } catch (err) {
    console.error('❌ Error setting up SOCKS proxy:', err);
    throw err;
  }
}

// Optimized pool settings for serverless environment
const poolConfig = {
  max: 5,      // Reduced from 20
  min: 0,
  acquire: 15000,  // Reduced from 30000
  idle: 5000,      // Reduced from 10000
};

console.log('Pool configuration:', poolConfig);

const sequelizeDbConnection = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  dialectModule: pg,
  logging: (msg) => console.log('[Sequelize]', msg),  // Enable logging
  dialectOptions,
  pool: poolConfig,
});

console.log('Sequelize instance created, attempting to authenticate...');

// Add connection attempt with timeout
const connectWithTimeout = async (timeoutMs = 10000) => {
  let timeoutId: NodeJS.Timeout;
  
  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Connection timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    // Race the connection against the timeout
    await Promise.race([
      sequelizeDbConnection.authenticate(),
      timeoutPromise
    ]);
    
    clearTimeout(timeoutId!);
    console.log(`✅ Successfully connected to DB${useProxy ? ' via SOCKS tunnel' : ''}`);
  } catch (err:any) {
    clearTimeout(timeoutId!);
    console.error('❌ Database connection failed:', err);
    
    // More detailed error analysis
    if (err.message?.includes('ETIMEDOUT')) {
      console.error('Connection timed out. Possible causes:');
      console.error('- Database server is unreachable');
      console.error('- Firewall is blocking the connection');
      console.error('- SOCKS proxy configuration is incorrect');
      console.error('- IP is not whitelisted in database firewall rules');
    }
    
    throw err;
  }
};

// Attempt connection with detailed logging
connectWithTimeout().catch(err => {
  console.error('=== CONNECTION FAILURE SUMMARY ===');
  console.error(`Failed to connect to ${DB_HOST}:${DB_PORT}`);
  console.error(`Environment: ${process.env.NODE_ENV}`);
  console.error(`Proxy used: ${useProxy}`);
  console.error('See error details above');
});

export { sequelizeDbConnection };