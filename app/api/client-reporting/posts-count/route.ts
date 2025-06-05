import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import {fn, col, literal, Op } from "sequelize";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const param = searchParams.get("param");
    if (!businessId || !param) {
      return NextResponse.json(
        { error: "Missing required parameters: businessId, param" },
        { status: 400 }
      );
    }

    let whereClause: any = {
      is_relevant: true,
      business_id: businessId,
    };

    if (param === 'Criticism') {
        whereClause.has_negative_or_criticism = true;
    }else if(param !== "Total"){
      whereClause.english_sentiment = param;
    }

    const posts = await BusinessPostModel.findAll({
      where: whereClause,
      attributes: [
        [fn('to_char', col('last_update_time'), 'YYYY-MM'), 'month'],
        [fn('COUNT', literal('DISTINCT note_id')), 'count']
      ],
      group: [fn('to_char', col('last_update_time'), 'YYYY-MM')],
      order: [[fn('to_char', col('last_update_time'), 'YYYY-MM'), 'ASC']]
    });

    const result: Record<string, { count: number }> = {};
    posts.forEach((row: any) => {
      result[row.get('month')] = { count: parseInt(row.get('count')) };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[PostsCount] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
