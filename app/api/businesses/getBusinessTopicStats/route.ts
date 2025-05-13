import { BusinessTopicsModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op, fn, col, literal } from "sequelize";

/**
 * POST /api/businesses/getTopicStats
 * body: { businessId, topicType, startDate?, endDate? }
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId, topicType } = await request.json();

    if (!businessId || !topicType) {
      return NextResponse.json(
        { error: "businessId and topicType are required" },
        { status: 400 }
      );
    }

    let where: any = {
      business_id: businessId,
      topic_type: topicType,
    }

    // count each topic
    const topicCounts = await BusinessTopicsModel.findAll({
      where,
      attributes: [
        "topic",
        [fn("COUNT", col("id")), "count"]
      ],
      group: ["topic"],
      order: [[literal("count"), "DESC"]],
      raw: true,
    }) as any[];
    // total
    const total = topicCounts.reduce((sum, t) => sum + Number(t.count), 0);

    // percentage
    const topics = topicCounts.map((t: any) => ({
      topic: t.topic,
      count: Number(t.count),
      percentage: total > 0 ? Number(t.count) / total : 0
    }));

    return NextResponse.json({ topics, total });
  } catch (error: any) {
    console.error("Error fetching topic stats:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch topic stats", details: error.message },
      { status: 500 }
    );
  }
}