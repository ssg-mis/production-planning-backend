/**
 * Script to reset all user passwords from bcrypt hashes to plain text.
 * Run this ONCE after switching from bcrypt to plain text passwords.
 *
 * Usage: node src/scripts/reset-passwords.js
 *
 * This script sets each user's password to their USERNAME as the default plain text password.
 * Admin → password becomes "admin123"
 * Other users → password becomes their username
 *
 * After running, users should change passwords via Settings.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function resetPasswords() {
  console.log('🔄 Fetching all users...');
  const users = await prisma.user.findMany();

  console.log(`Found ${users.length} user(s). Resetting passwords to plain text...`);

  for (const user of users) {
    // Set password: admin → "admin123", others → their username
    const newPassword = user.username === 'admin' ? 'admin123' : user.username;
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword }
    });
    console.log(`  ✅ ${user.username} → password set to "${newPassword}"`);
  }

  console.log('\n✅ Done! All passwords reset to plain text.');
  console.log('⚠️  Make sure users change passwords via the Settings page.');
  await prisma.$disconnect();
  process.exit(0);
}

resetPasswords().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
