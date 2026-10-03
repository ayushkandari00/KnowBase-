import { prisma } from '../prisma/client.js';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;

async function seed(): Promise<void> {
  console.log('🌱 Starting database seed...');

  const adminEmail = env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const customerEmail = env.SEED_CUSTOMER_EMAIL ?? 'customer@example.com';
  const customerPassword = env.SEED_CUSTOMER_PASSWORD ?? 'Customer123!';

  // ── Admin user ────────────────────────────────────────────────────────────
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const adminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminHash,
        role: 'ADMIN',
      },
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`⏭️  Admin user already exists: ${adminEmail}`);
  }

  // ── Customer user ─────────────────────────────────────────────────────────
  const existingCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });

  if (!existingCustomer) {
    const customerHash = await bcrypt.hash(customerPassword, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        email: customerEmail,
        passwordHash: customerHash,
        role: 'CUSTOMER',
      },
    });
    console.log(`✅ Customer user created: ${customerEmail}`);
  } else {
    console.log(`⏭️  Customer user already exists: ${customerEmail}`);
  }

  console.log('✅ Seed complete');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
