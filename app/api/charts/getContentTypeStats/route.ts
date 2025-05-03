import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';
import { format, parse } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!business_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: businessId, startDate, endDate" },
        { status: 400 }
      );
    }

   // Parse dates without timezone conversion
   const startDate = parse(start_date, 'yyyy-MM-dd HH:mm:ss', new Date());
   const endDate = parse(end_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    
   if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  console.log(`[ContentTypeStats] Query params: business_id=${business_id}, start_date=${start_date}, end_date=${end_date}`);
  console.log(`[ContentTypeStats] Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

    // Get total post count
    const totalPosts = await BusinessPostModel.count({
      where: {
        business_id,
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] }
      }
    });
    console.log(`[ContentTypeStats] Total posts found: ${totalPosts}`);

    // Get content type breakdown
    const posts = await BusinessPostModel.findAll({
      attributes: ['type'],
      where: {
        business_id,
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] }
      }
    });

    // Count posts by type
    const typeCounts: Record<string, number> = {};
    posts.forEach(post => {
      const type = post.getDataValue('type');
      if (type) {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    });

    // Map type codes to display names
    // TODO: ensure this is correct
    const typeMapping: Record<string, string> = {
      'video': 'Video',
      'photo': 'Photo',
      'text': 'Text'
    };

    // Convert to array of counts with display names
    const contentTypeStats = Object.entries(typeCounts).map(([type, count]) => ({
      type: typeMapping[type] || type,
      count,
      percentage: Math.round((count / totalPosts) * 100)
    }));

    return NextResponse.json({
      contentTypeStats,
      totalCount: totalPosts
    });
  } catch (error: any) {
    console.error(`[ContentTypeStats] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 