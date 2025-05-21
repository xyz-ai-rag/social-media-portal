import { BusinessModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { businessIds } = requestBody;

    if (
      !businessIds ||
      !Array.isArray(businessIds) ||
      businessIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Valid array of business IDs is required" },
        { status: 400 }
      );
    }

    // Find all businesses with the provided IDs
    const businesses = await BusinessModel.findAll({
      where: {
        business_id: {
          [Op.in]: businessIds,
        },
      },
      attributes: [
        "business_id",
        "business_name",
        "business_city",
        "business_type",
        "last_crawled_time",
      ],
    });

    // Return the businesses data
    return NextResponse.json({
      businesses: businesses.map((business) => ({
        business_id: business.business_id,
        business_name: business.business_name,
        business_city: business.business_city,
        business_type: business.business_type,
        last_crawled_time: business.last_crawled_time,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching businesses:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch business information" },
      { status: 500 }
    );
  }
}
