import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roles = [
  { name: "BUYER", description: "Usuario comprador del marketplace." },
  { name: "FARMER", description: "Usuario ganadero que publica animales." },
  { name: "ADMIN", description: "Usuario administrador de la plataforma." },
];

try {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
} finally {
  await prisma.$disconnect();
}
