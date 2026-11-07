import { ROLES, type RoleName } from "./roles";

export function isSafeInternalPath(value: string | null | undefined) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

export function getRoleDestination(roles: readonly RoleName[]) {
  if (roles.includes(ROLES.ADMIN)) {
    return "/admin";
  }

  if (roles.includes(ROLES.FARMER)) {
    return "/dashboard";
  }

  if (roles.includes(ROLES.BUYER)) {
    return "/catalogo";
  }

  return null;
}

export function getAuthorizedDestination(
  roles: readonly RoleName[],
  callbackUrl?: string | null,
) {
  const normalDestination = getRoleDestination(roles);

  if (!normalDestination) {
    return null;
  }

  if (
    typeof callbackUrl !== "string" ||
    !isSafeInternalPath(callbackUrl)
  ) {
    return normalDestination;
  }

  const safeCallbackUrl = callbackUrl;
  const isAdmin = roles.includes(ROLES.ADMIN);
  const isFarmer = roles.includes(ROLES.FARMER);
  const isBuyer = roles.includes(ROLES.BUYER);

  if (
    safeCallbackUrl === "/admin" ||
    safeCallbackUrl.startsWith("/admin/")
  ) {
    return isAdmin ? safeCallbackUrl : normalDestination;
  }

  if (
    safeCallbackUrl === "/dashboard" ||
    safeCallbackUrl.startsWith("/dashboard/")
  ) {
    return isAdmin || isFarmer ? safeCallbackUrl : normalDestination;
  }

  return normalDestination;
}
