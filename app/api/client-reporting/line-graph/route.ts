import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel, BusinessModel } from '@/feature/sqlORM/modelorm';
import { format, parse } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentBusinessId = searchParams.get("business_id");
    const allBusinessIds = searchParams.get("all_business_ids");
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
    const allBusinessIdsArray = allBusinessIds
      ? allBusinessIds.split(',').map(id => id.trim())
      : [];

    // Helper function: fetch monthly counts for a given business.
    async function fetchMonthlyCounts(bizId: string) {
      const rows = await BusinessPostModel.findAll({
        attributes: ['last_update_time'],
        where: {
          business_id: bizId,
          is_relevant: true,
          last_update_time: { [Op.between]: [startDate, endDate] }
        },
        order: [['last_update_time', 'ASC']]
      });
      
      const monthMap: Record<string, number> = {};
      // Count posts per month.
      rows.forEach(row => {
        const created = row.getDataValue("last_update_time");
        const monthStr = format(new Date(created), 'yyyy-MM');
        monthMap[monthStr] = (monthMap[monthStr] || 0) + 1;
      });
      // Build a sorted array of monthly counts.
      const months = Object.keys(monthMap).sort();
      const monthly_counts = months.map(month => ({ date: month, count: monthMap[month] }));
      return monthly_counts;
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

    // Fetch current business monthly counts.
    const currentMonthlyCounts = await fetchMonthlyCounts(currentBusinessId);
    const currentBusinessName = await getBusinessName(currentBusinessId);
    const currentBusinessData = {
      business_id: currentBusinessId,
      business_name: currentBusinessName,
      monthly_counts: currentMonthlyCounts
    };

    // Fetch all businesses monthly counts.
    const similarData = await Promise.all(allBusinessIdsArray.map(async (bizId) => {
      const monthly_counts = await fetchMonthlyCounts(bizId);
      const business_name = await getBusinessName(bizId);
      return {
        business_id: bizId,
        business_name,
        monthly_counts
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
