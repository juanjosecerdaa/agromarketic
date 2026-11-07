import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthorizedDestination } from "@/lib/auth/redirects";
import { ROLES } from "@/lib/auth/roles";

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const session = request.auth;
  const user =
    session?.user?.status === "ACTIVE" && session.user.roles.length > 0
      ? session.user
      : null;

  if (pathname === "/login" || pathname === "/registro") {
    if (user) {
      const destination = getAuthorizedDestination(user.roles);
      if (destination) {
        return NextResponse.redirect(new URL(destination, request.url));
      }
    }

    return NextResponse.next();
  }

  const callbackUrl =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin")
    ? pathname
    : "/admin";

  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, request.url),
    );
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (user.roles.includes(ROLES.ADMIN)) {
      return NextResponse.next();
    }

    const destination = getAuthorizedDestination(user.roles);
    return destination
      ? NextResponse.redirect(new URL(destination, request.url))
      : NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  ) {
    if (
      user.roles.includes(ROLES.ADMIN) ||
      user.roles.includes(ROLES.FARMER)
    ) {
      return NextResponse.next();
    }

    const destination = getAuthorizedDestination(user.roles);
    return destination
      ? NextResponse.redirect(new URL(destination, request.url))
      : NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/registro"],
};
