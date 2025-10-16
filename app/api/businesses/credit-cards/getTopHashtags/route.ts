// app/api/businesses/credit-cards/getTopHashtags/route.ts
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
      `[Credit Card Hashtags] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}`
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

    console.log(`[Credit Card Hashtags] Fetching for ${businessIds.length} businesses`);

    // Fetch all relevant posts using ORM
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
        english_tag_list: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.ne]: '' }
          ]
        }
      },
      attributes: ['english_tag_list'],
      raw: true
    });

    console.log(`[Credit Card Hashtags] Found ${posts.length} posts with tags`);

    // Process hashtags in JavaScript
    const hashtagMap = new Map<string, number>();

    posts.forEach((post: any) => {
      if (post.english_tag_list) {
        // Split by comma and process each tag
        const tags = post.english_tag_list.split(',');
        
        tags.forEach((tag: string) => {
          // Trim whitespace and remove # symbols
          const cleanTag = tag.trim().replace(/^#+|#+$/g, '').toLowerCase();
          
          if (cleanTag) {
            hashtagMap.set(cleanTag, (hashtagMap.get(cleanTag) || 0) + 1);
          }
        });
      }
    });

    // Convert map to array and sort by count
    const results = Array.from(hashtagMap.entries())
      .map(([hashtag, tag_count]) => ({ hashtag, tag_count }))
      .sort((a, b) => b.tag_count - a.tag_count)
      .slice(0, 20);

    console.log(`[Credit Card Hashtags] Found ${results.length} unique hashtags`);

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[Credit Card Hashtags] Error:", err);
    return NextResponse.json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
``