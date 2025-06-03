import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { parse, format, endOfMonth, startOfMonth } from "date-fns";
import { setEndOfDay } from "@/utils/timeUtils";
import { setStartOfDay } from "@/utils/timeUtils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const type = searchParams.get("type");
    const param = searchParams.get("param");

    if (!month || !type) {
      return NextResponse.json(
        { error: "Missing required parameters: month, type" },
        { status: 400 }
      );
    }

    const date = parse(month, 'yyyy-MM', new Date());
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const startDate = setStartOfDay(format(startOfMonth(date), 'yyyy-MM-dd'));
    const endDate = setEndOfDay(format(endOfMonth(date), 'yyyy-MM-dd'));

    let whereClause: any = {
      is_relevant: true,
      last_update_time: { [Op.between]: [startDate, endDate] }
    };

    // Add type-specific conditions
    switch (type) {
      case 'platform':
        if (!param) {
          return NextResponse.json({ error: "Platform parameter required" }, { status: 400 });
        }
        whereClause.platform = param.toLowerCase();
        break;

      case 'postType':
        if (!param) {
          return NextResponse.json({ error: "Post type parameter required" }, { status: 400 });
        }
        whereClause.post_category = param.toLowerCase() + ' post';
        break;

      case 'business':
        if (!param) {
          return NextResponse.json({ error: "Business ID parameter required" }, { status: 400 });
        }
        whereClause.business_id = param;
        break;

      default:
        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    const count = await BusinessPostModel.count({
      where: whereClause,
      distinct: true,
      col: 'note_id'
    });

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error(`[PostsCount] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
