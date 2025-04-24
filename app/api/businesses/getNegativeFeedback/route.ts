// /api/businesses/getNegativeFeedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    if (!businessId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters: businessId, startDate, endDate" },
        { status: 400 }
      );
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Get posts with negative feedback
    const posts = await BusinessPostModel.findAll({
      attributes: ['negative_feedback_summary'],
      where: {
        business_id: businessId,
        is_relevant: true,
        has_negative_or_criticism: true,
        last_update_time: { [Op.between]: [startDateTime, endDateTime] },
        negative_feedback_summary: {
          [Op.not]: null,
          [Op.ne]: ''
        }
      }
    });

    // Extract unique feedback summaries
    const feedbackSummaries = new Set<string>();
    
    posts.forEach(post => {
      const feedback = post.getDataValue('negative_feedback_summary');
      if (feedback) {
        // Handle both string and JSON array format
        if (typeof feedback === 'string') {
          try {
            // Try to parse as JSON
            const parsedFeedback = JSON.parse(feedback);
            if (Array.isArray(parsedFeedback)) {
              parsedFeedback.forEach(item => {
                if (item && typeof item === 'string') {
                  feedbackSummaries.add(item.trim());
                }
              });
            } else {
              feedbackSummaries.add(feedback.trim());
            }
          } catch (e) {
            // If not JSON, add as is
            feedbackSummaries.add(feedback.trim());
          }
        } else if (Array.isArray(feedback)) {
          feedback.forEach(item => {
            if (item && typeof item === 'string') {
              feedbackSummaries.add(item.trim());
            }
          });
        }
      }
    });

    return NextResponse.json({
      feedbackSummaries: Array.from(feedbackSummaries)
    });
  } catch (err: any) {
    console.error('Error getting negative feedback:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}