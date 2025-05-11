import { BusinessTopicsModel, BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op, fn, col, literal } from "sequelize";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Required parameters
    const businessId = searchParams.get("businessId");
    const topic = decodeURIComponent(searchParams.get("topic") || "");
    
    if (!businessId || !topic) {
      return NextResponse.json(
        { error: "Business ID and topic are required" },
        { status: 400 }
      );
    }

    const topicRows = await BusinessTopicsModel.findAll({
      where: {
        business_id: businessId,
        topic: topic,
      },
      attributes: ['note_id'],
      raw: true
    });
    const noteIds = topicRows.map(row => row.note_id);
    if (noteIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const postRows = await BusinessPostModel.findAll({
      where: {
        note_id: { [Op.in]: noteIds },
      },
      attributes: ['note_id', 'last_update_time'],
      order: [['last_update_time', 'ASC']],
      raw: true
    });
    

    return NextResponse.json({ postRows });
  } catch (error: any) {
    console.error("Error fetching topic posts trend:", error);
    return NextResponse.json(
      { error: "Failed to fetch topic posts trend", details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to format date for query
function formatDateForQuery(date: Date): string {
  return date.toISOString().split("T")[0];
}