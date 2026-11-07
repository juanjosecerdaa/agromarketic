import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const readline = createInterface({ input, output });

class PromotionError extends Error {}

try {
  const enteredEmail = await readline.question(
    "Correo del usuario ACTIVE que será promovido: ",
  );
  const email = enteredEmail.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    throw new PromotionError("El correo electrónico no es válido.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      status: true,
      id: true,
    },
  });

  if (!user) {
    throw new PromotionError("No existe un usuario con ese correo.");
  }

  if (user.status !== "ACTIVE") {
    throw new PromotionError("El usuario no está ACTIVE.");
  }

  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" },
    select: { id: true },
  });

  if (!adminRole) {
    throw new PromotionError("El rol ADMIN no existe.");
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });

  console.log("La cuenta fue promovida al rol ADMIN correctamente.");
} catch (error) {
  console.error(
    error instanceof PromotionError
      ? error.message
      : "No fue posible completar la promoción.",
  );
  process.exitCode = 1;
} finally {
  readline.close();
  await prisma.$disconnect();
}
