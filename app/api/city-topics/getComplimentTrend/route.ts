import { NextRequest } from "next/server";
import { fn, col, literal, where, Op } from "sequelize";
import { CityTopicsModel } from "@/feature/sqlORM/modelorm";
import { parseISO, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const month = searchParams.get("month");

    if (!businessId || !month) {
      return new Response(JSON.stringify({ error: "Missing required parameters: businessId and month" }), { status: 400 });
    }

    console.log('[getComplimentTrend] 请求参数:', { businessId, month });

    // 解析月份 - 使用 date-fns 来确保日期正确
    const startDate = startOfMonth(parseISO(month + '-01'));
    const endDate = endOfMonth(parseISO(month + '-01'));

    console.log('[getComplimentTrend] 日期范围:', { startDate, endDate });

    // 先检查数据库中是否有这个 businessId 的数据
    const totalTopicsForBusiness = await CityTopicsModel.count({
      where: {
        business_id: businessId,
      },
    });
    console.log('[getComplimentTrend] 该 businessId 的总话题数:', totalTopicsForBusiness);

    // 检查指定日期范围内的总话题数
    const totalTopicsInDateRange = await CityTopicsModel.count({
      where: {
        business_id: businessId,
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
    });
    console.log('[getComplimentTrend] 指定日期范围内的总话题数:', totalTopicsInDateRange);

    // 检查表扬话题的数量
    const totalComplimentTopics = await CityTopicsModel.count({
      where: {
        business_id: businessId,
        topic_type: 'Compliment',
      },
    });
    console.log('[getComplimentTrend] 该 businessId 的总表扬话题数:', totalComplimentTopics);

    // 检查 topic 字段的样本数据
    const sampleTopics = await CityTopicsModel.findAll({
      attributes: ['topic', 'topic_type', 'created_at'],
      where: {
        business_id: businessId,
        topic_type: 'Compliment',
      },
      limit: 5,
    });
    console.log('[getComplimentTrend] 表扬话题样本:', sampleTopics.map((p: any) => ({
      topic: p.get('topic'),
      topic_type: p.get('topic_type'),
      created_at: p.get('created_at'),
    })));

    // 查询表扬数据 - 简化查询条件
    const complimentData = await CityTopicsModel.findAll({
      attributes: [
        'topic',
        [fn('COUNT', col('id')), 'compliment_count']
      ],
      where: {
        business_id: businessId,
        topic_type: 'Compliment',
        ...(month && {
          created_at: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        }),
      },
      group: ['topic'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 10, // 只取前10个话题
    });

    // 计算总表扬数
    const totalCompliments = await CityTopicsModel.count({
      where: {
        business_id: businessId,
        topic_type: 'Compliment',
        ...(month && {
          created_at: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        }),
      },
    });

    // 转换数据格式
    const topics = complimentData.map((row: any) => ({
      topic: row.get('topic') || 'Unknown',
      compliment_count: parseInt(row.get('compliment_count')),
    }));

    const result = {
      month: month,
      total_compliments: totalCompliments,
      topics: topics,
    };

    console.log('[getComplimentTrend] 返回数据:', {
      month,
      totalCompliments,
      topicsCount: topics.length,
      firstTopic: topics[0],
    });

    return new Response(JSON.stringify(result), { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300'
      }
    });

  } catch (error) {
    console.error('[getComplimentTrend] Error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
} 