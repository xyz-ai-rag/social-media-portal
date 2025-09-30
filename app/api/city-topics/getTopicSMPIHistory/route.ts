import { NextRequest } from "next/server";
import { fn, col, literal, where } from "sequelize";
import { CityTopicsModel } from "@/feature/sqlORM/modelorm";
import { parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Op } from 'sequelize';
import { calculateSMPI } from "@/utils/smpi";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const topic = searchParams.get("topic");
    const type = searchParams.get("type");

    if (!businessId || !topic || !type) {
      return new Response(JSON.stringify({ error: "Missing required parameters: businessId, topic, and type" }), { status: 400 });
    }

    console.log('[getTopicSMPIHistory] 请求参数:', { businessId, topic, type });

    // 查询该话题的历史数据，按月分组
    const monthlyData = await CityTopicsModel.findAll({
      attributes: [
        [fn('TO_CHAR', col('created_at'), 'YYYY-MM'), 'month'],
        [fn('COUNT', '*'), 'total'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Highly Positive' THEN 1 ELSE 0 END")), 'highly_positive'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END")), 'positive'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END")), 'negative'],
        [fn('SUM', literal("CASE WHEN sentiment = 'Highly Negative' THEN 1 ELSE 0 END")), 'highly_negative'],
        [fn('SUM', literal("CASE WHEN topic_type = 'Criticism' THEN 1 ELSE 0 END")), 'criticism'],
      ],
      where: {
        business_id: businessId,
        topic: topic,
        topic_type: type,
      },
      group: [fn('TO_CHAR', col('created_at'), 'YYYY-MM')],
      order: [[fn('TO_CHAR', col('created_at'), 'YYYY-MM'), 'ASC']]
    });

    // 计算历史平均值
    const totalMonths = monthlyData.length;
    const historicalAverages = {
      avg_M: monthlyData.reduce((sum: number, row: any) => sum + Number(row.get('total')), 0) / totalMonths,
      avg_HP: monthlyData.reduce((sum: number, row: any) => sum + Number(row.get('highly_positive')), 0) / totalMonths,
      avg_P: monthlyData.reduce((sum: number, row: any) => sum + Number(row.get('positive')), 0) / totalMonths,
      avg_Neg: monthlyData.reduce((sum: number, row: any) => sum + Number(row.get('negative')), 0) / totalMonths,
      avg_HN: monthlyData.reduce((sum: number, row: any) => sum + Number(row.get('highly_negative')), 0) / totalMonths,
      avg_Crit: monthlyData.reduce((sum: number, row: any) => sum + Number(row.get('criticism')), 0) / totalMonths,
    };

    // 计算每个月的 SMPI
    const monthly_smpi = monthlyData.map((row: any) => {
      const inputs = {
        M: Number(row.get('total')),
        HP: Number(row.get('highly_positive')),
        P: Number(row.get('positive')),
        Neg: Number(row.get('negative')),
        HN: Number(row.get('highly_negative')),
        Crit: Number(row.get('criticism')),
        ...historicalAverages
      };

      return {
        month: row.get('month'),
        smpi: calculateSMPI(inputs),
        total: Number(row.get('total')),
        highly_positive: Number(row.get('highly_positive')),
        positive: Number(row.get('positive')),
        negative: Number(row.get('negative')),
        highly_negative: Number(row.get('highly_negative')),
        criticism: Number(row.get('criticism')),
      };
    });

    console.log('[getTopicSMPIHistory] 返回数据:', {
      topic,
      monthlyCount: monthly_smpi.length,
      firstMonth: monthly_smpi[0]
    });

    return new Response(JSON.stringify({
      topic,
      monthly_smpi
    }), { status: 200 });

  } catch (error) {
    console.error('[getTopicSMPIHistory] Error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
} 