// /api/businesses/credit-cards/getTopicQuotes/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  MonthlyTopicModel,
  MonthlyTopicQuoteModel,
  BusinessPostModel,
} from "@/feature/sqlORM/modelorm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get("topicId");
    const businessId = searchParams.get("businessId");

    if (!topicId) {
      return NextResponse.json(
        { error: "topicId is required" },
        { status: 400 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }

    // Get topic details
    const topic = await MonthlyTopicModel.findByPk(topicId);

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Get all quotes for this topic (includes note_ids)
    const quotes = await MonthlyTopicQuoteModel.findAll({
      where: {
        monthly_topic_id: topicId,
      },
      order: [["created_at", "ASC"]],
    });

    // Extract note_ids from quotes
    const noteIds = quotes.map((q) => q.note_id);

    if (noteIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          topic: topic.toJSON(),
          note_ids: [],
          posts: [],
        },
      });
    }

    // Fetch full post details for these note_ids from business_posts
    const posts = await BusinessPostModel.findAll({
      where: {
        note_id: noteIds,
        business_id: businessId,
      },
      order: [["create_time", "DESC"]],
    });

    // Map quotes with their corresponding posts
    const quotesWithPosts = quotes.map((quote) => {
      const post = posts.find((p) => p.note_id === quote.note_id);
      return {
        quote_id: quote.id,
        note_id: quote.note_id,
        quote_text: quote.quote_text,
        post: post ? post.toJSON() : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        topic: topic.toJSON(),
        note_ids: noteIds,
        quotes_with_posts: quotesWithPosts,
        total_posts: posts.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching topic quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch topic quotes", details: error.message },
      { status: 500 }
    );
  }
}