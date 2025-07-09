import { BusinessModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to get business tier information
 * GET /api/businesses/getBusinessTier?businessId=xxx
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

    // Find the business by ID and get tier information
    const business = await BusinessModel.findOne({
      where: { business_id: businessId },
      attributes: ['business_id', 'business_name', 'is_free_tier', 'last_crawled_time']
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Return the business tier data
    return NextResponse.json({
      business_id: business.business_id,
      business_name: business.business_name,
      is_free_tier: business.is_free_tier,
      last_updated: business.last_crawled_time,
    });
  } catch (error: any) {
    console.error("Error fetching business tier:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch business tier information" },
      { status: 500 }
    );
  }
}