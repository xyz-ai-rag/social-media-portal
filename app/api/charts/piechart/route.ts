import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';
import { format, parse } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const all_business_ids = searchParams.get("all_business_ids");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: start_date, end_date" },
        { status: 400 }
      );
    }

    // Extract date part (YYYY-MM-DD) from the datetime string
    const startDate = start_date.split(' ')[0];
    const endDate = end_date.split(' ')[0];

    // Create datetime objects exactly like getBusinessPosts
    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    let businessIds: string[] = [];
    if (all_business_ids) {
      businessIds = all_business_ids.split(',').map(id => id.trim()).filter(Boolean);
    } else if (business_id) {
      businessIds = [business_id];
    } else {
      return NextResponse.json({ error: "Missing business_id(s)" }, { status: 400 });
    }

    const platformCodeMapping: Record<string, string> = {
      'xhs': 'rednote',
      'wb': 'weibo',
      'dy': 'douyin'
    };
    const platformDisplayMapping: Record<string, string> = {
      'rednote': "Rednote",
      'weibo': "Weibo",
      'douyin': "Douyin"
    };
    const platformColors: Record<string, string> = {
      Rednote: "#5A6ACF",
      Weibo: "#8593ED",
      Douyin: "#C7CEFF",
      Other: "#AAAAAA"
    };

    const businesses = await Promise.all(
      businessIds.map(async (bizId) => {
        const rows = await BusinessPostModel.findAll({
          attributes: ['platform', 'note_id', 'last_update_time'],
          where: {
            business_id: bizId,
            is_relevant: true,
            description: {
              [Op.ne]: "nan",
            },
            last_update_time: { [Op.between]: [startDateTime, endDateTime] }
          }
        });
        const counts: Record<string, number> = { Rednote: 0, Weibo: 0, Douyin: 0 };
        const uniqueNoteIds = new Set<string>();
        const loggedUnknownPlatforms = new Set<string>();
        rows.forEach(row => {
          const noteId = row.getDataValue("note_id");
          uniqueNoteIds.add(noteId);
          const platformCode = (row.getDataValue("platform") || "").toLowerCase();
          const normalizedPlatform = platformCodeMapping[platformCode] || platformCode;
          let displayPlatform = platformDisplayMapping[normalizedPlatform];
          if (!displayPlatform) {
            if (!loggedUnknownPlatforms.has(platformCode)) {
              loggedUnknownPlatforms.add(platformCode);
            }
            displayPlatform = "Other";
          }
          if (!(displayPlatform in counts)) {
            counts[displayPlatform] = 0;
          }
          counts[displayPlatform]++;
        });
          // build pie chart data
        const platformData = Object.entries(counts)
          .filter(([_, value]) => value > 0)
          .map(([platform, value]) => ({
            name: platform,
            value,
            color: platformColors[platform] || '#AAAAAA'
          }));
        return {
          business_id: bizId,
          platformData
        };
      })
    );

    const mergedCounts: Record<string, { name: string, value: number, color: string }> = {
      Rednote: { name: "Rednote", value: 0, color: "#5A6ACF" },
      Weibo: { name: "Weibo", value: 0, color: "#8593ED" },
      Douyin: { name: "Douyin", value: 0, color: "#C7CEFF" },
      Other: { name: "Other", value: 0, color: "#AAAAAA" }
    };

    businesses.forEach(biz => {
      biz.platformData.forEach(item => {
        if (item.name === "Rednote" || item.name === "Weibo" || item.name === "Douyin") {
          mergedCounts[item.name].value += item.value;
        } else {
          mergedCounts.Other.value += item.value;
        }
      });
    });

    const mergedPlatformData = Object.values(mergedCounts).filter(item => item.value > 0);

    return NextResponse.json({ platformData: mergedPlatformData });
  } catch (err: any) {
    console.error(`[PieChart] Error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}