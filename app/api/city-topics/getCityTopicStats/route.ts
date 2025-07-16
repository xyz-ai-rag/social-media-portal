import { NextRequest, NextResponse } from "next/server";
import { CityTopicsModel } from "@/feature/sqlORM/modelorm";
import { Op, fn, col, literal } from "sequelize";

// POST /api/city-topics/getCityTopicStats
// body: { city, topicType }
export async function POST(request: NextRequest) {
  try {
    const { city, topicType } = await request.json();

    if (!city || !topicType) {
      return NextResponse.json(
        { error: "city and topicType are required" },
        { status: 400 }
      );
    }

    // 通过 include business，并用 business_city 过滤 city
    const topicCounts = await CityTopicsModel.findAll({
      where: {
        topic_type: topicType,
        sentiment: "Positive", // 只统计 Positive
      },
      include: [
        {
          association: "business",
          attributes: [],
          where: { business_city: city },
          required: true,
        },
      ],
      attributes: [
        "topic",
        [fn("COUNT", col("city_topics.id")), "count"]
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
    console.error("Error fetching city topic stats:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch city topic stats", details: error.message },
      { status: 500 }
    );
  }
} 