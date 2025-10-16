// app/api/businesses/credit-cards/getTopUsers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Op, fn, col, literal, QueryTypes } from "sequelize";
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

    // Parse and validate dates
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
      `[Credit Card Users] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}`
    );

    // Use BusinessModel ORM to get similar businesses
    const businessData = await BusinessModel.findOne({
      where: {
        business_id: business_id
      },
      attributes: ['similar_businesses'],
      raw: true
    });

    // Extract business IDs - similar_businesses is an array column
    const similarBusinessIds = businessData?.similar_businesses || [];
    const businessIds = [business_id, ...similarBusinessIds];

    console.log(`[Credit Card Users] Fetching for ${businessIds.length} businesses`);

    // Use Sequelize ORM query for business posts
    const results = await BusinessPostModel.findAll({
      attributes: [
        'nickname',
        [fn('COUNT', col('*')), 'post_count']
      ],
      where: {
        business_id: {
          [Op.in]: businessIds
        },
        is_relevant: true,
        platform: 'xhs',
        last_update_time: {
          [Op.between]: [startDateTime, endDateTime]
        },
        nickname: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.ne]: '' }
          ]
        }
      },
      group: ['nickname'],
      order: [[literal('post_count'), 'DESC']],
      limit: 10,
      raw: true
    });

    console.log(`[Credit Card Users] Found ${results?.length || 0} users`);

    // Transform the results to match expected format
    const formattedResults = results.map((item: any) => ({
      nickname: item.nickname,
      post_count: parseInt(item.post_count, 10)
    }));

    return NextResponse.json(formattedResults);
  } catch (err: any) {
    console.error("[Credit Card Users] Error:", err);
    return NextResponse.json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}