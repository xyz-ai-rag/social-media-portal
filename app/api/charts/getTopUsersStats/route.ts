import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';
import { format, parse } from "date-fns";

interface UserPostCount {
  nickname: string;
  postCount: number;
}

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

    const startDate = parse(start_date, 'yyyy-MM-dd HH:mm:ss', new Date());
    const endDate = parse(end_date, 'yyyy-MM-dd HH:mm:ss', new Date());

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    console.log(`[TopUsers] Query params: business_id=${business_id}, start_date=${start_date}, end_date=${end_date}`);
    console.log(`[TopUsers] Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`);

    // Get posts within date range
    const posts = await BusinessPostModel.findAll({
      attributes: ['nickname'],
      where: {
        business_id,
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] }
      }
    });

    // Count posts per user
    const userPostCounts: Record<string, number> = {};
    posts.forEach(post => {
      const nickname = post.getDataValue('nickname');
      if (nickname) {
        userPostCounts[nickname] = (userPostCounts[nickname] || 0) + 1;
      }
    });

    // Filter users with more than one post and sort by post count
    const topUsers = Object.entries(userPostCounts)
      .filter(([_, count]) => count > 1)
      .map(([nickname, count]) => ({
        nickname,
        postCount: count
      }))
      .sort((a, b) => b.postCount - a.postCount);

    console.log(`[TopUsers] Total posts found: ${posts.length}`);
    console.log(`[TopUsers] Total unique users: ${topUsers.length}`);

    return NextResponse.json(topUsers);
  } catch (error: any) {
    console.error(`[TopUsers] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 