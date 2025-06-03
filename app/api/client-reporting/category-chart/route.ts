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

    const startDate = parse(start_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    const endDate = parse(end_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const posts = await BusinessPostModel.findAll({
      attributes: ['post_category', 'note_id', 'last_update_time', 'business_id'],
      where: {
        business_id: { [Op.in]: businessIds },
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] }
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
