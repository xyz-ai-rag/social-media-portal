import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { parse } from "date-fns";

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
    
    // Convert date strings to Date objects
    const startDate = parse(start_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    const endDate = parse(end_date, 'yyyy-MM-dd HH:mm:ss', new Date());

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    console.log(`[ContentTypeStats] Query params: business_id=${business_id}, start_date=${start_date}, end_date=${end_date}`);
    console.log(`[ContentTypeStats] Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

    // Create an array of valid date keys (same logic as pie chart)
    const dailyKeys: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      dailyKeys.push(key);
    }
    console.log(`[ContentTypeStats] Valid date keys:`, dailyKeys);

    // Get all posts with their types
    const posts = await BusinessPostModel.findAll({
      attributes: ['type', 'note_id', 'last_update_time'],
      where: {
        business_id,
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] }
      }
    });

    console.log(`[ContentTypeStats] Total posts found: ${posts.length}`);

    // Track unique note_ids to check for duplicates
    const uniqueNoteIds = new Set<string>();
    let excludedCount = 0;

    // Count posts by type with date filtering
    const typeCounts: Record<string, number> = {};
    
    posts.forEach(post => {
      // Track note_ids
      const noteId = post.getDataValue("note_id");
      uniqueNoteIds.add(noteId);
      
      // Check if this post's date is in the valid range
      const postDate = new Date(post.getDataValue("last_update_time"));
      const postDateKey = postDate.toISOString().slice(0, 10);
      
      if (!dailyKeys.includes(postDateKey)) {
        console.log(`[ContentTypeStats] Excluding post with date ${postDate.toISOString()} (key: ${postDateKey})`);
        excludedCount++;
        return; // Skip this post
      }
      
      // Get the type, defaulting to "normal" (which maps to Text) if empty
      const type = post.getDataValue('type') || 'normal';
      
      if (!(type in typeCounts)) {
        typeCounts[type] = 0;
      }
      typeCounts[type]++;
    });

    console.log(`[ContentTypeStats] Type counts:`, typeCounts);
    console.log(`[ContentTypeStats] Total unique note_ids: ${uniqueNoteIds.size}`);
    console.log(`[ContentTypeStats] Excluded posts: ${excludedCount}`);

    // Map type codes to display names
    const typeMapping: Record<string, string> = {
      'video': 'Video',
      'note': 'Text',
      'normal': 'Text'
    };

    // Convert to array of counts with display names
    let contentTypeStats = Object.entries(typeCounts).map(([type, count]) => {
      // Map the type to the display name
      const displayType = typeMapping[type] || 'Text'; // Default to Text for any unmapped types
      
      return {
        type: displayType,
        count,
        percentage: 0 // Will calculate after merging
      };
    });

    // Merge counts for types that map to the same display name (Text)
    const mergedStats: Record<string, any> = {};
    contentTypeStats.forEach(stat => {
      if (!mergedStats[stat.type]) {
        mergedStats[stat.type] = { ...stat };
      } else {
        mergedStats[stat.type].count += stat.count;
      }
    });

    // Calculate total count after filtering
    const totalPosts = Object.values(mergedStats).reduce((sum, stat) => sum + stat.count, 0);

    // Calculate percentages after merging
    Object.values(mergedStats).forEach(stat => {
      stat.percentage = Math.round((stat.count * 100) / totalPosts);
    });

    // Convert back to array
    contentTypeStats = Object.values(mergedStats);

    console.log(`[ContentTypeStats] Total posts after filtering: ${totalPosts}`);
    
    return NextResponse.json({
      contentTypeStats,
      totalCount: totalPosts
    });
  } catch (error: any) {
    console.error(`[ContentTypeStats] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}