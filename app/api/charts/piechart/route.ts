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

    // Query only the necessary field: platform.
    const rows = await BusinessPostModel.findAll({
      attributes: ['platform'],
      where: {
        business_id,
        is_relevant:true,
        last_update_time: { [Op.between]: [startDate, endDate] }
      }
    });

    // Define the mapping. In this case, we remap 'xhs' to 'rednote'.
    const platformMapping: Record<string, string> = {
      xhs: "Rednote", // 'xhs' in DB should be considered as 'rednote'
      weibo: "Weibo",
      douyin: "Douyin"
    };

    // Define fixed colors.
    const platformColors: Record<string, string> = {
      Rednote: "#5A6ACF",
      Weibo: "#8593ED",
      Douyin: "#C7CEFF",
    };

    // Count posts per platform.
    const counts: Record<string, number> = { Rednote: 0, Weibo: 0, Douyin: 0 };

    rows.forEach(row => {
      // Get the raw platform value and normalize it to lowercase.
      let platform = (row.getDataValue("platform") || "").toLowerCase();
      // Map the DB value.
      if (platformMapping[platform]) {
        platform = platformMapping[platform];
      } else {
        // If platform is not recognized, you could default to 'rednote', or ignore.
        platform = "rednote";
      }
      if (platform in counts) {
        counts[platform]++;
      }
    });

    // Build pie chart data array.
    const pieData = Object.entries(counts).map(([platform, value]) => ({
      name: platform,
      value,
      color: platformColors[platform] || '#5470c6'
    }));

    return NextResponse.json(pieData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
