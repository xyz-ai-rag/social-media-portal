import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { fn, col, literal, Op } from "sequelize";
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return NextResponse.json(
        { error: "Missing required parameters: businessId" },
        { status: 400 }
      );
    }

    const monthlySentimentRows = await BusinessPostModel.findAll({
      attributes: [
        [fn('to_char', col('last_update_time'), 'YYYY-MM'), 'month'],
        'english_sentiment',
        [fn('COUNT', literal('DISTINCT note_id')), 'count']
      ],
      where: {
        business_id: businessId,
        is_relevant: true,
        english_sentiment: {
          [Op.not]: null 
        }
      },
      group: [fn('to_char', col('last_update_time'), 'YYYY-MM'), 'english_sentiment'],
      order: [[fn('to_char', col('last_update_time'), 'YYYY-MM'), 'ASC']]
    });

    const monthlyTotalRows = await BusinessPostModel.findAll({
      attributes: [
        [fn('to_char', col('last_update_time'), 'YYYY-MM'), 'month'],
        [fn('COUNT', literal('DISTINCT note_id')), 'count']
      ],
      where: {
        business_id: businessId,
        is_relevant: true,
      },
      group: [fn('to_char', col('last_update_time'), 'YYYY-MM')],
      order: [[fn('to_char', col('last_update_time'), 'YYYY-MM'), 'ASC']]
    });

    const monthlyCriticismRows = await BusinessPostModel.findAll({
      attributes: [
        [fn('to_char', col('last_update_time'), 'YYYY-MM'), 'month'],
        [fn('COUNT', literal('DISTINCT note_id')), 'count']
      ],
      where: {
        business_id: businessId,
        is_relevant: true,
        has_negative_or_criticism: true
      },
      group: [fn('to_char', col('last_update_time'), 'YYYY-MM')],
      order: [[fn('to_char', col('last_update_time'), 'YYYY-MM'), 'ASC']]
    });

    const totalPosts = await BusinessPostModel.count({
      where: { business_id: businessId, is_relevant: true },
      distinct: true,
      col: 'note_id'
    });
    const totalCriticism = await BusinessPostModel.count({
      where: { business_id: businessId, is_relevant: true, has_negative_or_criticism: true },
      distinct: true,
      col: 'note_id'
    });
    const sentimentTotals: Record<string, number> = {};
    const SENTIMENTS = ['Positive', 'Highly Positive', 'Negative', 'Highly Negative', 'Neutral'];
    function toSnakeCase(str: string | null) {
      if (!str) return '';
      return str.toLowerCase().replace(/\s+/g, '_');
    }
    for (const sentiment of SENTIMENTS) {
      sentimentTotals[toSnakeCase(sentiment)] = await BusinessPostModel.count({
        where: { business_id: businessId, is_relevant: true, english_sentiment: sentiment },
        distinct: true,
        col: 'note_id'
      });
    }

    const monthly: Record<string, any> = {};
    monthlySentimentRows.forEach((row: any) => {
      const month = row.get('month');
      const sentiment = row.get('english_sentiment');
      const count = parseInt(row.get('count'));
      if (!monthly[month]) monthly[month] = { sentiments: {}, total: 0, criticism: 0 };
      monthly[month].sentiments[toSnakeCase(sentiment)] = count;
    });
    monthlyTotalRows.forEach((row: any) => {
      const month = row.get('month');
      const count = parseInt(row.get('count'));
      if (!monthly[month]) monthly[month] = { sentiments: {}, total: 0, criticism: 0 };
      monthly[month].total = count;
    });
    monthlyCriticismRows.forEach((row: any) => {
      const month = row.get('month');
      const count = parseInt(row.get('count'));
      if (!monthly[month]) monthly[month] = { sentiments: {}, total: 0, criticism: 0 };
      monthly[month].criticism = count;
    });

    // 补全所有月份，确保从最早有记录的月到当前月都存在
    const allMonthsSet = new Set<string>();
    monthlySentimentRows.forEach((row: any) => allMonthsSet.add(row.get('month')));
    monthlyTotalRows.forEach((row: any) => allMonthsSet.add(row.get('month')));
    monthlyCriticismRows.forEach((row: any) => allMonthsSet.add(row.get('month')));
    const allMonthsArr = Array.from(allMonthsSet).sort();
    let earliestMonth = allMonthsArr[0];
    const now = new Date();
    const thisMonth = format(now, 'yyyy-MM');

    function* monthRange(start: string, end: string) {
      let [sy, sm] = start.split('-').map(Number);
      let [ey, em] = end.split('-').map(Number);
      while (sy < ey || (sy === ey && sm <= em)) {
        yield `${sy.toString().padStart(4, '0')}-${sm.toString().padStart(2, '0')}`;
        sm++;
        if (sm > 12) { sm = 1; sy++; }
      }
    }
    const fullMonths = Array.from(monthRange(earliestMonth, thisMonth));
    fullMonths.forEach(month => {
      if (!monthly[month]) {
        monthly[month] = { sentiments: {}, total: 0, criticism: 0 };
      }
      SENTIMENTS.forEach(sentiment => {
        const key = toSnakeCase(sentiment);
        if (monthly[month].sentiments[key] === undefined) {
          monthly[month].sentiments[key] = 0;
        }
      });
    });

    return NextResponse.json({
      monthly,
      totals: {
        totalPosts,
        countMonths: allMonthsArr.length,
        criticism: totalCriticism,
        ...sentimentTotals
      }
    });
  } catch (error: any) {
    console.error(`[PostsCount] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
