// /api/charts/similar-line/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel, BusinessModel } from '@/feature/sqlORM/modelorm';
import { format, parse } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentBusinessId = searchParams.get("business_id");
    const similarIdsParam = searchParams.get("similar_business_ids");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

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

    // Parse similar business IDs from comma-delimited string.
    const similarBusinessIds = similarIdsParam
      ? similarIdsParam.split(',').map(id => id.trim())
      : [];

    // Helper function: fetch daily counts for a given business.
    async function fetchDailyCounts(bizId: string) {
      const rows = await BusinessPostModel.findAll({
        attributes: ['last_update_time'],
        where: {
          business_id: bizId,
          is_relevant: true,
          last_update_time: { [Op.between]: [startDate, endDate] }
        },
        order: [['last_update_time', 'ASC']]
      });
      
      const dayMap: Record<string, number> = {};
      const days: string[] = [];
      // Initialize a count for every day in the range.
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayStr = format(d, 'yyyy-MM-dd');
        dayMap[dayStr] = 0;
        days.push(dayStr);
      }
      
      // Count posts per day.
      rows.forEach(row => {
        const created = row.getDataValue("last_update_time");
        const dayStr = format(new Date(created), 'yyyy-MM-dd');
        if (dayMap.hasOwnProperty(dayStr)) {
          dayMap[dayStr]++;
        }
      });
      
      // Build a sorted array of daily counts.
      const daily_counts = days.map(day => ({ date: day, count: dayMap[day] }));
      return daily_counts;
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

    // Fetch current business daily counts.
    const currentDailyCounts = await fetchDailyCounts(currentBusinessId);
    const currentBusinessName = await getBusinessName(currentBusinessId);
    const currentBusinessData = {
      business_id: currentBusinessId,
      business_name: currentBusinessName,
      daily_counts: currentDailyCounts
    };

    // Fetch similar businesses daily counts.
    const similarData = await Promise.all(similarBusinessIds.map(async (bizId) => {
      const daily_counts = await fetchDailyCounts(bizId);
      const business_name = await getBusinessName(bizId);
      return {
        business_id: bizId,
        business_name,
        daily_counts
      };
    }));

    return NextResponse.json({
      current: currentBusinessData,
      similar: similarData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
