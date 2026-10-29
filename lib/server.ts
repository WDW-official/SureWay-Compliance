import 'server-only';
import { MongoClient } from 'mongodb';
import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
let client: Promise<MongoClient> | undefined;
let indexReady: Promise<unknown> | undefined;
export async function db() {
  if (!process.env.MONGODB_URI) throw new Error('Service setup is still in progress. Please try again later.');
  client ??= new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 7000
  }).connect().catch(e => {
    client = undefined;
    throw e;
  });
  const database = (await client).db(process.env.MONGODB_DB || 'sureway');
  indexReady ??= Promise.all([database.collection('orders').createIndex({
    reference: 1
  }, {
    unique: true
  }), database.collection('rate_limits').createIndex({
    expiresAt: 1
  }, {
    expireAfterSeconds: 0
  }), database.collection('notification_jobs').createIndex({
    key: 1
  }, {
    unique: true
  })]).catch(e => {
    indexReady = undefined;
    throw e;
  });
  await indexReady;
  return database;
}
export const isLive = () => !!(process.env.MONGODB_URI && process.env.PAYSTACK_SECRET_KEY && process.env.APP_URL && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && (process.env.ADMIN_SESSION_SECRET?.length || 0) >= 32 && (process.env.ADMIN_PASSWORD?.length || 0) >= 16 && process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.TEAM_EMAIL && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_NAME && process.env.PRICING_CONFIRMED === 'true');
export const randomToken = () => randomBytes(24).toString('hex');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Admin access has not been configured.');
  return value;
}
export function sign(value: unknown) {
  const body = Buffer.from(JSON.stringify(value)).toString('base64url');
  return body + '.' + createHmac('sha256', secret()).update(body).digest('base64url');
}
export function unsign(value: string): Record<string, unknown> {
  const [body, sig] = value.split('.');
  if (!body || !sig || !equal(sig, createHmac('sha256', secret()).update(body).digest('base64url'))) throw new Error('Invalid session');
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (data.exp < Date.now()) throw new Error('Expired session');
  return data;
}
export async function admin() {
  try {
    const cookie = (await cookies()).get('sureway-admin')?.value;
    if (!cookie || unsign(cookie).role !== 'admin') throw new Error('Unauthorized');
  } catch {
    throw new Error('Unauthorized');
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(process.env.APP_URL || request.url).origin) throw new Error('Request origin is not allowed.');
}
export async function limit(request: Request, key: string, max = 15) {
  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0] || 'local').trim();
  const minute = Math.floor(Date.now() / 60000);
  const database = await db();
  const result = await database.collection<{
    _id: string;
    count: number;
    expiresAt: Date;
  }>('rate_limits').findOneAndUpdate({
    _id: hash(ip + key + minute)
  }, {
    $inc: {
      count: 1
    },
    $setOnInsert: {
      expiresAt: new Date(Date.now() + 120000)
    }
  }, {
    upsert: true,
    returnDocument: 'after'
  });
  if ((result?.count || 0) > max) throw new Error('Too many requests. Please try again in a minute.');
}
export function failure(e: unknown) {
  const text = e instanceof Error ? e.message : 'Request failed';
  const known = /Unauthorized|configured|setup|Unknown|valid|allowed|Too many|missing|matching|not found|Payment|upload|file|Files|documents|transition|paid|limit|Lagos|Select|confirm/i.test(text);
  return NextResponse.json({
    error: known ? text : 'We couldn’t complete this request. Please try again.'
  }, {
    status: text === 'Unauthorized' ? 401 : /Too many/.test(text) ? 429 : /setup|configured/.test(text) ? 503 : 400
  });
}
export function requireLive() {
  if (!isLive()) throw new Error('Live ordering is not configured yet. Please use preview mode.');
}
export async function indexes() {
  await db();
}
