// Fixed LineGraph API - Client Level
import { NextRequest, NextResponse } from 'next/server';
import { col, fn, Op, literal } from 'sequelize';
import { BusinessPostModel, BusinessModel } from '@/feature/sqlORM/modelorm';
import { format, addDays, addMonths } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const businessId = searchParams.get("business_id"); // Single business ID
    const businessIds = searchParams.get("business_ids"); // Comma-separated list
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const date_level = searchParams.get("date_level") || "monthly";

    if (!clientId || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: client_id, start_date, end_date" },
        { status: 400 }
      );
    }

    // Extract date part (YYYY-MM-DD) from the datetime string
    const startDate = start_date.split(' ')[0];
    const endDate = end_date.split(' ')[0];

    // Create datetime objects with UTC time
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    console.log(`[LineGraph] Client-level reporting for clientId=${clientId}, dates: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);

    // Get all business IDs for this client
    let allBusinessIdsArray: string[] = [];
    
    if (businessId) {
      // Single business ID provided - use it
      allBusinessIdsArray = [businessId];
      console.log(`[LineGraph] Using single businessId: ${businessId}`);
    } else if (businessIds) {
      // Multiple business IDs provided - use them
      allBusinessIdsArray = businessIds.split(',').map(id => id.trim()).filter(id => id);
      console.log(`[LineGraph] Using multiple businessIds: ${allBusinessIdsArray}`);
    } else {
      // No business IDs provided - get all businesses for this client
      const businesses = await BusinessModel.findAll({
        where: { client_id: clientId },
        attributes: ['business_id'],
        raw: true
      });
      allBusinessIdsArray = businesses.map(b => b.business_id);
      console.log(`[LineGraph] Fetched all businesses for client: ${allBusinessIdsArray}`);
    }

    if (allBusinessIdsArray.length === 0) {
      return NextResponse.json({
        businesses: []
      });
    }

    console.log(`[LineGraph] Processing ${allBusinessIdsArray.length} businesses:`, allBusinessIdsArray);

    // Helper function: fetch monthly counts for a given business
    async function fetchMonthlyCounts(bizId: string) {
      const rows = await BusinessPostModel.findAll({
        attributes: [
          [fn('to_char', col('last_update_time'), 'YYYY-MM'), 'month'],
          [fn('COUNT', literal('DISTINCT note_id')), 'count']
        ],
        where: {
          business_id: bizId,
          is_relevant: true,
          description: {
            [Op.ne]: "nan",
          },
          last_update_time: { 
            [Op.gte]: startDateTime,
            [Op.lte]: endDateTime 
          }
        },
        group: [fn('to_char', col('last_update_time'), 'YYYY-MM')],
        order: [[fn('to_char', col('last_update_time'), 'YYYY-MM'), 'ASC']]
      });

      // Generate all months between start and end date
      const allDates: string[] = [];
      let d = new Date(startDateTime);
      const end = new Date(endDateTime);
      
      // Set to beginning of start month and end of end month
      d.setDate(1);
      end.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      
      while (d <= end) {
        allDates.push(format(new Date(d), 'yyyy-MM'));
        d = addMonths(d, 1);
      }

      // Create a map of date to count
      const dateToCount = Object.fromEntries(
        rows.map(row => [row.get('month') as string, parseInt(row.get('count') as string)])
      );

      // Generate counts for all months, using 0 for months with no data
      const monthlyCounts = allDates.map(date => ({
        date,
        count: dateToCount[date] || 0
      }));

      return monthlyCounts;
    }

    // Helper function: fetch daily counts for a given business
    async function fetchDailyCounts(bizId: string) {
      const rows = await BusinessPostModel.findAll({
        attributes: [
          [fn('to_char', col('last_update_time'), 'yyyy-MM-dd'), 'day'],
          [fn('COUNT', literal('DISTINCT note_id')), 'count']
        ],
        where: {
          business_id: bizId,
          is_relevant: true,
          last_update_time: { 
            [Op.gte]: startDateTime,
            [Op.lte]: endDateTime 
          }
        },
        group: [fn('to_char', col('last_update_time'), 'yyyy-MM-dd')],
        order: [[fn('to_char', col('last_update_time'), 'yyyy-MM-dd'), 'ASC']]
      });

      // Generate all dates between start and end
      const allDates: string[] = [];
      let d = new Date(startDateTime);
      const end = new Date(endDateTime);
      
      while (d <= end) {
        allDates.push(format(new Date(d), 'yyyy-MM-dd'));
        d = addDays(d, 1);
      }

      const dateToCount = Object.fromEntries(
        rows.map(row => [row.get('day') as string, parseInt(row.get('count') as string)])
      );

      const dailyCounts = allDates.map(date => ({
        date,
        count: dateToCount[date] || 0
      }));

      return dailyCounts;
    }

    // Helper function: fetch the business name from the business table
    async function getBusinessName(bizId: string): Promise<string> {
      const businessRow = await BusinessModel.findOne({
        where: { business_id: bizId },
        attributes: ['business_name']
      });
      
      if (businessRow) {
        return businessRow.getDataValue("business_name") || `Business ${bizId}`;
      }
      return `Business ${bizId}`;
    }

    // Fetch all businesses' counts
    const businessesData = await Promise.all(allBusinessIdsArray.map(async (bizId) => {
      let counts;
      if (date_level === "daily") {
        counts = await fetchDailyCounts(bizId);
      } else {
        counts = await fetchMonthlyCounts(bizId);
      }
      
      const business_name = await getBusinessName(bizId);
      
      return {
        business_id: bizId,
        business_name,
        counts: counts
      };
    }));

    return NextResponse.json({
      businesses: businessesData
    });
    
  } catch (error: any) {
    console.error('[LineGraph API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}