// app/api/businesses/credit-cards/getSOVvsNetSentiment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { QueryTypes } from "sequelize";
import { sequelizeDbConnection } from "@/feature/sqlORM/sqlDbConnection";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!business_id || !start_date || !end_date) {
      return NextResponse.json(
        {
          error: "Missing required parameters: business_id, start_date, end_date",
        },
        { status: 400 }
      );
    }

    const startDateTime = new Date(start_date);
    const endDateTime = new Date(end_date);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid date format. Expected ISO 8601 format.",
          received: { start_date, end_date },
        },
        { status: 400 }
      );
    }

    console.log(
      `[SOV vs Net Sentiment] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}`
    );

    // Get the business and its similar businesses
    const businessQuery = `
      SELECT business_id, business_name, similar_businesses
      FROM business
      WHERE business_id = $1
    `;

    const businessResult = await sequelizeDbConnection.query(businessQuery, {
      bind: [business_id],
      type: QueryTypes.SELECT,
    });

    if (!businessResult || businessResult.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const business: any = businessResult[0];
    const similarBusinessIds = business.similar_businesses || [];
    const allBusinessIds = [business_id, ...similarBusinessIds];

    console.log(`[SOV vs Net Sentiment] Fetching for ${allBusinessIds.length} businesses`);

    // Combined query to get both SOV and Net Sentiment
    const query = `
      WITH total_posts AS (
        SELECT COUNT(*) as grand_total
        FROM business_posts bp
        WHERE bp.business_id = ANY($1::uuid[])
          AND bp.is_relevant = true
          AND bp.platform = 'xhs'
          AND bp.last_update_time BETWEEN $2 AND $3
      ),
      business_stats AS (
        SELECT 
          b.business_id,
          b.business_name,
          COUNT(bp.note_id) as total_posts,
          COUNT(CASE WHEN bp.english_sentiment IN ('Highly positive', 'Positive', 'Negative', 'Highly negative') THEN 1 END) as non_neutral_posts,
          CASE 
            WHEN COUNT(CASE WHEN bp.english_sentiment IN ('Highly positive', 'Positive', 'Negative', 'Highly negative') THEN 1 END) = 0 THEN NULL
            ELSE ROUND(
              ((COUNT(CASE WHEN bp.english_sentiment IN ('Highly positive', 'Positive') THEN 1 END) - 
                COUNT(CASE WHEN bp.english_sentiment IN ('Negative', 'Highly negative') THEN 1 END)) * 100.0) / 
              COUNT(CASE WHEN bp.english_sentiment IN ('Highly positive', 'Positive', 'Negative', 'Highly negative') THEN 1 END)
            , 2)
          END as net_sentiment_score
        FROM public.business b
        LEFT JOIN public.business_posts bp ON b.business_id = bp.business_id 
          AND bp.is_relevant = true 
          AND bp.platform = 'xhs' 
          AND bp.last_update_time BETWEEN $2 AND $3
        WHERE b.business_id = ANY($1::uuid[])
        GROUP BY b.business_id, b.business_name
      )
      SELECT 
        bs.business_id,
        bs.business_name,
        bs.total_posts,
        bs.net_sentiment_score,
        ROUND((bs.total_posts * 100.0 / NULLIF(tp.grand_total, 0)), 2) as sov_percentage
      FROM business_stats bs
      CROSS JOIN total_posts tp
      ORDER BY bs.business_name
    `;

    const results: any[] = await sequelizeDbConnection.query(query, {
      bind: [allBusinessIds, startDateTime.toISOString(), endDateTime.toISOString()],
      type: QueryTypes.SELECT,
    });

    console.log(`[SOV vs Net Sentiment] Found ${results.length} businesses`);

    // Transform results
    const transformedResults = results.map((item) => ({
      business_name: item.business_name,
      business_id: item.business_id,
      total_posts: parseInt(item.total_posts) || 0,
      sov_percentage: parseFloat(item.sov_percentage) || 0,
      net_sentiment_score: item.net_sentiment_score !== null ? parseFloat(item.net_sentiment_score) : null,
    }));

    return NextResponse.json(transformedResults);
  } catch (err: any) {
    console.error("[SOV vs Net Sentiment] Error:", err);
    return NextResponse.json(
      {
        error: err.message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}