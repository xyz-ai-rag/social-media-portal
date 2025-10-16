// app/api/businesses/credit-cards/getNetSentimentScore/route.ts
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
      `[Net Sentiment Score] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}`
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

    console.log(`[Net Sentiment Score] Fetching for ${allBusinessIds.length} businesses`);

    // Main query using the exact structure from your SQL
    const query = `
      SELECT 
        b.business_id,
        b.business_name,
        COUNT(bp.note_id) as total_posts,
        COUNT(CASE WHEN bp.english_sentiment IN ('Highly positive', 'Positive', 'Negative', 'Highly negative') THEN 1 END) as non_neutral_posts,
        COUNT(CASE WHEN bp.english_sentiment = 'Highly positive' THEN 1 END) as highly_positive,
        COUNT(CASE WHEN bp.english_sentiment = 'Positive' THEN 1 END) as positive,
        COUNT(CASE WHEN bp.english_sentiment = 'Neutral' THEN 1 END) as neutral,
        COUNT(CASE WHEN bp.english_sentiment = 'Negative' THEN 1 END) as negative,
        COUNT(CASE WHEN bp.english_sentiment = 'Highly negative' THEN 1 END) as highly_negative,
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
      ORDER BY net_sentiment_score
    `;

    const results: any[] = await sequelizeDbConnection.query(query, {
      bind: [allBusinessIds, startDateTime.toISOString(), endDateTime.toISOString()],
      type: QueryTypes.SELECT,
    });

    console.log(`[Net Sentiment Score] Found ${results.length} businesses with sentiment scores`);

    // Transform results to ensure proper number types
    const transformedResults = results.map((item) => ({
      business_name: item.business_name,
      business_id: item.business_id,
      total_posts: parseInt(item.total_posts) || 0,
      non_neutral_posts: parseInt(item.non_neutral_posts) || 0,
      highly_positive: parseInt(item.highly_positive) || 0,
      positive: parseInt(item.positive) || 0,
      neutral: parseInt(item.neutral) || 0,
      negative: parseInt(item.negative) || 0,
      highly_negative: parseInt(item.highly_negative) || 0,
      net_sentiment_score: item.net_sentiment_score !== null ? parseFloat(item.net_sentiment_score) : null,
    }));

    return NextResponse.json(transformedResults);
  } catch (err: any) {
    console.error("[Net Sentiment Score] Error:", err);
    return NextResponse.json(
      {
        error: err.message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}