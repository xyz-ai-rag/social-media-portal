// /api/charts/piechart/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!business_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: business_id, start_date, end_date" },
        { status: 400 }
      );
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Query only the hashtag_topic_category for the given period.
    const rows = await BusinessPostModel.findAll({
      attributes: ['hashtag_topic_category'],
      where: {
        business_id, // adjust field name if necessary
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] }
      }
    });

    // Count occurrences per category.
    const counts: Record<string, number> = {};
    let totalCount = 0;

    rows.forEach(row => {
      const category = row.getDataValue("hashtag_topic_category");
      // Consider non-empty, non-null values.
      if (category && typeof category === "string" && category.trim() !== "") {
        const normalized = category.trim();
        counts[normalized] = (counts[normalized] || 0) + 1;
        totalCount++;
      }
    });

    // If no categories found, return an empty array.
    if (totalCount === 0) {
      return NextResponse.json([]);
    }

    // Convert counts object to an array and sort by frequency descending.
    const sortedCategories = Object.entries(counts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5); // Take top 5

    // Map sorted values to required format including percentage calculation.
    const result = sortedCategories.map(([tag, count]) => ({
      tag,
      percentage: parseFloat(((count / totalCount) * 100).toFixed(1))
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
