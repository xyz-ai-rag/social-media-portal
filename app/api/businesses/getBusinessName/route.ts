import { BusinessModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to get business information by ID
 * GET /api/business/:businessId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Find the business by ID
    const business = await BusinessModel.findOne({
      where: { business_id: businessId },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Return the business data
    return NextResponse.json({
      business_id: business.business_id,
      business_name: business.business_name,
      business_city: business.business_city,
      business_type: business.business_type,
      last_crawled_time: business.last_crawled_time,
    });
  } catch (error: any) {
    console.error("Error fetching business:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch business information" },
      { status: 500 }
    );
  }
}
