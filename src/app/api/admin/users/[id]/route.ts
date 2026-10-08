import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { name, role, isActive, password } = await request.json();

    const data: any = {};
    if (typeof name === "string") data.name = name.trim();
    if (typeof role === "string") data.role = role;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (password && password.trim().length > 0) {
      data.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    // Prevent deactivating own account
    if (id === admin.userId && data.isActive === false) {
      return NextResponse.json(
        { error: "Nemůžete deaktivovat svůj vlastní administrátorský účet" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED" || error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Nemáte administrátorská oprávnění" }, { status: 403 });
    }
    return NextResponse.json({ error: "Chyba při úpravě uživatele" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (id === admin.userId) {
      return NextResponse.json(
        { error: "Nemůžete smazat svůj vlastní administrátorský účet" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED" || error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Nemáte administrátorská oprávnění" }, { status: 403 });
    }
    return NextResponse.json({ error: "Chyba při mazání uživatele" }, { status: 500 });
  }
}
