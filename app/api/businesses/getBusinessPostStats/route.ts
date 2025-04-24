// /api/businesses/getBusinessPostStats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    if (!businessId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters: businessId, startDate, endDate" },
        { status: 400 }
      );
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Get total post count
    const totalPosts = await BusinessPostModel.count({
      where: {
        business_id: businessId,
        is_relevant: true,
        last_update_time: { [Op.between]: [startDateTime, endDateTime] }
      }
    });

    // Get platform breakdown
    const posts = await BusinessPostModel.findAll({
      attributes: ['platform'],
      where: {
        business_id: businessId,
        is_relevant: true,
        last_update_time: { [Op.between]: [startDateTime, endDateTime] }
      }
    });

    // Count posts by platform
    const platformBreakdown: Record<string, number> = {};
    
    posts.forEach(post => {
      const platform = post.getDataValue('platform');
      if (platform) {
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
      }
    });

    return NextResponse.json({
      totalPosts,
      platformBreakdown
    });
  } catch (err: any) {
    console.error('Error getting business post stats:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}