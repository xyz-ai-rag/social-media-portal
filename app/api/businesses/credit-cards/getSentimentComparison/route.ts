// app/api/businesses/credit-cards/getSentimentComparison/route.ts
import { NextRequest, NextResponse } from "next/server";
import { QueryTypes } from "sequelize";
import { sequelizeDbConnection } from "@/feature/sqlORM/sqlDbConnection";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const platform = searchParams.get("platform"); // Get platform parameter

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
      `[Sentiment Comparison] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}, platform=${platform || 'all'}`
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

    console.log(`[Sentiment Comparison] Fetching for ${allBusinessIds.length} businesses`);

    // Build platform filter condition
    const platformCondition = platform ? `AND bp.platform = $4` : '';

    // Main query with dynamic platform filter
    const query = `
      WITH sentiment_groups AS (
        SELECT 'Positive' AS sentiment_group, 'Highly positive' AS english_sentiment, 1 AS sort_order UNION ALL
        SELECT 'Positive', 'Positive', 2 UNION ALL
        SELECT 'Neutral', 'Neutral', 3 UNION ALL
        SELECT 'Negative', 'Negative', 4 UNION ALL
        SELECT 'Negative', 'Highly negative', 5
      ),
      business_list AS (
        SELECT DISTINCT b.business_id, b.business_name
        FROM business b
        WHERE b.business_id = ANY($1::uuid[])
      ),
      business_totals AS (
        SELECT 
          bp.business_id,
          COUNT(*) AS total_posts
        FROM business_posts bp
        WHERE bp.is_relevant = true 
          AND bp.last_update_time BETWEEN $2 AND $3
          AND bp.english_sentiment IS NOT NULL 
          AND bp.english_sentiment != ''
          AND bp.business_id = ANY($1::uuid[])
          ${platformCondition}
        GROUP BY bp.business_id
      ),
      sentiment_counts AS (
        SELECT 
          bl.business_id, 
          bl.business_name,
          sg.sentiment_group,
          COALESCE(bt.total_posts, 0) AS business_total_posts,
          COUNT(bp.business_id) AS sentiment_count
        FROM business_list bl
        CROSS JOIN sentiment_groups sg
        LEFT JOIN business_totals bt ON bl.business_id = bt.business_id
        LEFT JOIN business_posts bp ON bl.business_id = bp.business_id 
          AND sg.english_sentiment = bp.english_sentiment
          AND bp.is_relevant = true 
          AND bp.last_update_time BETWEEN $2 AND $3
          AND bp.english_sentiment IS NOT NULL 
          AND bp.english_sentiment != ''
          ${platformCondition}
        GROUP BY bl.business_id, bl.business_name, sg.sentiment_group, bt.total_posts
      )
      SELECT 
        business_name,
        business_id,
        ROUND(MAX(CASE WHEN sentiment_group = 'Positive' THEN 
          CASE WHEN business_total_posts = 0 THEN 0 
               ELSE (sentiment_count * 100.0 / business_total_posts) 
          END 
        END), 0) AS positive_percentage,
        ROUND(MAX(CASE WHEN sentiment_group = 'Neutral' THEN 
          CASE WHEN business_total_posts = 0 THEN 0 
               ELSE (sentiment_count * 100.0 / business_total_posts) 
          END 
        END), 0) AS neutral_percentage,
        ROUND(MAX(CASE WHEN sentiment_group = 'Negative' THEN 
          CASE WHEN business_total_posts = 0 THEN 0 
               ELSE (sentiment_count * 100.0 / business_total_posts) 
          END 
        END), 0) AS negative_percentage,
        MAX(business_total_posts) AS total_posts
      FROM sentiment_counts
      GROUP BY business_id, business_name
      ORDER BY business_name
    `;

    // Conditionally add platform to bind parameters
    const bindParams = platform 
      ? [allBusinessIds, startDateTime.toISOString(), endDateTime.toISOString(), platform]
      : [allBusinessIds, startDateTime.toISOString(), endDateTime.toISOString()];

    const results: any[] = await sequelizeDbConnection.query(query, {
      bind: bindParams,
      type: QueryTypes.SELECT,
    });

    console.log(`[Sentiment Comparison] Found ${results.length} businesses with sentiment data`);

    // Transform results to ensure proper number types
    const transformedResults = results.map((item) => ({
      business_name: item.business_name,
      business_id: item.business_id,
      total_posts: parseInt(item.total_posts) || 0,
      positive_percentage: parseFloat(item.positive_percentage) || 0,
      neutral_percentage: parseFloat(item.neutral_percentage) || 0,
      negative_percentage: parseFloat(item.negative_percentage) || 0,
    }));

    return NextResponse.json(transformedResults);
  } catch (err: any) {
    console.error("[Sentiment Comparison] Error:", err);
    return NextResponse.json(
      {
        error: err.message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}