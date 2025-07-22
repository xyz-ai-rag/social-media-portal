import { NextRequest } from "next/server";
import { fn, col, literal, where, Op } from "sequelize";
import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
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

    // 首先根据话题名称查找对应的 business_id
    let actualBusinessId = businessId;

    // 如果传入的 businessId 是硬编码的，则根据话题查找实际的 businessId
    if (businessId === "f8e7d6c5-b4a3-2f1e-0d9c-8b7a6f5e4d3c" || businessId === "a7b6c5d4-e3f2-1a0b-9c8d-7e6f5a4b3c2d") {
      const topicBusiness = await BusinessPostModel.findOne({
        where: {
          [Op.or]: [
            { post_topic: topic },
            { topic: topic }
          ]
        },
        attributes: ['business_id'],
        raw: true,
      });

      if (topicBusiness) {
        actualBusinessId = topicBusiness.business_id;
        console.log('[getBusinessPostsByTopic] 找到话题对应的 businessId:', { topic, actualBusinessId });
      } else {
        console.log('[getBusinessPostsByTopic] 未找到话题对应的 businessId:', { topic });
      }
    }

    // Build where clause - 只按 business_id 查询，不按话题过滤
    let whereClause: any = {
      business_id: actualBusinessId,
    };

    // 暂时不按 topic_type 过滤，因为可能字段为空
    // 如果需要按 topic_type 过滤，可以后续添加

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
        { english_desc: { [Op.iLike]: `%${search}%` } },
        { english_title: { [Op.iLike]: `%${search}%` } },
        { nickname: { [Op.iLike]: `%${search}%` } },
      ];
    }

    console.log('[getBusinessPostsByTopic] SQL where条件:', whereClause);

    // 检查数据库中是否有匹配的数据
    const sampleData = await BusinessPostModel.findOne({
      where: whereClause,
      attributes: ['note_id', 'business_id', 'post_topic', 'topic_type', 'description'],
      raw: true,
    });
    console.log('[getBusinessPostsByTopic] 样本数据:', sampleData);

    // Get total count
    const totalCount = await BusinessPostModel.count({ where: whereClause });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / pageSize);
    const offset = (page - 1) * pageSize;

    // Get posts with pagination
    const posts = await BusinessPostModel.findAll({
      where: whereClause,
      order: [['create_time', sortOrder.toUpperCase()]],
      limit: pageSize,
      offset: offset,
    });

    // Transform posts data - 简化版本，只包含基本字段
    const transformedPosts = posts.map((post: any) => {
      console.log('[getBusinessPostsByTopic] 原始帖子数据:', post.toJSON());
      
      return {
        id: post.get('note_id'),
        platform: post.get('platform'),
        post: post.get('english_desc') || post.get('description') || 'No content',
        title: post.get('english_title') || post.get('title') || 'No title',
        nickname: post.get('nickname') || 'Unknown',
        showDate: post.get('create_time'),
        sentiment: post.get('english_sentiment') || 'neutral',
        relvance: post.get('relevance_percentage') || 0,
        criticism: post.get('has_negative_or_criticism') || false,
        postCategory: post.get('post_category') || '',
        topic: post.get('post_topic') || '',
        topic_type: post.get('topic_type') || '',
        url: post.get('note_url') || '',
        likes: post.get('liked_count') || 0,
        comments: post.get('comment_count') || 0,
        shares: post.get('share_count') || 0,
      };
    });

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