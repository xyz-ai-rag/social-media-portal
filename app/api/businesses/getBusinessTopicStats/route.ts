import { 
  BusinessTopicsModel, 
  TestBusinessTopicsModel, 
  BusinessPostModel,
  BusinessTopicsTranslationsModel,
  BusinessModel
} from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op, fn, col, literal } from "sequelize";

/**
 * POST /api/businesses/getTopicStats
 * body: { businessId, topicType, startDate?, endDate?, preferredLanguage? }
 */

const DEPLOY_ENV = process.env.DEPLOY_ENV;
const TopicModelToUse = DEPLOY_ENV === "test" ? TestBusinessTopicsModel : BusinessTopicsModel;

export async function POST(request: NextRequest) {
  try {
    const { businessId, topicType, startDate, endDate, preferredLanguage = 'en',platform  } = await request.json();

    if (!businessId || !topicType) {
      return NextResponse.json(
        { error: "businessId and topicType are required" },
        { status: 400 }
      );
    }

    // Get business type to determine if translations are available
    const business = await BusinessModel.findOne({
      where: { business_id: businessId },
      attributes: ['business_type'],
      raw: true
    });

    const hasTranslations = business?.business_type === 'Credit card';
    // Only use translations if they exist AND user prefers Chinese
    const useTranslations = hasTranslations && preferredLanguage === 'zh';

    let topicCounts: any[] = [];

    if (startDate && endDate) {
      // Build where clause for posts
      const postWhere: any = {
        create_time: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        },
        is_relevant: true,
        business_id: businessId
      };

      // Add platform filter if provided
      if (platform) {
        postWhere.platform = platform;
      }

      // Get note_ids from posts within date range and optional platform filter
      const relevantPosts = await BusinessPostModel.findAll({
        where: postWhere,
        attributes: ['note_id'],
        raw: true
      });

      const noteIds = relevantPosts.map(post => post.note_id);

      if (noteIds.length === 0) {
        topicCounts = [];
      } else {
        if (useTranslations) {
          // Get topic counts WITHOUT the join for accurate counting
          const rawTopicCounts = await TopicModelToUse.findAll({
            where: {
              business_id: businessId,
              topic_type: topicType,
              note_id: {
                [Op.in]: noteIds
              }
            },
            attributes: [
              "topic",
              [fn("COUNT", col("id")), "count"]
            ],
            group: ["topic"],
            order: [[literal("count"), "DESC"]],
            raw: true,
          }) as any[];

          // Get all topic IDs with their topics for this business
          const topicToIdMap = await TopicModelToUse.findAll({
            where: {
              business_id: businessId,
              topic_type: topicType,
              note_id: {
                [Op.in]: noteIds
              }
            },
            attributes: ['id', 'topic'],
            raw: true
          }) as any[];

          // Build a map: topic_id -> topic_name
          const idToTopicMap = new Map();
          topicToIdMap.forEach(row => {
            idToTopicMap.set(row.id, row.topic);
          });

          // Get translations separately
          const translations = await BusinessTopicsTranslationsModel.findAll({
            attributes: ['topic_id', 'translated_topic', 'alternative_language'],
            where: {
              alternative_language: 'Chinese',
              topic_id: {
                [Op.in]: Array.from(idToTopicMap.keys())
              }
            },
            raw: true
          }) as any[];

          // Build translation map: topic_name -> translated_topic
          const translationMap = new Map();
          translations.forEach(trans => {
            const topicName = idToTopicMap.get(trans.topic_id);
            if (topicName && !translationMap.has(topicName)) {
              translationMap.set(topicName, trans.translated_topic);
            }
          });

          // Combine counts with translations
          topicCounts = rawTopicCounts.map(t => ({
            topic: t.topic,
            displayTopic: translationMap.get(t.topic) || t.topic,
            count: Number(t.count),
            hasTranslation: translationMap.has(t.topic)
          }));
        } else {
          // Get topic counts without translations (English or no translations available)
          const rawTopicCounts = await TopicModelToUse.findAll({
            where: {
              business_id: businessId,
              topic_type: topicType,
              note_id: {
                [Op.in]: noteIds
              }
            },
            attributes: [
              "topic",
              [fn("COUNT", col("id")), "count"]
            ],
            group: ["topic"],
            order: [[literal("count"), "DESC"]],
            raw: true,
          }) as any[];
          
          // Use original English topic for both topic and displayTopic
          topicCounts = rawTopicCounts.map(t => ({
            topic: t.topic,
            displayTopic: t.topic,
            count: Number(t.count),
            hasTranslation: false
          }));
        }
      }
    } else {
      // No date filtering
      if (useTranslations) {
        // Get topic counts WITHOUT the join for accurate counting
        const rawTopicCounts = await TopicModelToUse.findAll({
          where: {
            business_id: businessId,
            topic_type: topicType,
          },
          attributes: [
            "topic",
            [fn("COUNT", col("id")), "count"]
          ],
          group: ["topic"],
          order: [[literal("count"), "DESC"]],
          raw: true,
        }) as any[];

        // Get all topic IDs with their topics for this business
        const topicToIdMap = await TopicModelToUse.findAll({
          where: {
            business_id: businessId,
            topic_type: topicType
          },
          attributes: ['id', 'topic'],
          raw: true
        }) as any[];

        // Build a map: topic_id -> topic_name
        const idToTopicMap = new Map();
        topicToIdMap.forEach(row => {
          idToTopicMap.set(row.id, row.topic);
        });

        // Get translations separately
        const translations = await BusinessTopicsTranslationsModel.findAll({
          attributes: ['topic_id', 'translated_topic', 'alternative_language'],
          where: {
            alternative_language: 'Chinese',
            topic_id: {
              [Op.in]: Array.from(idToTopicMap.keys())
            }
          },
          raw: true
        }) as any[];

        // Build translation map: topic_name -> translated_topic
        const translationMap = new Map();
        translations.forEach(trans => {
          const topicName = idToTopicMap.get(trans.topic_id);
          if (topicName && !translationMap.has(topicName)) {
            translationMap.set(topicName, trans.translated_topic);
          }
        });

        // Combine counts with translations
        topicCounts = rawTopicCounts.map(t => ({
          topic: t.topic,
          displayTopic: translationMap.get(t.topic) || t.topic,
          count: Number(t.count),
          hasTranslation: translationMap.has(t.topic)
        }));
      } else {
        // Get topic counts without translations (English or no translations available)
        const rawTopicCounts = await TopicModelToUse.findAll({
          where: {
            business_id: businessId,
            topic_type: topicType,
          },
          attributes: [
            "topic",
            [fn("COUNT", col("id")), "count"]
          ],
          group: ["topic"],
          order: [[literal("count"), "DESC"]],
          raw: true,
        }) as any[];
        
        // Use original English topic for both topic and displayTopic
        topicCounts = rawTopicCounts.map(t => ({
          topic: t.topic,
          displayTopic: t.topic,
          count: Number(t.count),
          hasTranslation: false
        }));
      }
    }

    // Calculate total
    const total = topicCounts.reduce((sum, t) => sum + t.count, 0);

    // Format response with percentage (displayTopic already set above)
    const topics = topicCounts.map((t: any) => ({
      topic: t.topic,
      displayTopic: t.displayTopic,
      count: t.count,
      percentage: total > 0 ? t.count / total : 0,
      hasTranslation: t.hasTranslation
    }));

    return NextResponse.json({ topics, total });
  } catch (error: any) {
    console.error("Error fetching topic stats:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch topic stats", details: error.message },
      { status: 500 }
    );
  }
}