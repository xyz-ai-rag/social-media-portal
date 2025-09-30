import { NextRequest, NextResponse } from "next/server";
import { BusinessModel, CityTopicsModel } from "@/feature/sqlORM/modelorm";
import { fn, col, literal } from "sequelize";

const DEPLOY_ENV = process.env.DEPLOY_ENV;

const CityTopicsModelToUse = DEPLOY_ENV === "test" && (global as any).TestCityTopicsModel
  ? (global as any).TestCityTopicsModel
  : CityTopicsModel;

// GET /api/city-topics/getByBusiness?businessId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const business = await BusinessModel.findOne({
    where: { business_id: businessId },
    raw: true,
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const topicType = searchParams.get("topic_type");
  const where: any = { business_id: businessId };
  if (topicType) where.topic_type = topicType;

  // 先获取所有在 business_posts 表中实际存在的 note_ids
  const { BusinessPostModel } = await import("@/feature/sqlORM/modelorm");
  const existingNoteIds = await BusinessPostModel.findAll({
    where: { business_id: businessId },
    attributes: ['note_id'],
    raw: true,
  });
  const existingNoteIdSet = new Set(existingNoteIds.map(post => post.note_id));

  // 从 city_topics 表获取所有 topic 和对应的 note_ids
  const cityTopics = await CityTopicsModelToUse.findAll({
    where,
    attributes: ['topic', 'note_id'],
    raw: true,
  });

  // 按 topic 分组，只统计在 business_posts 表中实际存在的 note_ids
  const topicCounts: { [key: string]: Set<string> } = {};
  cityTopics.forEach((item: any) => {
    // 只统计在 business_posts 表中存在的 note_id
    if (existingNoteIdSet.has(item.note_id)) {
      if (!topicCounts[item.topic]) {
        topicCounts[item.topic] = new Set();
      }
      topicCounts[item.topic].add(item.note_id);
    }
  });

  const cityTopicCounts = Object.entries(topicCounts).map(([topic, noteIds]) => ({
    topic,
    count: noteIds.size
  })).sort((a, b) => b.count - a.count);



  const total = cityTopicCounts.reduce((sum: any, t: any) => sum + Number(t.count), 0);
  const topics = cityTopicCounts.map((t: any) => ({
    topic: t.topic,
    count: Number(t.count),
    percentage: total > 0 ? Number(t.count) / total : 0
  }));

  return NextResponse.json({
    business,
    topics,
    total,
  });
} 