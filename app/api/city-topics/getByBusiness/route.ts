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
  const where: any = { business_id: 'f8e7d6c5-b4a3-2f1e-0d9c-8b7a6f5e4d3c' };
  if (topicType) where.topic_type = topicType;
  const cityTopicCounts = await CityTopicsModelToUse.findAll({
    where,
    attributes: [
      'topic',
      [fn('COUNT', fn('DISTINCT', col('note_id'))), 'count']
    ],
    group: ['topic'],
    order: [[literal('count'), 'DESC']],
    raw: true,
  });
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