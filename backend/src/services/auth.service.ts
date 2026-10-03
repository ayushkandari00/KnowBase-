import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { env } from '../config/env.js';
import { AuthenticationError, ConflictError, NotFoundError } from '../utils/errors.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schemas.js';

const BCRYPT_ROUNDS = 12;
// Pre-computed hash used to keep login timing constant for unknown emails.
const DUMMY_HASH = bcrypt.hashSync('timing-attack-mitigation', BCRYPT_ROUNDS);

export type PublicUser = Pick<User, 'id' | 'email' | 'role' | 'createdAt'>;

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt };
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function signToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  return jwt.sign({ email: user.email, role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/** Public registration always creates CUSTOMER accounts. Admins are provisioned via seed. */
export async function register(input: RegisterInput): Promise<{ user: PublicUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('An account with this email already exists');

  const user = await prisma.user.create({
    data: { email: input.email, passwordHash: await hashPassword(input.password), role: 'CUSTOMER' },
  });
  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
  return { user: toPublicUser(user), token: signToken(user) };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  return toPublicUser(user);
}
