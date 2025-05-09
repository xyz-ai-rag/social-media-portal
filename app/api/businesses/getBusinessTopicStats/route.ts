import { BusinessTopicsInstance } from "@/feature/sqlORM/interfaceorm";
import { BusinessTopicsModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op, fn, col, literal } from "sequelize";

/**
 * POST /api/businesses/getTopicStats
 * body: { businessId, topicType, startDate?, endDate? }
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId, topicType, startDate, endDate } = await request.json();

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

    // 统计每个 topic 的数量
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
    // 总数
    const total = topicCounts.reduce((sum, t) => sum + Number(t.count), 0);

    // 计算百分比
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