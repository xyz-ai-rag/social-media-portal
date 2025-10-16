// app/api/businesses/credit-cards/getPostCategoryStats/route.ts
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
      `[Post Category Stats] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}`
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

    console.log(`[Post Category Stats] Fetching for ${businessIds.length} businesses`);

    // Fetch all relevant posts with category
    const posts = await BusinessPostModel.findAll({
      where: {
        business_id: {
          [Op.in]: businessIds
        },
        is_relevant: true,
        platform: 'xhs',
        last_update_time: {
          [Op.between]: [startDateTime, endDateTime]
        }
      },
      attributes: ['post_category'],
      raw: true
    });

    console.log(`[Post Category Stats] Found ${posts.length} posts`);

    // Count by category with lowercase check
    let commercialCount = 0;
    let organicCount = 0;

    posts.forEach((post: any) => {
      const category = post.post_category?.toString().toLowerCase() || '';
      
      if (category.includes('commercial') || category === 'commercial post') {
        commercialCount++;
      } else if (category.includes('organic') || category === 'organic post') {
        organicCount++;
      } else {
        // If category is not specified or unknown, count as organic
        organicCount++;
      }
    });

    const totalCount = posts.length;

    const postCategoryStats = [
      {
        category: 'Commercial post',
        count: commercialCount,
        percentage: totalCount > 0 ? Number(((commercialCount / totalCount) * 100).toFixed(1)) : 0
      },
      {
        category: 'Organic post',
        count: organicCount,
        percentage: totalCount > 0 ? Number(((organicCount / totalCount) * 100).toFixed(1)) : 0
      }
    ].filter(stat => stat.count > 0);

    return NextResponse.json({
      postCategoryStats,
      totalCount
    });
  } catch (err: any) {
    console.error("[Post Category Stats] Error:", err);
    return NextResponse.json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}