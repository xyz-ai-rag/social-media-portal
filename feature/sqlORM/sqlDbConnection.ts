import {Sequelize } from 'sequelize';
import pgvector from 'pgvector/sequelize';
import pg from 'pg';

pgvector.registerType(Sequelize);

// hard coding the database name to connect
const sequelizeDBName = process.env.PG_DATABASE || 'defaultdb';

const sequelizeDbConnection = new Sequelize(sequelizeDBName, process.env.PG_USER!, process.env.PG_PASSWORD!, {
  host: process.env.PG_SERVER!,
  port:process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
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

// pgvector.registerType(Sequelize);

sequelizeDbConnection.authenticate().catch(err => console.error('Unable to connect to the database:', err));

export { sequelizeDbConnection };