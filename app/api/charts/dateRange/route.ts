import { NextRequest, NextResponse } from 'next/server';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';
import { Op } from 'sequelize';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");

    // Build where clause based on whether business_id is provided
    const whereClause = business_id 
      ? { business_id, is_relevant: true }
      : { is_relevant: true };

    // Get the earliest post date from the database
    const earliestPost = await BusinessPostModel.findOne({
      attributes: ['last_update_time'],
      where: whereClause,
      order: [['last_update_time', 'ASC']]
    });

    const latestPost = await BusinessPostModel.findOne({
      attributes: ['last_update_time'],
      where: whereClause,
      order: [['last_update_time', 'DESC']]
    });

    // If no posts found, return default dates
    if (!earliestPost || !latestPost) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      return NextResponse.json({
        earliest_date: format(oneYearAgo, 'yyyy-MM-dd'),
        latest_date: format(yesterday, 'yyyy-MM-dd')
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
    console.error('Error fetching date range:', error);
    return NextResponse.json(
      { error: 'Failed to fetch date range' },
      { status: 500 }
    );
  }
} 