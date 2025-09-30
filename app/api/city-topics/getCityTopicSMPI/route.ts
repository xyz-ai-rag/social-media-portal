import { NextRequest } from "next/server";
import { fn, col, literal, where } from "sequelize";
import { CityTopicsModel } from "@/feature/sqlORM/modelorm";
import { parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Op } from 'sequelize';

export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const type = searchParams.get("type");
  const month = searchParams.get("month"); // 2025-06


  if (!businessId) {
    return new Response(JSON.stringify({ error: "Missing businessId" }), { status: 400 });
  }


  const response = new Response();
  response.headers.set('Cache-Control', 'public, max-age=300'); 

  const whereClause: any = { business_id: businessId };

  if (type) {
    if (type === 'City_Criticisms' || type === 'Criticisms') {
      whereClause.topic_type = 'Criticism';
    } else if (type === 'Compliments' || type === 'Compliment') {
      whereClause.topic_type = 'Compliment';
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

  const result = topicRows.map((row: any) => ({
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


  return new Response(JSON.stringify({ topics: result }), {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=300'
    }
  });

} 