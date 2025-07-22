import { NextRequest } from "next/server";
import { fn, col, literal, where, Op } from "sequelize";
import { CityTopicsModel } from "@/feature/sqlORM/modelorm";
import { parseISO, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = "f8e7d6c5-b4a3-2f1e-0d9c-8b7a6f5e4d3c"; // 使用硬编码的 businessId，与 getCityTopicSMPI 保持一致
    const month = searchParams.get("month");

    if (!month) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
    }

    console.log('[getCriticismTrend] 请求参数:', { businessId, month });

    // 解析月份 - 使用 date-fns 来确保日期正确
    const startDate = startOfMonth(parseISO(month + '-01'));
    const endDate = endOfMonth(parseISO(month + '-01'));

    console.log('[getCriticismTrend] 日期范围:', { startDate, endDate });

    // 先检查数据库中是否有这个 businessId 的数据
    const totalTopicsForBusiness = await CityTopicsModel.count({
      where: {
        business_id: businessId,
      },
    });
    console.log('[getCriticismTrend] 该 businessId 的总话题数:', totalTopicsForBusiness);

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
    console.log('[getCriticismTrend] 指定日期范围内的总话题数:', totalTopicsInDateRange);

    // 检查批评话题的数量
    const totalCriticismTopics = await CityTopicsModel.count({
      where: {
        business_id: businessId,
        topic_type: 'Criticism',
      },
    });
    console.log('[getCriticismTrend] 该 businessId 的总批评话题数:', totalCriticismTopics);

    // 检查 topic 字段的样本数据
    const sampleTopics = await CityTopicsModel.findAll({
      attributes: ['topic', 'topic_type', 'created_at'],
      where: {
        business_id: businessId,
        topic_type: 'Criticism',
      },
      limit: 5,
    });
    console.log('[getCriticismTrend] 批评话题样本:', sampleTopics.map((p: any) => ({
      topic: p.get('topic'),
      topic_type: p.get('topic_type'),
      created_at: p.get('created_at'),
    })));

    // 查询批评数据 - 简化查询条件
    const criticismData = await CityTopicsModel.findAll({
      attributes: [
        'topic',
        [fn('COUNT', col('id')), 'criticism_count']
      ],
      where: {
        business_id: businessId,
        topic_type: 'Criticism',
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

    // 计算总批评数
    const totalCriticisms = await CityTopicsModel.count({
      where: {
        business_id: businessId,
        topic_type: 'Criticism',
        ...(month && {
          created_at: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        }),
      },
    });

    // 转换数据格式
    const topics = criticismData.map((row: any) => ({
      topic: row.get('topic') || 'Unknown',
      criticism_count: parseInt(row.get('criticism_count')),
    }));

    const result = {
      month: month,
      total_criticisms: totalCriticisms,
      topics: topics,
    };

    console.log('[getCriticismTrend] 返回数据:', {
      month,
      totalCriticisms,
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
    console.error('[getCriticismTrend] Error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
} 