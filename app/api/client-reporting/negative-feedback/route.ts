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

    // Extract date part (YYYY-MM-DD) from the datetime string
    const startDate = start_date.split(' ')[0];
    const endDate = end_date.split(' ')[0];

    // Create datetime objects with UTC time
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
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
        last_update_time: { [Op.between]: [startDateTime, endDateTime] },
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