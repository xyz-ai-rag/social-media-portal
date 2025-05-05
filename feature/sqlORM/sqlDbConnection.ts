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

// Determine if we're in the test environment
const isTestEnv = process.env.NODE_ENV === 'test';

// Base dialectOptions (always SSL)
const dialectOptions: any = {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
};

if (isTestEnv) {
  const socksUrl = process.env.FIXIE_SOCKS_HOST;
  if (!socksUrl) {
    throw new Error('Missing FIXIE_SOCKS_HOST in test environment');
  }

  const proxy = new URL(socksUrl);

  // Use a SOCKS5 tunnel for Postgres connections
  dialectOptions.stream = async () => {
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

    const info = await SocksClient.createConnection(socksOpts);
    return info.socket;
  };
}

const sequelizeDbConnection = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
  dialectOptions,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

sequelizeDbConnection
  .authenticate()
  .then(() => {
    console.log(
      `✅ Connected to DB${isTestEnv ? ' via SOCKS tunnel' : ''}`
    );
  })
  .catch((err) =>
    console.error('Unable to connect to the database:', err)
  );

export { sequelizeDbConnection };
