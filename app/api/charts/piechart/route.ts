import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';
import { format, parse } from 'date-fns';

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

    console.log(`[PieChart] Query params: business_id=${business_id}, start_date=${start_date}, end_date=${end_date}`);
    console.log(`[PieChart] Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

    // Create an array of valid date keys (same logic as bar chart)
    const dailyKeys: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = format(d, 'yyyy-MM-dd');
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

    // Define the mapping for platform codes to display names
    const platformCodeMapping: Record<string, string> = {
      'xhs': 'rednote',
      'wb': 'weibo',
      'dy': 'douyin'
    };
    
    // Define the mapping for normalized platform names to display names
    const platformDisplayMapping: Record<string, string> = {
      'rednote': "Rednote",
      'weibo': "Weibo", 
      'douyin': "Douyin"
    };

    // Define fixed colors.
    const platformColors: Record<string, string> = {
      Rednote: "#5A6ACF",
      Weibo: "#8593ED",
      Douyin: "#C7CEFF",
      Other: "#AAAAAA" // Added fallback color
    };

    // Count posts per platform.
    const counts: Record<string, number> = { Rednote: 0, Weibo: 0, Douyin: 0 };

    // Track unique note_ids to check for duplicates
    const uniqueNoteIds = new Set<string>();
    
    // Count of excluded posts
    let excludedCount = 0;
    let loggedUnknownPlatforms = new Set();

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
      let platformCode = (row.getDataValue("platform") || "").toLowerCase();
      
      // First map platform codes (wb, dy, xhs) to normalized names
      let normalizedPlatform = platformCodeMapping[platformCode] || platformCode;
      
      // Then map normalized names to display names
      let displayPlatform = platformDisplayMapping[normalizedPlatform];
      
      if (!displayPlatform) {
        if (!loggedUnknownPlatforms.has(platformCode)) {
          console.log(`[PieChart] Unknown platform code: ${platformCode}`);
          loggedUnknownPlatforms.add(platformCode);
        }
        displayPlatform = "Other";
      }
      
      // Initialize count for this platform if not already present
      if (!(displayPlatform in counts)) {
        counts[displayPlatform] = 0;
      }
      
      // Increment the count
      counts[displayPlatform]++;
    });

    console.log(`[PieChart] Platform counts:`, counts);
    console.log(`[PieChart] Total unique note_ids: ${uniqueNoteIds.size}`);
    console.log(`[PieChart] Excluded posts: ${excludedCount}`);
    
    // Build pie chart data array.
    const pieData = Object.entries(counts)
      .filter(([_, value]) => value > 0) // Only include platforms with posts
      .map(([platform, value]) => ({
        name: platform,
        value,
        color: platformColors[platform] || '#AAAAAA'
      }));

    const totalPosts = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`[PieChart] Total posts in pieData: ${totalPosts}`);

    return NextResponse.json(pieData);
  } catch (err: any) {
    console.error(`[PieChart] Error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}