// app/api/businesses/credit-cards/getShareOfVoiceOverTime/route.ts
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
      `[SOV Over Time] Query params: business_id=${business_id}, start_date=${startDateTime.toISOString()}, end_date=${endDateTime.toISOString()}, platform=${platform || 'all'}`
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

    console.log(`[SOV Over Time] Fetching for ${allBusinessIds.length} businesses`);

    // Get all business names first
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

    console.log(`[SOV Over Time] Business names:`, businessNames.map(b => b.business_name));

    // Build dynamic CASE statements for each business
    const caseStatements = businessNames
      .filter(b => b.business_name) // Filter out null business names
      .map((b) => {
        const safeName = b.business_name.replace(/'/g, "''"); // Escape single quotes
        return `MAX(CASE WHEN business_name = '${safeName}' THEN percentage ELSE 0 END) AS "${b.business_name}"`;
      })
      .join(',\n        ');

    if (!caseStatements) {
      return NextResponse.json([]);
    }

    // Build platform filter condition
    const platformCondition = platform ? `AND bp.platform = $4` : '';

    // Main query for share of voice over time with dynamic platform filter
    const query = `
      WITH monthly_totals AS (
        SELECT 
          TO_CHAR(last_update_time, 'Mon YYYY') AS month_year,
          TO_CHAR(last_update_time, 'YYYY-MM') AS year_month_order,
          COUNT(*) AS total_monthly_posts
        FROM business_posts bp
        WHERE bp.business_id = ANY($1::uuid[])
          AND bp.is_relevant = true 
          AND bp.last_update_time BETWEEN $2 AND $3
          ${platformCondition}
        GROUP BY TO_CHAR(last_update_time, 'Mon YYYY'), TO_CHAR(last_update_time, 'YYYY-MM')
      ),
      business_monthly AS (
        SELECT 
          TO_CHAR(bp.last_update_time, 'Mon YYYY') AS month_year,
          TO_CHAR(bp.last_update_time, 'YYYY-MM') AS year_month_order,
          b.business_name,
          COUNT(*) AS business_posts
        FROM business_posts bp
        JOIN business b ON bp.business_id = b.business_id
        WHERE bp.business_id = ANY($1::uuid[])
          AND bp.is_relevant = true 
          AND bp.last_update_time BETWEEN $2 AND $3
          AND b.business_name IS NOT NULL
          ${platformCondition}
        GROUP BY TO_CHAR(bp.last_update_time, 'Mon YYYY'), TO_CHAR(bp.last_update_time, 'YYYY-MM'), b.business_name
      ),
      business_percentages AS (
        SELECT 
          bm.month_year,
          bm.year_month_order,
          bm.business_name,
          COALESCE(ROUND((bm.business_posts * 100.0 / NULLIF(mt.total_monthly_posts, 0)), 2), 0) AS percentage
        FROM business_monthly bm
        JOIN monthly_totals mt ON bm.month_year = mt.month_year
      )
      SELECT 
        month_year,
        year_month_order,
        ${caseStatements}
      FROM business_percentages
      GROUP BY month_year, year_month_order
      ORDER BY year_month_order
    `;

    console.log(`[SOV Over Time] Executing query...`);

    // Conditionally add platform to bind parameters
    const bindParams = platform 
      ? [allBusinessIds, startDateTime.toISOString(), endDateTime.toISOString(), platform]
      : [allBusinessIds, startDateTime.toISOString(), endDateTime.toISOString()];

    const results: any[] = await sequelizeDbConnection.query(query, {
      bind: bindParams,
      type: QueryTypes.SELECT,
    });

    console.log(`[SOV Over Time] Found ${results.length} months of data`);
    if (results.length > 0) {
      console.log(`[SOV Over Time] Sample data:`, results[0]);
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[SOV Over Time] Error:", err);
    return NextResponse.json(
      {
        error: err.message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}