// app/api/businesses/credit-cards/getPostsOverTime/route.ts
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
      `[Posts Over Time] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}, platform=${platform || 'all'}`
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

    console.log(`[Posts Over Time] Fetching for ${allBusinessIds.length} businesses:`, allBusinessIds);

    // Get all business names for dynamic column generation
    const businessNamesQuery = `
      SELECT business_id, business_name
      FROM business
      WHERE business_id = ANY($1::uuid[])
      ORDER BY business_name
    `;

    const businessNames: any[] = await sequelizeDbConnection.query(businessNamesQuery, {
      bind: [allBusinessIds],
      type: QueryTypes.SELECT,
    });

    console.log(`[Posts Over Time] Business names:`, businessNames.map(b => b.business_name));

    // Build dynamic CASE statements for each business
    const caseStatements = businessNames.map((b) => 
      `COALESCE(MAX(CASE WHEN b.business_name = '${b.business_name}' THEN pc.post_count ELSE 0 END), 0) as "${b.business_name}"`
    ).join(',\n        ');

    // Build total posts calculation
    const totalCalculation = businessNames.map((b) => 
      `COALESCE(MAX(CASE WHEN b.business_name = '${b.business_name}' THEN pc.post_count ELSE 0 END), 0)`
    ).join(' +\n        ');

    // Build platform filter condition
    const platformCondition = platform ? `AND bp.platform = $4` : '';

    // Use the exact query structure with dynamic platform filter
    const query = `
      WITH month_series AS (
        SELECT 
          DATE_TRUNC('month', month_date) as month_start,
          TO_CHAR(DATE_TRUNC('month', month_date), 'Mon YYYY') as month_year,
          EXTRACT(YEAR FROM DATE_TRUNC('month', month_date)) as year,
          EXTRACT(MONTH FROM DATE_TRUNC('month', month_date)) as month_num
        FROM GENERATE_SERIES(
          DATE_TRUNC('month', $1::timestamp),
          DATE_TRUNC('month', $2::timestamp),
          '1 month'::interval
        ) AS month_date
      ),
      business_list AS (
        SELECT DISTINCT business_id
        FROM public.business 
        WHERE business_id = ANY($3::uuid[])
      ),
      post_counts AS (
        SELECT 
          b.business_id,
          b.business_name,
          DATE_TRUNC('month', bp.last_update_time) as post_month,
          COUNT(bp.business_id) as post_count
        FROM business_list bl
        INNER JOIN public.business b ON bl.business_id = b.business_id
        LEFT JOIN public.business_posts bp ON 
          bl.business_id = bp.business_id 
          AND bp.is_relevant = true 
          AND bp.last_update_time BETWEEN $1 AND $2
          ${platformCondition}
        GROUP BY 
          b.business_id,
          b.business_name,
          DATE_TRUNC('month', bp.last_update_time)
      )
      SELECT 
        ms.month_year,
        ms.year,
        ms.month_num,
        ms.month_start,
        (
          ${totalCalculation}
        ) as total_posts,
        ${caseStatements}
      FROM month_series ms
      CROSS JOIN public.business b
      INNER JOIN business_list bl ON b.business_id = bl.business_id
      LEFT JOIN post_counts pc ON 
        b.business_id = pc.business_id 
        AND ms.month_start = pc.post_month
      GROUP BY 
        ms.month_year,
        ms.year,
        ms.month_num,
        ms.month_start
      ORDER BY 
        ms.year ASC,
        ms.month_num ASC
    `;

    console.log(`[Posts Over Time] Executing query...`);

    // Conditionally add platform to bind parameters
    const bindParams = platform 
      ? [startDateTime.toISOString(), endDateTime.toISOString(), allBusinessIds, platform]
      : [startDateTime.toISOString(), endDateTime.toISOString(), allBusinessIds];

    const results: any[] = await sequelizeDbConnection.query(query, {
      bind: bindParams,
      type: QueryTypes.SELECT,
    });

    console.log(`[Posts Over Time] Found ${results.length} months of data`);
    if (results.length > 0) {
      console.log(`[Posts Over Time] Sample data:`, results[0]);
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[Posts Over Time] Error:", err);
    return NextResponse.json(
      {
        error: err.message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}