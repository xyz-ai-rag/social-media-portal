// src/lib/db.ts
import { Sequelize } from 'sequelize';
import pgvector from 'pgvector/sequelize';
import pg from 'pg';
import { SocksClient, SocksClientOptions } from 'socks';
import { URL } from 'url';
import net from 'net';

pgvector.registerType(Sequelize);

const DB_NAME = process.env.PG_DATABASE ?? 'defaultdb';
const DB_USER = process.env.PG_USER!;
const DB_PASS = process.env.PG_PASSWORD!;
const DB_HOST = process.env.PG_SERVER!;
const DB_PORT = process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432;

// Check both VERCEL env variable and your custom DEPLOY_ENV
console.log('=== DATABASE CONNECTION DETAILS ===');
console.log(`Environment: ${process.env.DEPLOY_ENV}`);
console.log(`Database Name: ${DB_NAME}`);
console.log(`Database User: ${DB_USER}`);
console.log(`Database Host: ${DB_HOST}`);
console.log(`Database Port: ${DB_PORT}`);
console.log(`Fixie SOCKS Host available: ${!!process.env.FIXIE_SOCKS_HOST}`);

// Use proxy when on Vercel OR when in test environment
const useProxy =  process.env.DEPLOY_ENV === 'test';
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

    // Use a SOCKS5 tunnel for Postgres connections with wrapper to fix socket methods
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
        console.log('✅ Got raw SOCKS connection');
        
        // Create a wrapper around the socket to ensure all required methods are available
        const socket = info.socket;
        
        // Add any missing methods that Sequelize expects
        if (!socket.setNoDelay) {
          console.log('Adding missing setNoDelay method to socket');
          socket.setNoDelay = function(noDelay?: boolean) {
            // This is a no-op function since the original is missing
            console.log(`Socket setNoDelay called with: ${noDelay}`);
            return this;
          };
        }
        
        // Add other missing methods if needed
        if (!socket.setKeepAlive) {
          console.log('Adding missing setKeepAlive method to socket');
          socket.setKeepAlive = function(enable?: boolean, initialDelay?: number) {
            console.log(`Socket setKeepAlive called with: ${enable}, ${initialDelay}`);
            return this;
          };
        }
        
        console.log('✅ SOCKS connection established and socket wrapped successfully');
        return socket;
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

// Add connection attempt with timeout and retry logic
const connectWithRetry = async (maxRetries = 3, timeoutMs = 10000) => {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    let timeoutId: NodeJS.Timeout;
    
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Connection timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    try {
      console.log(`Connection attempt ${attempt + 1} of ${maxRetries}...`);
      
      // Race the connection against the timeout
      await Promise.race([
        sequelizeDbConnection.authenticate(),
        timeoutPromise
      ]);
      
      clearTimeout(timeoutId!);
      console.log(`✅ Successfully connected to DB${useProxy ? ' via SOCKS tunnel' : ''}`);
      return; // Success! Exit the function
    } catch (err: any) {
      clearTimeout(timeoutId!);
      console.error(`❌ Database connection attempt ${attempt + 1} failed:`, err);
      
      // More detailed error analysis
      if (err.message?.includes('ETIMEDOUT')) {
        console.error('Connection timed out. Possible causes:');
        console.error('- Database server is unreachable');
        console.error('- Firewall is blocking the connection');
        console.error('- SOCKS proxy configuration is incorrect');
        console.error('- IP is not whitelisted in database firewall rules');
      }
      
      attempt++;
      
      if (attempt >= maxRetries) {
        console.error('All connection attempts failed');
        throw err; // We've exhausted all retries, rethrow the error
      }
      
      // Wait before retrying with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`Waiting ${delay}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Attempt connection with detailed logging and retry
connectWithRetry().catch(err => {
  console.error('=== CONNECTION FAILURE SUMMARY ===');
  console.error(`Failed to connect to ${DB_HOST}:${DB_PORT}`);
  console.error(`Environment: ${process.env.DEPLOY_ENV}`);
  console.error(`Proxy used: ${useProxy}`);
  console.error('See error details above');
});

export { sequelizeDbConnection };