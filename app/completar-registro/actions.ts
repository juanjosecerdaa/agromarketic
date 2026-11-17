"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getRoleDestination } from "@/lib/auth/redirects";
import { isRoleName, ROLES, type RoleName } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const phonePattern = /^[0-9+()\-\s.]+$/;

export type CompleteRegistrationState = {
  error?: string;
};

type OnboardingResult =
  | { type: "completed"; roleName: RoleName }
  | { type: "missing" | "suspended" | "not-google" | "not-pending" }
  | { type: "roles"; roleNames: string[] }
  | {
      type:
        | "invalid-phone"
        | "invalid-role"
        | "role-unavailable"
        | "conflict";
    };

const onboardingUserSelect = {
  status: true,
  roles: {
    select: {
      role: { select: { name: true } },
    },
  },
  accounts: {
    where: { provider: "google" },
    select: { provider: true },
    take: 1,
  },
} satisfies Prisma.UserSelect;

async function getCurrentOnboardingResult(
  userId: string,
): Promise<OnboardingResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: onboardingUserSelect,
  });

  if (!user) {
    return { type: "missing" };
  }

  if (user.status === "SUSPENDED") {
    return { type: "suspended" };
  }

  if (user.roles.length > 0) {
    return {
      type: "roles",
      roleNames: user.roles.map(({ role }) => role.name),
    };
  }

  if (user.accounts.length === 0) {
    return { type: "not-google" };
  }

  if (user.status !== "PENDING") {
    return { type: "not-pending" };
  }

  return { type: "conflict" };
}

function redirectForExistingRoles(roleNames: string[]): never {
  const roles = roleNames.filter(isRoleName);
  redirect(getRoleDestination(roles) ?? "/login");
}

function redirectForResult(
  result: OnboardingResult,
): CompleteRegistrationState {
  switch (result.type) {
    case "completed":
      redirect(getRoleDestination([result.roleName]) ?? "/login");
    case "roles":
      redirectForExistingRoles(result.roleNames);
    case "suspended":
      redirect("/login?error=AccessDenied");
    case "role-unavailable":
      return {
        error: "El tipo de cuenta seleccionado todavía no está disponible.",
      };
    case "invalid-role":
      return { error: "Selecciona un tipo de cuenta válido." };
    case "invalid-phone":
      return { error: "Ingresa un teléfono válido." };
    case "conflict":
      return {
        error: "La cuenta cambió mientras se completaba. Actualiza la página e inténtalo de nuevo.",
      };
    case "missing":
    case "not-google":
    case "not-pending":
      redirect("/login");
  }
}

export async function completeGoogleRegistration(
  _previousState: CompleteRegistrationState,
  formData: FormData,
): Promise<CompleteRegistrationState> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  let result: OnboardingResult;

  try {
    result = await prisma.$transaction(
      async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
          select: onboardingUserSelect,
        });

        if (!user) {
          return { type: "missing" };
        }

        if (user.status === "SUSPENDED") {
          return { type: "suspended" };
        }

        if (user.roles.length > 0) {
          return {
            type: "roles",
            roleNames: user.roles.map(({ role }) => role.name),
          };
        }

        if (user.accounts.length === 0) {
          return { type: "not-google" };
        }

        if (user.status !== "PENDING") {
          return { type: "not-pending" };
        }

        const phoneValue = formData.get("phone");

        if (typeof phoneValue !== "string") {
          return { type: "invalid-phone" };
        }

        const normalizedPhone = phoneValue.trim();

        if (
          !normalizedPhone ||
          normalizedPhone.length > 30 ||
          !phonePattern.test(normalizedPhone)
        ) {
          return { type: "invalid-phone" };
        }

        const digitCount = normalizedPhone.replace(/\D/g, "").length;

        if (digitCount < 7 || digitCount > 15) {
          return { type: "invalid-phone" };
        }

        const selectedRole = formData.get("accountType");

        if (selectedRole !== ROLES.BUYER && selectedRole !== ROLES.FARMER) {
          return { type: "invalid-role" };
        }

        const role = await transaction.role.findUnique({
          where: { name: selectedRole },
          select: { id: true },
        });

        if (!role) {
          return { type: "role-unavailable" };
        }

        const activation = await transaction.user.updateMany({
          where: { id: userId, status: "PENDING" },
          data: { status: "ACTIVE", phone: normalizedPhone },
        });

        if (activation.count !== 1) {
          return { type: "conflict" };
        }

        await transaction.userRole.create({
          data: { userId, roleId: role.id },
        });

        return { type: "completed", roleName: selectedRole };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      result = await getCurrentOnboardingResult(userId);
    } else {
      throw error;
    }
  }

  return redirectForResult(result);
}
