import { BusinessPostModel, BusinessModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { parse } from "date-fns";

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

    const posts = await BusinessPostModel.findAll({
      attributes: ['business_id', 'note_id', 'english_negative_topics'],
      where: {
        business_id: { [Op.in]: businessIds },
        is_relevant: true,
        has_negative_or_criticism: true,
        english_negative_topics: { [Op.not]: null }
      },
      raw: true,
    });
    console.log("posts11", posts);

    const topicStats = new Map<string, Set<string>>();

    posts.forEach(post => {
      let negativeTopics: string[] = [];
      if (typeof post.english_negative_topics === "string") {
        negativeTopics = post.english_negative_topics
          .split(",")
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);
      }
      negativeTopics.forEach((topic: string) => {
        if (!topicStats.has(topic)) {
          topicStats.set(topic, new Set());
        }
        topicStats.get(topic)!.add(post.note_id);
      });
    });

    const feedbackStats = Array.from(topicStats.entries()).map(([topic, noteSet]) => ({
      topic,
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