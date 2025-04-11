// /api/charts/grouped-bar-chart/route.ts
import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!business_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: business_id, start_date, end_date" },
        { status: 400 }
      );
    }
    
    // Convert date strings to Date objects.
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Query posts for the given business and date range.
    const posts = await BusinessPostModel.findAll({
      attributes: ['note_id', 'last_update_time'],
      where: {
        business_id,
        is_relevant: true,
        last_update_time: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [["last_update_time", "ASC"]]
    });

    // Initialize daily counts.
    const counts: Record<string, number> = {};
    const dailyKeys: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      counts[key] = 0;
      dailyKeys.push(key);
    }

    // Count posts per day.
    posts.forEach(post => {
      const dt = new Date(post.getDataValue("last_update_time"));
      const key = dt.toISOString().slice(0, 10);
      if (counts[key] !== undefined) {
        counts[key]++;
      }
    });

    // Build an ordered array of daily counts.
    const dailyCounts = dailyKeys.map(key => ({ date: key, count: counts[key] }));
    
    return NextResponse.json(dailyCounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
