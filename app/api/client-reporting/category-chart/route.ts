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
      attributes: ['post_category', 'note_id', 'last_update_time', 'business_id'],
      where: {
        business_id: { [Op.in]: businessIds },
        is_relevant: true,
        description: {
          [Op.ne]: "nan",
        },
        last_update_time: { [Op.between]: [startDateTime, endDateTime] }
      }
    });

    const categoryCounts: Record<string, number> = {
      'Organic Post': 0,
      'Commercial Post': 0,
      'Own Post': 0
    };
    const uniqueNoteIds = new Set<string>();

    posts.forEach(post => {
      const noteId = post.getDataValue("note_id");
      if (!noteId || uniqueNoteIds.has(noteId)) return;
      uniqueNoteIds.add(noteId);

      const postCategory = post.getDataValue('post_category')?.toLowerCase() || '';
      let category: string;

      if (postCategory === 'organic post') {
        category = 'Organic Post';
      } else if (postCategory === 'commercial post') {
        category = 'Commercial Post';
      } else if (postCategory === 'own post') {
        category = 'Own Post';
      } else {
        category = 'Other';
      }

      categoryCounts[category]++;
    });

    const categoryStats = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    const totalPosts = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

    categoryStats.sort((a, b) => b.count - a.count);

    console.log(`[CategoryChart] Total category counts:`, categoryCounts);
    console.log(`[CategoryChart] Total posts: ${totalPosts}`);

    return NextResponse.json({
      categoryStats,
      totalCount: totalPosts
    });
  } catch (error: any) {
    console.error(`[CategoryChart] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
