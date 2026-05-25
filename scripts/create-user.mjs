import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const validRoles = new Set(["ADMIN", "FINANCE", "DIRECTOR", "MANAGER", "VIEWER"]);

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      result[key] = "";
      continue;
    }
    result[key] = value;
    index += 1;
  }
  return result;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const email = String(args.email ?? "").trim().toLowerCase();
const password = String(args.password ?? "");
const name = String(args.name ?? "").trim();
const role = String(args.role ?? "").trim().toUpperCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("Invalid or missing --email.");
}

if (password.length < 8) {
  fail("Invalid or missing --password. Use at least 8 characters.");
}

if (!validRoles.has(role)) {
  fail(`Invalid --role. Use one of: ${Array.from(validRoles).map((value) => value.toLowerCase()).join(", ")}.`);
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: name || null,
      role: UserRole[role],
      active: true,
      passwordHash,
    },
    create: {
      email,
      name: name || null,
      role: UserRole[role],
      active: true,
      passwordHash,
    },
  });

  console.log(`${existing ? "Updated" : "Created"} user ${user.email} with role ${user.role}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Failed to create or update user.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
