import { BusinessPostModel, BusinessModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op, fn, col } from "sequelize";
import { parse, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all_business_ids = searchParams.get("all_business_ids");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!all_business_ids || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    const businessIds = all_business_ids.split(',').map(id => id.trim()).filter(Boolean);

    const posts = await BusinessPostModel.findAll({
      attributes: [
        'business_id',
        [fn('DATE_TRUNC', 'month', col('last_update_time')), 'month'],
        [fn('COUNT', col('note_id')), 'count']
      ],
      where: {
        business_id: { [Op.in]: businessIds },
        is_relevant: true,
        has_negative_or_criticism: true,
        last_update_time: { [Op.between]: [parse(start_date, 'yyyy-MM-dd HH:mm:ss', new Date()), parse(end_date, 'yyyy-MM-dd HH:mm:ss', new Date())] }
      },
      group: ['business_id', 'month'],
      raw: true
    });

    const businessMonthMap: Record<string, Record<string, number>> = {};
    posts.forEach((row: any) => {
      const businessId = row.business_id;
      const month = format(new Date(row.month), "yyyy-MM");
      const count = Number(row.count);
      if (!businessMonthMap[businessId]) businessMonthMap[businessId] = {};
      businessMonthMap[businessId][month] = count;
    });

    const businesses = await BusinessModel.findAll({
      where: { business_id: { [Op.in]: businessIds } },
      attributes: ['business_id', 'business_name'],
      raw: true,
    });
    const businessNameMap = new Map(businesses.map((b: any) => [b.business_id, b.business_name]));

    const series = Object.entries(businessMonthMap)
      .map(([businessId, monthData]) => ({
        businessId,
        businessName: businessNameMap.get(businessId) || '',
        data: Object.entries(monthData).map(([month, count]) => ({ month, count }))
      }))
      .filter(item => item.data.reduce((sum, d) => sum + d.count, 0) > 1);

    return NextResponse.json({ series });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
