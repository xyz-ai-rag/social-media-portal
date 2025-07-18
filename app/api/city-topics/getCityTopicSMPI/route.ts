import { NextRequest } from "next/server";
import { fn, col, literal } from "sequelize";
import { CityTopicsModel } from "@/feature/sqlORM/modelorm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = "f8e7d6c5-b4a3-2f1e-0d9c-8b7a6f5e4d3c";
    const type = searchParams.get("type");
    if (!businessId) {
      return new Response(JSON.stringify({ error: "Missing businessId" }), { status: 400 });
    }

    // 1. 按 topic 分组统计
    const topicRows = await CityTopicsModel.findAll({
      attributes: [
        'topic',
        'topic_type',
        [fn('COUNT', '*'), 'M'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Highly Positive' THEN 1 ELSE 0 END")), 'HP'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END")), 'P'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END")), 'Neg'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Highly Negative' THEN 1 ELSE 0 END")), 'HN'],
        [fn('SUM', literal("CASE WHEN topic_type = 'Criticism' THEN 1 ELSE 0 END")), 'Crit'],
      ],
      where: { business_id: businessId },
      group: ['topic', 'topic_type'],
      order: [[fn('COUNT', '*'), 'DESC']]
    });

    // 2. 统计全局均值（所有 topic 的均值）
    let total_M = 0, total_HP = 0, total_P = 0, total_Neg = 0, total_HN = 0, total_Crit = 0;
    topicRows.forEach((row: any) => {
      total_M += Number(row.get('M'));
      total_HP += Number(row.get('HP'));
      total_P += Number(row.get('P'));
      total_Neg += Number(row.get('Neg'));
      total_HN += Number(row.get('HN'));
      total_Crit += Number(row.get('Crit'));
    });
    const topicCount = topicRows.length || 1;
    const avg = {
      avg_M: total_M / topicCount,
      avg_HP: total_HP / topicCount,
      avg_P: total_P / topicCount,
      avg_Neg: total_Neg / topicCount,
      avg_HN: total_HN / topicCount,
      avg_Crit: total_Crit / topicCount,
    };

    // 3. 组装返回，支持 type 过滤
    let result = topicRows.map((row: any) => ({
      topic: row.get('topic'),
      topic_type: row.get('topic_type'),
      M: Number(row.get('M')),
      HP: Number(row.get('HP')),
      P: Number(row.get('P')),
      Neg: Number(row.get('Neg')),
      HN: Number(row.get('HN')),
      Crit: Number(row.get('Crit')),
      ...avg
    }));
    if (type) {
      result = result.filter((item: any) => item.topic_type === type);
    }
    return new Response(JSON.stringify({ topics: result }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
} 