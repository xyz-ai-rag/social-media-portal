import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { parse } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const all_business_ids = searchParams.get("all_business_ids");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: start_date, end_date" },
        { status: 400 }
      );
    }

    let businessIds: string[] = [];
    if (all_business_ids) {
      businessIds = all_business_ids.split(',').map(id => id.trim()).filter(Boolean);
    } else if (business_id) {
      businessIds = [business_id];
    } else {
      return NextResponse.json(
        { error: "Missing business_id(s)" },
        { status: 400 }
      );
    }

    // Extract date part (YYYY-MM-DD) from the datetime string
    const startDate = start_date.split(' ')[0];
    const endDate = end_date.split(' ')[0];

    // Create datetime objects exactly like getBusinessPosts
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const posts = await BusinessPostModel.findAll({
      attributes: ['type', 'note_id', 'last_update_time', 'business_id'],
      where: {
        business_id: { [Op.in]: businessIds },
        is_relevant: true,
        description: {
        [Op.ne]: "nan",
      },
        last_update_time: { [Op.between]: [startDateTime, endDateTime] }
      }
    });

    const typeCounts: Record<string, number> = {};
    const uniqueNoteIds = new Set<string>();

    posts.forEach(post => {
      const noteId = post.getDataValue("note_id");
      if (uniqueNoteIds.has(noteId)) return;
      uniqueNoteIds.add(noteId);

      const type = post.getDataValue('type') || 'normal';
      if (!(type in typeCounts)) typeCounts[type] = 0;
      typeCounts[type]++;
    });

    console.log(`[ContentTypeStats] Type counts:`, typeCounts);
    console.log(`[ContentTypeStats] Total unique note_ids: ${uniqueNoteIds.size}`);

    // Map type codes to display names
    const typeMapping: Record<string, string> = {
      'video': 'Video',
      'note': 'Text',
      'normal': 'Text'
    };

    const mergedStats: Record<string, { type: string, count: number, percentage: number }> = {};
    Object.entries(typeCounts).forEach(([type, count]) => {
      const displayType = typeMapping[type] || 'Text';
      if (!mergedStats[displayType]) {
        mergedStats[displayType] = { type: displayType, count: 0, percentage: 0 };
      }
      mergedStats[displayType].count += count;
    });

    const totalPosts = Object.values(mergedStats).reduce((sum, stat) => sum + stat.count, 0);
    Object.values(mergedStats).forEach(stat => {
      stat.percentage = totalPosts > 0 ? Math.round((stat.count * 100) / totalPosts) : 0;
    });

    const contentTypeStats = Object.values(mergedStats);

    return NextResponse.json({
      contentTypeStats,
      totalCount: totalPosts
    });
  } catch (error: any) {
    console.error(`[ContentTypeStats] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}