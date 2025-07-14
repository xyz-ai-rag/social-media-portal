import { NextRequest, NextResponse } from 'next/server';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';
import { Op } from 'sequelize';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const business_ids = searchParams.get("business_ids"); // comma-separated list
    const client_id = searchParams.get("client_id");

    const whereClause: any = { is_relevant: true };

    // Priority: single business_id > multiple business_ids > client_id
    if (business_id) {
      // Single business case
      whereClause.business_id = business_id;
    } else if (business_ids) {
      // Multiple businesses case (client-level with business IDs)
      const businessIdArray = business_ids.split(',').filter(id => id.trim());
      if (businessIdArray.length > 0) {
        whereClause.business_id = { [Op.in]: businessIdArray };
      } else {
        // Empty business_ids, return default dates
        return getDefaultDateRange();
      }
    } else if (client_id) {
      // Client-level case (would need to join with client-business mapping)
      // For now, return error since we don't have direct client_id in BusinessPostModel
      return NextResponse.json(
        { error: 'client_id filtering not implemented. Please use business_ids parameter.' },
        { status: 400 }
      );
    } else {
      // No filtering parameters provided - this should not happen
      return NextResponse.json(
        { error: 'Either business_id, business_ids, or client_id must be provided' },
        { status: 400 }
      );
    }

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
      return getDefaultDateRange();
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

function getDefaultDateRange() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return NextResponse.json({
    earliest_date: format(oneYearAgo, 'yyyy-MM-dd'),
    latest_date: format(yesterday, 'yyyy-MM-dd')
  });
}