// app/api/auth/validate-login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ClientUsersModel } from "@/feature/sqlORM/modelorm";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Look up user with is_active status
    const userRec = await ClientUsersModel.findOne({
      where: { registered_email: email },
      attributes: ["id", "is_active"],
    });

    if (!userRec) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!userRec.is_active) {
      return NextResponse.json(
        { 
          error: "Your account is no longer active. Please contact administrators for assistance.",
          accountDisabled: true 
        },
        { status: 403 }
      );
    }

    // User exists and is active
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[Login Validation API] Database error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}