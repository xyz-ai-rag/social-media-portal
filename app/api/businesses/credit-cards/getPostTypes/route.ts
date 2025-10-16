// app/api/businesses/credit-cards/getPostTypeStats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { BusinessPostModel, BusinessModel } from "@/feature/sqlORM/modelorm";

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
          received: { start_date, end_date }
        },
        { status: 400 }
      );
    }

    console.log(
      `[Post Type Stats] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}`
    );

    // Get similar businesses
    const businessData = await BusinessModel.findOne({
      where: {
        business_id: business_id
      },
      attributes: ['similar_businesses'],
      raw: true
    });

    const similarBusinessIds = businessData?.similar_businesses || [];
    const businessIds = [business_id, ...similarBusinessIds];

    console.log(`[Post Type Stats] Fetching for ${businessIds.length} businesses`);

    // Fetch all relevant posts
    const posts = await BusinessPostModel.findAll({
      where: {
        business_id: {
          [Op.in]: businessIds
        },
        is_relevant: true,
        platform: 'xhs',
        last_update_time: {
          [Op.between]: [startDateTime, endDateTime]
        },
        type: {
          [Op.ne]: null
        }
      },
      attributes: ['type'],
      raw: true
    });

    console.log(`[Post Type Stats] Found ${posts.length} posts`);

    // Count by type
    const typeCount = new Map<string, number>();
    posts.forEach((post: any) => {
      const type = post.type || 'Unknown';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });

    const totalCount = posts.length;

    // Convert to array with percentages
    const postTypeStats = Array.from(typeCount.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      postTypeStats,
      totalCount
    });
  } catch (err: any) {
    console.error("[Post Type Stats] Error:", err);
    return NextResponse.json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}