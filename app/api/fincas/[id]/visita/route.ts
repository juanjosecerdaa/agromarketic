import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const visitorCookieName = "agromarket_visitor";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return new NextResponse(null, { status: 404 });
  }

  const finca = await prisma.finca.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });

  if (!finca) {
    return new NextResponse(null, { status: 404 });
  }

  const session = await auth();
  if (session?.user?.id === finca.ownerId) {
    return new NextResponse(null, { status: 204 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${visitorCookieName}=`))
    ?.slice(visitorCookieName.length + 1);
  const visitorKey = cookieValue || randomBytes(32).toString("hex");
  const visitorKeyHash = createHash("sha256")
    .update(visitorKey)
    .digest("hex");
  const now = new Date();
  const visitDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  await prisma.profileVisit.upsert({
    where: {
      fincaId_visitorKeyHash_visitDay: {
        fincaId: finca.id,
        visitorKeyHash,
        visitDay,
      },
    },
    create: {
      fincaId: finca.id,
      visitorKeyHash,
      visitDay,
    },
    update: {},
  });

  const response = new NextResponse(null, { status: 204 });
  if (!cookieValue) {
    response.cookies.set({
      name: visitorCookieName,
      value: visitorKey,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return response;
}
