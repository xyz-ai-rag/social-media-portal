import { BusinessPostModel, BusinessTopicsModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";

/**
 * API endpoint to get business posts filtered by topic
 * GET /api/businesses/getBusinessPostsByTopic?businessId=xxx&topic=xxx&startDate=xxx&endDate=xxx&platform=xxx&sentiment=xxx&relevance=xxx&hasCriticism=xxx&search=xxx
 */
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

    // Get current date (without time component)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Format dates to YYYY-MM-DD for comparison
    const defaultStartDate = formatDateForQuery(sevenDaysAgo);
    const defaultEndDate = formatDateForQuery(yesterday);

    // Optional filter parameters with defaults
    const startDate = searchParams.get("startDate") || defaultStartDate;
    const endDateParam = searchParams.get("endDate");

    // If end date includes today or is after today, adjust it to yesterday
    let endDate = endDateParam || defaultEndDate;
    const endDateObj = new Date(endDate);
    endDateObj.setHours(0, 0, 0, 0);

    if (endDateObj >= today) {
      endDate = formatDateForQuery(yesterday);
    }

    const platform = searchParams.get("platform") || "";
    const sentiment = searchParams.get("sentiment") || "";
    const relevance = searchParams.get("relevance") || "";
    const hasCriticism = searchParams.get("hasCriticism") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const sortOrder = (searchParams.get("sortOrder") || "desc").toLowerCase();

    // First, get all note_ids from business_topics table for the given topic
    const topicNotes = await BusinessTopicsModel.findAll({
      where: {
        business_id: businessId,
        topic: topic
      },
      attributes: ['note_id'],
      raw: true
    });

    const noteIds = topicNotes.map(note => note.note_id);
    console.log(noteIds.length,"length")

    if (noteIds.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: {
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          pageSize,
        },
        appliedFilters: {
          startDate,
          endDate,
          platform,
          sentiment,
          relevance,
          hasCriticism,
          search,
          sortOrder,
        },
      });
    }

    // Build query conditions for business_posts
    const whereConditions: any = {
      note_id: {
        [Op.in]: noteIds
      },
      is_relevant: true,
      description: {
        [Op.ne]: "nan",
      },
    };

    // Apply date range filter
    const startDateTime = `${startDate} 0:00:00`;
    const endDateTime = `${endDate} 23:59:59`;

    whereConditions.last_update_time = {
      [Op.between]: [new Date(startDateTime), new Date(endDateTime)],
    };

    // Apply platform filter if provided
    if (platform) {
      let dbPlatform;
      switch (platform) {
        case "Rednote":
          dbPlatform = "xhs";
          break;
        case "Weibo":
          dbPlatform = "wb";
          break;
        case "Douyin":
          dbPlatform = "dy";
          break;
        default:
          dbPlatform = platform;
      }

      whereConditions.platform = dbPlatform;
    }

    // Apply sentiment filter if provided
    if (sentiment) {
      whereConditions.english_sentiment = sentiment;
    }

    // Apply relevance filter if provided
    if (relevance) {
      const relevanceValue = parseInt(relevance.replace("%", ""));
      if (relevance.includes("<")) {
        whereConditions.relevance_percentage = {
          [Op.lt]: relevanceValue,
        };
      } else {
        whereConditions.relevance_percentage = {
          [Op.gte]: relevanceValue,
        };
      }
    }

    // Apply criticism filter if provided
    if (hasCriticism) {
      const criticismValue =
        hasCriticism === "true" || hasCriticism === "Has Criticism";
      whereConditions.has_negative_or_criticism = criticismValue;
    }

    // Apply search filter if provided
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereConditions[Op.and] = keywords.map((keyword) => ({
        [Op.or]: [
          { description: { [Op.iLike]: `%${keyword}%` } },
          { english_desc: { [Op.iLike]: `%${keyword}%` } },
          { title: { [Op.iLike]: `%${keyword}%` } },
          { english_title: { [Op.iLike]: `%${keyword}%` } },
          { tag_list: { [Op.iLike]: `%${keyword}%` } },
          { english_tag_list: { [Op.iLike]: `%${keyword}%` } },
          { nickname: { [Op.iLike]: `%${keyword}%` } },
        ],
      }));
    }

    const totalCount = await BusinessPostModel.count({
      where: whereConditions,
    });

    const totalPages = Math.ceil(totalCount / pageSize);
    const adjustedPage =
      page > totalPages && totalPages > 0 ? totalPages : page;
    const offset = (adjustedPage - 1) * pageSize;

    const { rows } = await BusinessPostModel.findAndCountAll({
      where: whereConditions,
      attributes: [
        'business_id',
        'note_id',
        'description',
        'title',
        'english_desc',
        'english_preview_text',
        'english_title',
        'tag_list',
        'english_tag_list',
        'last_update_time',
        'english_sentiment',
        'nickname',
        'relevance_percentage',
        'platform',
        'has_negative_or_criticism',
        'negative_feedback_summary',
        'note_url'
      ],
      order: [["last_update_time", sortOrder === "asc" ? "ASC" : "DESC"]],
      limit: pageSize,
      offset: offset,
    });

    const posts = rows.map((post) => {
      const postData = post.get({ plain: true });

      let displayPlatform;
      switch (postData.platform) {
        case "xhs":
          displayPlatform = "Rednote";
          break;
        case "wb":
          displayPlatform = "Weibo";
          break;
        case "dy":
          displayPlatform = "Douyin";
          break;
        default:
          displayPlatform = postData.platform;
      }

      return {
        id: postData.note_id,
        businessId: postData.business_id,
        description: postData.description,
        englishDesc: postData.english_desc,
        post: postData.english_preview_text || postData.english_desc || postData.description,
        title: postData.title,
        englishTitle: postData.english_title,
        displayTitle: postData.english_title || postData.title,
        tagList: postData.tag_list,
        englishTagList: postData.english_tag_list,
        taglist: postData.english_tag_list || postData.tag_list,
        date: postData.last_update_time,
        showDate: formatDisplayDate(postData.last_update_time),
        sentiment: postData.english_sentiment,
        nickname: postData.nickname,
        relvance: postData.relevance_percentage,
        platform: displayPlatform,
        dbPlatform: postData.platform,
        hasCriticism: postData.has_negative_or_criticism,
        criticismSummary: postData.negative_feedback_summary,
        url: postData.note_url
      };
    });

    return NextResponse.json({
      posts,
      pagination: {
        totalCount,
        totalPages,
        currentPage: adjustedPage,
        pageSize,
      },
      appliedFilters: {
        startDate,
        endDate,
        platform,
        sentiment,
        relevance,
        hasCriticism,
        search,
        sortOrder,
      },
    });
  } catch (error: any) {
    console.error("Error fetching posts by topic:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts by topic", details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to format date for query
function formatDateForQuery(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper function to format date for display
function formatDisplayDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
} 