import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { format, parse, startOfDay, endOfDay } from "date-fns";

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
    
    // Parse dates and ensure start_date is always at 00:00:00 and end_date is at 23:59:59
    let startDate = parse(start_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    let endDate = parse(end_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    
    // Set the time components explicitly
    startDate.setHours(0, 0, 0, 0);  // Set to beginning of day (00:00:00.000)
    endDate.setHours(23, 59, 59, 999);  // Set to end of day (23:59:59.999)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    console.log(`[BarChart] Query params: business_id=${business_id}, start_date=${start_date}, end_date=${end_date}`);
    console.log(`[BarChart] Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

    // Query posts for the given business and date range.
    const posts = await BusinessPostModel.findAll({
      attributes: ['note_id', 'last_update_time', 'platform'],
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

    // Track unique note_ids to check for duplicates
    const uniqueNoteIds = new Set<string>();
    posts.forEach(post => {
      uniqueNoteIds.add(post.getDataValue("note_id"));
    });
    console.log(`[BarChart] Total unique note_ids: ${uniqueNoteIds.size}`);

    // Get min and max dates from the actual data to ensure we cover all posts
    let minDate = startDate;
    let maxDate = endDate;
    
    posts.forEach(post => {
      const postDate = new Date(post.getDataValue("last_update_time"));
      if (postDate < minDate) minDate = postDate;
      if (postDate > maxDate) maxDate = postDate;
    });
    
    // Initialize daily counts with the entire range that covers all data
    const counts: Record<string, number> = {};
    const dailyKeys: string[] = [];
    
    // Use startOfDay for the minDate to ensure we start at the beginning of the day
    // Use endOfDay for the maxDate to ensure we include the entire last day
    for (let d = startOfDay(minDate); d <= endOfDay(maxDate); d.setDate(d.getDate() + 1)) {
      const key = format(d, 'yyyy-MM-dd');
      counts[key] = 0;
      dailyKeys.push(key);
    }

    // Count posts per day
    let countedPosts = 0;
    posts.forEach(post => {
      const dt = new Date(post.getDataValue("last_update_time"));
      const key = format(dt, 'yyyy-MM-dd');
      if (counts[key] !== undefined) {
        counts[key]++;
        countedPosts++;
      } else {
        // This should not happen now, but keep the log for debugging
        console.log(`[BarChart] Post with date ${dt.toISOString()} (key: ${key}) doesn't match any initialized day`);
      }
    });
    
    console.log(`[BarChart] Total posts counted: ${countedPosts}`);
    
    // Build an ordered array of daily counts
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