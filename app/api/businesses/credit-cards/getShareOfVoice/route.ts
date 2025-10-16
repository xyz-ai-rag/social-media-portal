// app/api/businesses/credit-cards/getShareOfVoice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { QueryTypes } from "sequelize";
import { sequelizeDbConnection } from "@/feature/sqlORM/sqlDbConnection";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!business_id || !start_date || !end_date) {
      return NextResponse.json(
        {
          error: "Missing required parameters: business_id, start_date, end_date",
        },
        { status: 400 }
      );
    }

    const startDateTime = new Date(start_date);
    const endDateTime = new Date(end_date);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid date format. Expected ISO 8601 format.",
          received: { start_date, end_date },
        },
        { status: 400 }
      );
    }

    console.log(
      `[Share of Voice] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}`
    );

    // Get the business and its similar businesses
    const businessQuery = `
      SELECT business_id, business_name, similar_businesses
      FROM business
      WHERE business_id = $1
    `;

    const businessResult = await sequelizeDbConnection.query(businessQuery, {
      bind: [business_id],
      type: QueryTypes.SELECT,
    });

    if (!businessResult || businessResult.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const business: any = businessResult[0];
    const similarBusinessIds = business.similar_businesses || [];
    const allBusinessIds = [business_id, ...similarBusinessIds];

    console.log(`[Share of Voice] Fetching for ${allBusinessIds.length} businesses`);

    // Query based on your SQL
    const query = `
      SELECT 
        b.business_name,
        b.business_id,
        COUNT(*) AS total_posts
      FROM business_posts bp
      JOIN business b ON bp.business_id = b.business_id
      WHERE bp.business_id = ANY($1::uuid[])
        AND bp.is_relevant = true
        AND bp.platform = 'xhs'
        AND bp.last_update_time BETWEEN $2 AND $3
      GROUP BY b.business_id, b.business_name
      ORDER BY total_posts DESC
    `;

    const results: any[] = await sequelizeDbConnection.query(query, {
      bind: [allBusinessIds, startDateTime.toISOString(), endDateTime.toISOString()],
      type: QueryTypes.SELECT,
    });

    // Calculate total posts across all businesses
    const totalPosts = results.reduce((sum, item) => sum + parseInt(item.total_posts), 0);

    // Calculate percentage for each business
    const voiceData = results.map((item) => ({
      business_name: item.business_name,
      business_id: item.business_id,
      total_posts: parseInt(item.total_posts),
      percentage: totalPosts > 0 ? Number(((parseInt(item.total_posts) / totalPosts) * 100).toFixed(1)) : 0,
    }));

    console.log(`[Share of Voice] Found ${voiceData.length} businesses with total ${totalPosts} posts`);

    return NextResponse.json(voiceData);
  } catch (err: any) {
    console.error("[Share of Voice] Error:", err);
    return NextResponse.json(
      {
        error: err.message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}