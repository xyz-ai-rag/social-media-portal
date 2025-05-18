import { NextRequest, NextResponse } from 'next/server';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';
import { Op } from 'sequelize';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");

    if (!business_id) {
      return NextResponse.json(
        { error: "Missing required parameter: business_id" },
        { status: 400 }
      );
    }

    // Get the earliest post date from the database for the specific business
    const earliestPost = await BusinessPostModel.findOne({
      attributes: ['last_update_time'],
      where: {
        business_id,
        is_relevant: true
      },
      order: [['last_update_time', 'ASC']]
    });

    const latestPost = await BusinessPostModel.findOne({
      attributes: ['last_update_time'],
      where: {
        business_id,
        is_relevant: true
      },  
      order: [['last_update_time', 'DESC']]
    });

    if (!earliestPost) {
      // If no posts found, return a default date (1 year ago)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return NextResponse.json({
        earliest_date: format(oneYearAgo, 'yyyy-MM-dd')
      });
    }
    if (!latestPost) {
      // If no posts found, return a default date (1 year ago)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return NextResponse.json({
        earliest_date: format(yesterday, 'yyyy-MM-dd')
      });
    }
    // Format the date as YYYY-MM-DD
    const earliestDate = format(new Date(earliestPost.last_update_time), 'yyyy-MM-dd');
    const latestDate = format(new Date(latestPost.last_update_time), 'yyyy-MM-dd');
    return NextResponse.json({
      earliest_date: earliestDate,
      latest_date: latestDate
    });
  } catch (error) {
    console.error('Error fetching earliest date:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earliest date' },
      { status: 500 }
    );
  }
} 