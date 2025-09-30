import { BusinessTopicsModel, TestBusinessTopicsModel, BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op, fn, col, literal } from "sequelize";

/**
 * POST /api/businesses/getTopicStats
 * body: { businessId, topicType, startDate?, endDate? }
 */

const DEPLOY_ENV = process.env.DEPLOY_ENV;
const TopicModelToUse = DEPLOY_ENV === "test" ? TestBusinessTopicsModel : BusinessTopicsModel;
export async function POST(request: NextRequest) {
  try {
    const { businessId, topicType, startDate, endDate } = await request.json();

    if (!businessId || !topicType) {
      return NextResponse.json(
        { error: "businessId and topicType are required" },
        { status: 400 }
      );
    }

    let topicCounts;

    if (startDate && endDate) {
      // Get note_ids from posts within date range
      const relevantPosts = await BusinessPostModel.findAll({
        where: {
          create_time: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          },
          is_relevant: true
        },
        attributes: ['note_id'],
        raw: true
      });

      const noteIds = relevantPosts.map(post => post.note_id);

      if (noteIds.length === 0) {
        topicCounts = [];
      } else {
        // Get topic counts for those note_ids
        topicCounts = await TopicModelToUse.findAll({
          where: {
            business_id: businessId,
            topic_type: topicType,
            note_id: {
              [Op.in]: noteIds
            }
          },
          attributes: [
            "topic",
            [fn("COUNT", col("id")), "count"]
          ],
          group: ["topic"],
          order: [[literal("count"), "DESC"]],
          raw: true,
        }) as any[];
      }
    } else {
      // No date filtering
      topicCounts = await TopicModelToUse.findAll({
        where: {
          business_id: businessId,
          topic_type: topicType,
        },
        attributes: [
          "topic",
          [fn("COUNT", col("id")), "count"]
        ],
        group: ["topic"],
        order: [[literal("count"), "DESC"]],
        raw: true,
      }) as any[];
    }
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