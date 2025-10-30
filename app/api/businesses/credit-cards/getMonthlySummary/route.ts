// /api/businesses/credit-cards/getMonthlySummary/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  MonthlySummaryModel,
  MonthlyTopicModel,
  MonthlyTopicQuoteModel,
} from "@/feature/sqlORM/modelorm";


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const month = searchParams.get("month");

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }

    // If month is provided, get specific month's summary
    if (month) {
      const summary = await MonthlySummaryModel.findOne({
        where: {
          business_id: businessId,
          month: month,
        },
      });

      if (!summary) {
        return NextResponse.json(
          { error: "No summary found for this month" },
          { status: 404 }
        );
      }

      // Fetch topics for this summary
      const topics = await MonthlyTopicModel.findAll({
        where: {
          monthly_summary_id: summary.id,
        },
        order: [["created_at", "ASC"]],
      });

      // Separate strengths and weaknesses
      const strengths = topics.filter((t) => t.topic_type === "strength");
      const weaknesses = topics.filter((t) => t.topic_type === "weakness");

      // Get quote counts for each topic
      const topicsWithCounts = await Promise.all(
        topics.map(async (topic) => {
          const quoteCount = await MonthlyTopicQuoteModel.count({
            where: { monthly_topic_id: topic.id },
          });
          return {
            ...topic.toJSON(),
            quote_count: quoteCount,
          };
        })
      );

      const strengthsWithCounts = topicsWithCounts.filter(
        (t) => t.topic_type === "strength"
      );
      const weaknessesWithCounts = topicsWithCounts.filter(
        (t) => t.topic_type === "weakness"
      );

      return NextResponse.json({
        success: true,
        data: {
          summary: summary.toJSON(),
          strengths: strengthsWithCounts,
          weaknesses: weaknessesWithCounts,
        },
      });
    }

    // If no month provided, get all available months for this business
    const summaries = await MonthlySummaryModel.findAll({
      where: {
        business_id: businessId,
      },
      attributes: ["month", "post_count_current_month"],
      order: [["month", "DESC"]],
    });

    const availableMonths = summaries.map((s) => ({
      month: s.month,
      post_count: s.post_count_current_month,
    }));

    return NextResponse.json({
      success: true,
      data: {
        available_months: availableMonths,
      },
    });
  } catch (error: any) {
    console.error("Error fetching monthly summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly summary", details: error.message },
      { status: 500 }
    );
  }
}