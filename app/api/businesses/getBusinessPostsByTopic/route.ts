import { NextRequest } from "next/server";
import { fn, col, literal, where, Op } from "sequelize";
import { PostsModel } from "@/feature/sqlORM/modelorm";
import { parseISO, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const topic = searchParams.get("topic");
    const topicType = searchParams.get("topicType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const platform = searchParams.get("platform");
    const sentiment = searchParams.get("sentiment");
    const relevance = searchParams.get("relevance");
    const hasCriticism = searchParams.get("hasCriticism");
    const search = searchParams.get("search");
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const postCategory = searchParams.get("postCategory");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 10;

    if (!businessId || !topic || !topicType) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
    }

    console.log('[getBusinessPostsByTopic] 请求参数:', {
      businessId, topic, topicType, startDate, endDate, platform, sentiment, relevance, hasCriticism, search, sortOrder, postCategory, page
    });

    // Build where clause
    let whereClause: any = {
      business_id: businessId,
      topic: topic,
      topic_type: topicType,
    };

    // Date range filter
    if (startDate && endDate) {
      whereClause.post_date = {
        [Op.gte]: startOfDay(parseISO(startDate)),
        [Op.lte]: endOfDay(parseISO(endDate)),
      };
    }

    // Platform filter
    if (platform) {
      whereClause.platform = platform;
    }

    // Sentiment filter
    if (sentiment) {
      whereClause.sentiment = sentiment;
    }

    // Relevance filter
    if (relevance) {
      whereClause.relevance = relevance;
    }

    // Criticism filter
    if (hasCriticism) {
      whereClause.criticism = hasCriticism === "true";
    }

    // Post category filter
    if (postCategory) {
      whereClause.post_category = postCategory;
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { content: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { author: { [Op.iLike]: `%${search}%` } },
      ];
    }

    console.log('[getBusinessPostsByTopic] SQL where条件:', whereClause);

    // Get total count
    const totalCount = await PostsModel.count({ where: whereClause });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / pageSize);
    const offset = (page - 1) * pageSize;

    // Get posts with pagination
    const posts = await PostsModel.findAll({
      where: whereClause,
      order: [['post_date', sortOrder.toUpperCase()]],
      limit: pageSize,
      offset: offset,
    });

    // Transform posts data
    const transformedPosts = posts.map((post: any) => ({
      id: post.get('post_id'),
      platform: post.get('platform'),
      content: post.get('content'),
      title: post.get('title'),
      author: post.get('author'),
      post_date: post.get('post_date'),
      sentiment: post.get('sentiment'),
      relevance: post.get('relevance'),
      criticism: post.get('criticism'),
      post_category: post.get('post_category'),
      topic: post.get('topic'),
      topic_type: post.get('topic_type'),
      url: post.get('url'),
      likes: post.get('likes'),
      comments: post.get('comments'),
      shares: post.get('shares'),
    }));

    // Build applied filters object
    const appliedFilters = {
      startDate: startDate || "",
      endDate: endDate || "",
      platform: platform || "",
      sentiment: sentiment || "",
      relevance: relevance || "",
      hasCriticism: hasCriticism || "",
      search: search || "",
      sortOrder: sortOrder || "desc",
      postCategory: postCategory || "",
    };

    // Build pagination object
    const pagination = {
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
    };

    console.log('[getBusinessPostsByTopic] 返回数据:', {
      postsCount: transformedPosts.length,
      totalCount,
      totalPages,
      currentPage: page,
      firstPost: transformedPosts[0],
    });

    return new Response(JSON.stringify({
      posts: transformedPosts,
      pagination,
      appliedFilters,
    }), { status: 200 });

  } catch (error) {
    console.error('[getBusinessPostsByTopic] Error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
} 