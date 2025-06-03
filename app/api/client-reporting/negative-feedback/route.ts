import { BusinessPostModel, BusinessModel } from "@/feature/sqlORM/modelorm";
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

    const businesses = await BusinessModel.findAll({
      where: { business_id: { [Op.in]: businessIds } },
      attributes: ['business_id', 'business_name'],
      raw: true,
    });
    const businessNameMap = new Map<string, string>();
    businesses.forEach((b: any) => {
      businessNameMap.set(b.business_id, b.business_name);
    });

    const posts = await BusinessPostModel.findAll({
      attributes: ['business_id', 'note_id'],
      where: {
        business_id: { [Op.in]: businessIds },
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] },
        has_negative_or_criticism: true
      },
      raw: true,
    });

    const businessStats = new Map<string, Set<string>>();
    posts.forEach(post => {
      const businessId = post.business_id;
      const noteId = post.note_id;
      if (!businessStats.has(businessId)) {
        businessStats.set(businessId, new Set());
      }
      businessStats.get(businessId)!.add(noteId);
    });

    const feedbackStats = Array.from(businessStats.entries()).map(([businessId, noteSet]) => ({
      topic: businessNameMap.get(businessId) || '',
      count: noteSet.size
    }));

    feedbackStats.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      feedbackStats,
      total: feedbackStats.reduce((sum, stat) => sum + stat.count, 0)
    });
  } catch (error: any) {
    console.error(`[NegativeFeedbackStats] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 