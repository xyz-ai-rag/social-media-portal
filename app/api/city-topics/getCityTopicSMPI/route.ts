import { NextRequest } from "next/server";
import { fn, col, literal, where } from "sequelize";
import { CityTopicsModel } from "@/feature/sqlORM/modelorm";
import { parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Op } from 'sequelize';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = "f8e7d6c5-b4a3-2f1e-0d9c-8b7a6f5e4d3c";
    const type = searchParams.get("type");
    const month = searchParams.get("month"); // 2025-06

    console.log('[getCityTopicSMPI] 请求参数:', {
      businessId,
      type,
      month,
    });

    if (!businessId) {
      return new Response(JSON.stringify({ error: "Missing businessId" }), { status: 400 });
    }

    // 添加缓存头
    const response = new Response();
    response.headers.set('Cache-Control', 'public, max-age=300'); // 缓存5分钟

    let whereClause: any = { business_id: businessId };

    if (type) {
      // 映射 topic_type
      if (type === 'City_Criticisms' || type === 'Criticisms') {
        whereClause.topic_type = 'Criticism';
      } else {
        whereClause.topic_type = type;
      }
    }

    if (month) {
      const startDate = startOfMonth(parseISO(month));
      const endDate = endOfMonth(parseISO(month));
      whereClause.created_at = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };
    }

    console.log('[getCityTopicSMPI] SQL where条件:', whereClause);

    // 1. 按 topic 分组统计，使用 DISTINCT note_id 去重
    const topicRows = await CityTopicsModel.findAll({
      attributes: [
        'topic',
        'topic_type',
        [fn('COUNT', fn('DISTINCT', col('note_id'))), 'M'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Highly Positive' THEN 1 ELSE 0 END")), 'HP'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END")), 'P'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END")), 'Neg'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Highly Negative' THEN 1 ELSE 0 END")), 'HN'],
        [fn('SUM', literal("CASE WHEN topic_type = 'Criticism' THEN 1 ELSE 0 END")), 'Crit'],
      ],
      where: whereClause,
      group: ['topic', 'topic_type'],
      order: [[fn('COUNT', fn('DISTINCT', col('note_id'))), 'DESC']]
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

    // 3. 组装返回
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

    console.log('[getCityTopicSMPI] 返回数据:', {
      topicsCount: result.length,
      firstTopic: result[0],
      whereClause,
      month,
    });

    return new Response(JSON.stringify({ topics: result }), { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (err) {
    console.error('[getCityTopicSMPI] 错误:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
} 