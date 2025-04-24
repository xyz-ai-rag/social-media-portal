import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';

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

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    console.log(`[PieChart] Query params: business_id=${business_id}, start_date=${start_date}, end_date=${end_date}`);
    console.log(`[PieChart] Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

    // Create an array of valid date keys (same logic as bar chart)
    const dailyKeys: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      dailyKeys.push(key);
    }
    console.log(`[PieChart] Valid date keys:`, dailyKeys);

    // Query only the necessary fields: platform, note_id and last_update_time
    const rows = await BusinessPostModel.findAll({
      attributes: ['platform', 'note_id', 'last_update_time'], // Added last_update_time for filtering
      where: {
        business_id,
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] }
      }
    });
    
    console.log(`[PieChart] Total posts found: ${rows.length}`);

    // Define the mapping. In this case, we remap 'xhs' to 'rednote'.
    const platformMapping: Record<string, string> = {
      xhs: "Rednote", // 'xhs' in DB should be considered as 'rednote'
      weibo: "Weibo",
      douyin: "Douyin"
    };

    // Define fixed colors.
    const platformColors: Record<string, string> = {
      Rednote: "#5A6ACF",
      Weibo: "#8593ED",
      Douyin: "#C7CEFF",
    };

    // Count posts per platform.
    const counts: Record<string, number> = { Rednote: 0, Weibo: 0, Douyin: 0 };

    // Track unique note_ids to check for duplicates
    const uniqueNoteIds = new Set<string>();
    
    // Count of excluded posts
    let excludedCount = 0;

    rows.forEach(row => {
      // Track note_ids
      const noteId = row.getDataValue("note_id");
      uniqueNoteIds.add(noteId);
      
      // Check if this post's date is in the valid range
      const postDate = new Date(row.getDataValue("last_update_time"));
      const postDateKey = postDate.toISOString().slice(0, 10);
      
      if (!dailyKeys.includes(postDateKey)) {
        console.log(`[PieChart] Excluding post with date ${postDate.toISOString()} (key: ${postDateKey})`);
        excludedCount++;
        return; // Skip this post
      }
      
      // Get the raw platform value and normalize it to lowercase.
      let platform = (row.getDataValue("platform") || "").toLowerCase();
      // Map the DB value.
      if (platformMapping[platform]) {
        platform = platformMapping[platform];
      } else {
        // If platform is not recognized, you could default to 'rednote', or ignore.
        platform = "Rednote"; // Changed to match case in counts
      }
      if (platform in counts) {
        counts[platform]++;
      }
    });

    console.log(`[PieChart] Platform counts:`, counts);
    console.log(`[PieChart] Total unique note_ids: ${uniqueNoteIds.size}`);
    console.log(`[PieChart] Excluded posts: ${excludedCount}`);
    
    // Build pie chart data array.
    const pieData = Object.entries(counts).map(([platform, value]) => ({
      name: platform,
      value,
      color: platformColors[platform] || '#5470c6'
    }));

    const totalPosts = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`[PieChart] Total posts in pieData: ${totalPosts}`);

    return NextResponse.json(pieData);
  } catch (err: any) {
    console.error(`[PieChart] Error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}