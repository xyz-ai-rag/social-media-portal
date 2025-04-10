// /api/charts/grouped-bar-chart/route.ts
import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { differenceInDays } from 'date-fns';
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
    
    // Convert date strings to Date objects.
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Calculate total number of days (inclusive)
    
    const totalDays = differenceInDays(endDate, startDate) + 1;
      console.log("checking total tays",totalDays)
    if (totalDays % 2 !== 0) {
      return NextResponse.json(
        { error: "Date range must yield an even number of days (inclusive)" },
        { status: 400 }
      );
    }

    // Query posts for the given business_id and date range.
    const posts = await BusinessPostModel.findAll({
      attributes: ['note_id', 'last_update_time'], 
      where: {
        business_id,
        last_update_time: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [["last_update_time", "ASC"]]
    });

    // Initialize counts for each day in the range (key: "yyyy-mm-dd").
    const counts: { [date: string]: number } = {};
    const dailyKeys: string[] = [];
    // Build keys and initialize count to 0 for each day.
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      counts[key] = 0;
      dailyKeys.push(key);
    }

    // Count posts per day (using the date part of last_update_time).
    posts.forEach(post => {
      const dt = new Date(post.getDataValue("last_update_time"));
      const key = dt.toISOString().slice(0, 10);
      if (counts[key] !== undefined) {
        counts[key]++;
      }
    });

    // Build an ordered array of daily counts.
    const dailyCounts = dailyKeys.map(key => ({ date: key, count: counts[key] }));

    // If no records, return empty array.
    if (dailyCounts.length === 0) {
      return NextResponse.json([]);
    }

    // Condition 1: Period > 14 days — aggregate totals for the two halves.
    if (totalDays > 14) {
      const half = totalDays / 2;
      const previousCount = dailyCounts
        .slice(0, half)
        .reduce((sum, record) => sum + record.count, 0);
      const currentCount = dailyCounts
        .slice(half)
        .reduce((sum, record) => sum + record.count, 0);

      // Return a single object (inside an array) that has both totals.
      return NextResponse.json([
        { previousValue: previousCount, currentValue: currentCount }
      ]);
    } else {
      // Condition 2: Period is 14 days or less — pair each day of first half with the corresponding day of second half.
      const half = totalDays / 2;
      const pairedResults = [];
      for (let i = 0; i < half; i++) {
        const previousRecord = dailyCounts[i];
        const currentRecord = dailyCounts[i + half];
        pairedResults.push({
          previousValue: previousRecord.count,
          currentValue: currentRecord.count
        });
      }
      return NextResponse.json(pairedResults);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
