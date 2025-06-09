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

    // Parse dates without timezone conversion
    const startDate = parse(start_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    const endDate = parse(end_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    console.log(`[LineGraph] Query params: business_id=${currentBusinessId}, start_date=${start_date}, end_date=${end_date}`);
    console.log(`[LineGraph] Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

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
          last_update_time: { [Op.lte]: endDate }
        },
        group: [fn('to_char', col('last_update_time'), 'YYYY-MM')],
        order: [[fn('to_char', col('last_update_time'), 'YYYY-MM'), 'ASC']]
      });

      // Generate all months between start and end date
      const allDates: string[] = [];
      let d = new Date(startDate);
      const end = new Date(endDate);
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
          last_update_time: { [Op.lte]: endDate } // 
        },
        group: [fn('to_char', col('last_update_time'), 'yyyy-MM-dd')],
        order: [[fn('to_char', col('last_update_time'), 'yyyy-MM-dd'), 'ASC']]
      });

      let minDate = startDate;
      if (rows.length > 0) {
        const allRowDates = rows.map(row => row.get('day') as string);
        minDate = new Date(Math.min(...allRowDates.map(d => new Date(d).getTime())));
        if (minDate > startDate) minDate = startDate; 
      }

      const allDates: string[] = [];
      let d = new Date(minDate);
      const end = new Date(endDate);
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

      //  only return data between startDate and endDate
      return dailyCounts.filter(item => new Date(item.date) >= startDate && new Date(item.date) <= endDate);
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
