import { NextRequest, NextResponse } from 'next/server';
import { col, fn, Op, literal } from 'sequelize';
import { BusinessPostModel, BusinessModel } from '@/feature/sqlORM/modelorm';
import { format, parse, addDays, addMonths } from 'date-fns';
/**
 * Line Graph API Route
 * 
 * This API endpoint provides data for rendering a line graph showing post counts over time.
 * Response Format:
 * {
 *   similar: [
 *     {
 *       business_id: string,
 *       business_name: string,
 *       counts: [
 *         {
 *           date: string, // Format: YYYY-MM
 *           count: number // Number of posts from start of month to date
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentBusinessId = searchParams.get("business_id");
    const allBusinessIds = searchParams.get("all_business_ids");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const level = searchParams.get("level");

    if (!currentBusinessId || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: business_id, start_date, end_date" },
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

    console.log(`[LineGraph] Parsed dates: startDateTime=${startDateTime.toISOString()}, endDateTime=${endDateTime.toISOString()}`);

    const allBusinessIdsArray = allBusinessIds
      ? [...new Set([currentBusinessId, ...allBusinessIds.split(',').map(id => id.trim())])]
      : [currentBusinessId];

    // Helper function: fetch monthly counts for a given business.
    async function fetchMonthlyCounts(bizId: string) {
      const rows = await BusinessPostModel.findAll({
        attributes: [
          [fn('to_char', col('last_update_time'), 'YYYY-MM'), 'month'],
          [fn('COUNT', literal('DISTINCT note_id')), 'count']
        ],
        where: {
          business_id: bizId,
          is_relevant: true,
          last_update_time: { [Op.lte]: endDateTime }
        },
        group: [fn('to_char', col('last_update_time'), 'YYYY-MM')],
        order: [[fn('to_char', col('last_update_time'), 'YYYY-MM'), 'ASC']]
      });

      // Generate all months between start and end date
      const allDates: string[] = [];
      let d = new Date(startDateTime);
      const end = new Date(endDateTime);
      // Set end date to the last day of the month to ensure we include the last month
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

    // Helper function: fetch daily counts for a given business.
    async function fetchDailyCountsWithFullDates(bizId: string) {
      const rows = await BusinessPostModel.findAll({
        attributes: [
          [fn('to_char', col('last_update_time'), 'yyyy-MM-dd'), 'day'],
          [fn('COUNT', literal('DISTINCT note_id')), 'count']
        ],
        where: {
          business_id: bizId,
          is_relevant: true,
          last_update_time: { [Op.lte]: endDateTime } // 
        },
        group: [fn('to_char', col('last_update_time'), 'yyyy-MM-dd')],
        order: [[fn('to_char', col('last_update_time'), 'yyyy-MM-dd'), 'ASC']]
      });

      let minDate = startDateTime;
      if (rows.length > 0) {
        const allRowDates = rows.map(row => row.get('day') as string);
        minDate = new Date(Math.min(...allRowDates.map(d => new Date(d).getTime())));
        if (minDate > startDateTime) minDate = startDateTime; 
      }

      const allDates: string[] = [];
      let d = new Date(minDate);
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

      //  only return data between startDateTime and endDateTime
      return dailyCounts.filter(item => new Date(item.date) >= startDateTime && new Date(item.date) <= endDateTime);
    }

    // Helper function: fetch the business name from the business table.
    async function getBusinessName(bizId: string): Promise<string> {
      const businessRow = await BusinessModel.findOne({
        where: { business_id: bizId } 
      });
      if (businessRow) {
        return businessRow.getDataValue("name") ||
               businessRow.getDataValue("business_name") ||
               `Business ${bizId}`;
      }
      return `Business ${bizId}`;
    }

    // Fetch all businesses monthly counts.
    const similarData = await Promise.all(allBusinessIdsArray.map(async (bizId) => {
      let counts;
      if (level === "daily") {
        counts = await fetchDailyCountsWithFullDates(bizId);
      }else{
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
      similar: similarData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
