import { BusinessPostModel, BusinessModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op, fn, col } from "sequelize";
import { parse, format, eachMonthOfInterval } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const all_business_ids = searchParams.get("all_business_ids");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!business_id || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    const businessIds = all_business_ids ? all_business_ids.split(',').map((id: string) => id.trim()).filter(Boolean) : [business_id];

    // Extract date part (YYYY-MM-DD) from the datetime string
    const startDate = start_date.split(' ')[0];
    const endDate = end_date.split(' ')[0];

    // Create datetime objects with UTC time
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const posts = await BusinessPostModel.findAll({
      attributes: [
        'business_id',
        [fn('to_char', col('last_update_time'), 'YYYY-MM'), 'month'],
        [fn('count', '*'), 'count']
      ],
      where: {
        business_id: { [Op.in]: businessIds },
        is_relevant: true,
        last_update_time: { [Op.between]: [startDateTime, endDateTime] },
        has_negative_or_criticism: true
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

    const allMonths = eachMonthOfInterval({
      start: parse(start_date, 'yyyy-MM-dd HH:mm:ss', new Date()),
      end: parse(end_date, 'yyyy-MM-dd HH:mm:ss', new Date())
    }).map(d => format(d, 'yyyy-MM'));

    const series = Object.entries(businessMonthMap)
      .map(([businessId, monthData]) => ({
        businessId,
        businessName: businessNameMap.get(businessId) || '',
        data: allMonths.map(month => ({
          month,
          count: monthData[month] || 0
        }))
      }))
      .filter(item => item.data.reduce((sum, d) => sum + d.count, 0) > 1);

    return NextResponse.json({ series });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
