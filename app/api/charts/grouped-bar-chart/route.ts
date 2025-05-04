import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { format, parse } from "date-fns";

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
    
    // Parse dates without timezone conversion
    const startDate = parse(start_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    const endDate = parse(end_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    console.log(`[BarChart] Query params: business_id=${business_id}, start_date=${start_date}, end_date=${end_date}`);
    console.log(`[BarChart] Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

    // Query posts for the given business and date range.
    const posts = await BusinessPostModel.findAll({
      attributes: ['note_id', 'last_update_time', 'platform'], // Added platform for comparison
      where: {
        business_id,
        is_relevant: true,
        last_update_time: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [["last_update_time", "ASC"]]
    });

    console.log(`[BarChart] Total posts found: ${posts.length}`);
    // console.log(`[BarChart] First 5 posts:`, posts.slice(0, 5).map(p => ({
    //   note_id: p.getDataValue('note_id'),
    //   platform: p.getDataValue('platform'),
    //   date: new Date(p.getDataValue('last_update_time')).toISOString()
    // })));

    // Track unique note_ids to check for duplicates
    const uniqueNoteIds = new Set<string>();
    posts.forEach(post => {
      uniqueNoteIds.add(post.getDataValue("note_id"));
    });
    console.log(`[BarChart] Total unique note_ids: ${uniqueNoteIds.size}`);

    // Initialize daily counts.
    const counts: Record<string, number> = {};
    const dailyKeys: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = format(d, 'yyyy-MM-dd');
      counts[key] = 0;
      dailyKeys.push(key);
    }

    // Count posts per day.
    posts.forEach(post => {
      const dt = new Date(post.getDataValue("last_update_time"));
      const key = format(dt, 'yyyy-MM-dd');
      if (counts[key] !== undefined) {
        counts[key]++;
      } else {
        // Log posts that don't match any key
        console.log(`[BarChart] Post with date ${dt.toISOString()} (key: ${key}) doesn't match any initialized day`);
      }
    });

    // console.log(`[BarChart] Daily counts:`, counts);
    
    // Build an ordered array of daily counts.
    const dailyCounts = dailyKeys.map(key => ({ date: key, count: counts[key] }));
    
    const totalPosts = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`[BarChart] Total posts in dailyCounts: ${totalPosts}`);
    console.log(`[BarChart] Response array length: ${dailyCounts.length}`);

    return NextResponse.json(dailyCounts);
  } catch (error: any) {
    console.error(`[BarChart] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}