import { BusinessTopicsModel, TestBusinessTopicsModel, BusinessModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op, fn, col, literal } from "sequelize";

const DEPLOY_ENV = process.env.DEPLOY_ENV;
const TopicModelToUse = DEPLOY_ENV === "test" ? TestBusinessTopicsModel : BusinessTopicsModel;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");

    let businessIds: string[] = [];
    if (business_id) {
      businessIds = [business_id];
    } else {
      return NextResponse.json(
        { error: "Missing business_id(s)" },
        { status: 400 }
      );
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

    // Query business_topics table (or test table) for Criticism topics using grouping for better performance
    const topicCounts = await TopicModelToUse.findAll({
      where: {
        business_id: { [Op.in]: businessIds },
        topic_type: "Criticism"
      },
      attributes: [
        "topic",
        [fn("COUNT", col("id")), "count"]
      ],
      group: ["topic"],
      order: [[literal("count"), "DESC"]],
      raw: true,
    }) as any[];

    // Map to the expected format
    const feedbackStats = topicCounts.map((item: any) => ({
      topic: item.topic,
      count: Number(item.count)
    }));

    // Calculate total
    const total = feedbackStats.reduce((sum, stat) => sum + stat.count, 0);

    return NextResponse.json({
      feedbackStats,
      total
    });
  } catch (error: any) {
    console.error(`[NegativeFeedbackStats] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}