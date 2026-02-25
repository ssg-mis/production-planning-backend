const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const dispatchConnectionString = process.env.DATABASE_URL_DISPATCH;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

// Helper to create Prisma instance with adapter
const createPrismaClient = (connStr, name) => {
  if (!connStr) {
    console.warn(`Warning: Connection string for ${name} is not defined.`);
    return null;
  }
  
  const maskedUrl = connStr.replace(/:([^:@]+)@/, ':****@');
  console.log(`Connecting to ${name} database: ${maskedUrl}`);

  try {
    const pool = new Pool({ connectionString: connStr });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error(`Failed to initialize Prisma Client for ${name}:`, error);
    return null;
  }
};

let prisma;
let dispatchPrisma;

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient(connectionString, 'Main');
  dispatchPrisma = createPrismaClient(dispatchConnectionString, 'Dispatch');
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient(connectionString, 'Main');
  }
  if (!global.dispatchPrisma && dispatchConnectionString) {
    global.dispatchPrisma = createPrismaClient(dispatchConnectionString, 'Dispatch');
  }
  prisma = global.prisma;
  dispatchPrisma = global.dispatchPrisma;
}

module.exports = {
  prisma,
  dispatchPrisma
};
