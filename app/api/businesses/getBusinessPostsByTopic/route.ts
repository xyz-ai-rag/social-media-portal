import { NextRequest } from "next/server";
import { fn, col, literal, where, Op } from "sequelize";
import { BusinessPostModel, CityTopicsModel } from "@/feature/sqlORM/modelorm";
import { parseISO, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = "f8e7d6c5-b4a3-2f1e-0d9c-8b7a6f5e4d3c"; // 使用硬编码的 businessId，与 getCriticismTrend 保持一致
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

    // 检查该 businessId 在 city_topics 表中是否有数据
    const totalCityTopics = await CityTopicsModel.count({
      where: {
        business_id: businessId,
      },
    });
    console.log('[getBusinessPostsByTopic] 该 businessId 在 city_topics 表中的总记录数:', totalCityTopics);

    // 根据话题名称和类型查找对应的 note_ids
    let noteIds: string[] = [];
    
    try {
      // 从 city_topics 表中查找匹配的 note_ids，使用 DISTINCT 去重
      const cityTopics = await CityTopicsModel.findAll({
        where: {
          topic: topic,
          topic_type: topicType === 'City_Criticisms' || topicType === 'Criticisms' ? 'Criticism' : topicType,
          business_id: businessId
        },
        attributes: [
          [fn('DISTINCT', col('note_id')), 'note_id']
        ],
        raw: true,
      });

      // 提取去重后的 note_ids
      noteIds = cityTopics.map((ct: any) => ct.note_id);
      console.log('[getBusinessPostsByTopic] 查找条件:', {
        topic,
        topic_type: topicType === 'City_Criticisms' || topicType === 'Criticisms' ? 'Criticism' : topicType,
        business_id: businessId
      });
      console.log('[getBusinessPostsByTopic] 找到的 note_ids:', noteIds);
      console.log('[getBusinessPostsByTopic] city_topics 原始数据:', cityTopics);

      // 如果没有找到数据，尝试查看数据库中有什么数据
      if (cityTopics.length === 0) {
        console.log('[getBusinessPostsByTopic] 没有找到数据，尝试查看数据库中的样本数据...');
        const sampleCityTopics = await CityTopicsModel.findAll({
          where: {
            business_id: businessId
          },
          attributes: ['topic', 'topic_type', 'note_id'],
          limit: 5,
          raw: true,
        });
        console.log('[getBusinessPostsByTopic] 该 business_id 的样本数据:', sampleCityTopics);
      }
    } catch (error) {
      console.error('[getBusinessPostsByTopic] 查找 city_topics 失败:', error);
    }

    // Build where clause - 按 note_ids 查询
    let whereClause: any = {};
    
    if (noteIds.length > 0) {
      whereClause.note_id = {
        [Op.in]: noteIds
      };
    } else {
      // 如果没有找到 note_ids，返回空结果
      console.log('[getBusinessPostsByTopic] 没有找到匹配的 note_ids，返回空结果');
      return new Response(JSON.stringify({
        posts: [],
        pagination: {
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          pageSize,
        },
        appliedFilters: {
          startDate: startDate || "",
          endDate: endDate || "",
          platform: platform || "",
          sentiment: sentiment || "",
          relevance: relevance || "",
          hasCriticism: hasCriticism || "",
          search: search || "",
          sortOrder: sortOrder || "desc",
          postCategory: postCategory || "",
        },
      }), { status: 200 });
    }

    // 暂时不按 topic_type 过滤，因为可能字段为空
    // 如果需要按 topic_type 过滤，可以后续添加

    // Date range filter
    if (startDate && endDate) {
      whereClause.create_time = {
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
      whereClause.english_sentiment = sentiment;
    }

    // Relevance filter
    if (relevance) {
      whereClause.relevance_percentage = relevance;
    }

    // Criticism filter
    if (hasCriticism) {
      whereClause.has_negative_or_criticism = hasCriticism === "true";
    }

    // Post category filter
    if (postCategory) {
      whereClause.post_category = postCategory;
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { english_desc: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { english_title: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { nickname: { [Op.iLike]: `%${search}%` } },
      ];
    }

    console.log('[getBusinessPostsByTopic] SQL where条件:', whereClause);

    // 检查数据库中是否有匹配的数据
    const sampleData = await BusinessPostModel.findOne({
      where: whereClause,
      attributes: ['note_id', 'business_id', 'description'],
      raw: true,
    });
    console.log('[getBusinessPostsByTopic] 样本数据:', sampleData);

    // Get total count
    const totalCount = await BusinessPostModel.count({ where: whereClause });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / pageSize);
    const offset = (page - 1) * pageSize;

    // Get posts with pagination, using DISTINCT to avoid duplicates
    const posts = await BusinessPostModel.findAll({
      where: whereClause,
      attributes: [
        [fn('DISTINCT', col('note_id')), 'note_id'],
        "business_id",
        "description",
        "title",
        "english_desc",
        "english_preview_text",
        "english_title",
        "tag_list",
        "english_tag_list",
        "create_time",
        "english_sentiment",
        "nickname",
        "relevance_percentage",
        "platform",
        "has_negative_or_criticism",
        "negative_feedback_summary",
        "note_url",
        "post_category",
        "liked_count",
        "comment_count",
        "share_count",
      ],
      order: [['create_time', sortOrder.toUpperCase()]],
      limit: pageSize,
      offset: offset,
    });

    // Transform posts data - 与 getBusinessPosts 保持一致
    const transformedPosts = posts.map((post: any) => {
      const postData = post.get({ plain: true });
      console.log('[getBusinessPostsByTopic] 原始帖子数据:', postData);
      
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
        post: postData.english_preview_text || postData.english_desc || postData.description || 'No content',
        title: postData.title,
        englishTitle: postData.english_title,
        displayTitle: postData.english_title || postData.title || 'No title',
        tagList: postData.tag_list,
        englishTagList: postData.english_tag_list,
        taglist: postData.english_tag_list || postData.tag_list,
        date: postData.create_time,
        showDate: postData.create_time ? new Date(postData.create_time).toLocaleString() : 'Unknown date',
        sentiment: postData.english_sentiment || 'Not specified',
        nickname: postData.nickname || 'Anonymous',
        relvance: postData.relevance_percentage ? `${postData.relevance_percentage}%` : '0%',
        platform: displayPlatform,
        hasCriticism: postData.has_negative_or_criticism || false,
        criticismSummary: postData.negative_feedback_summary,
        url: postData.note_url,
        postCategory: postData.post_category || 'Null',
        likes: postData.liked_count || 0,
        comments: postData.comment_count || 0,
        shares: postData.share_count || 0,
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
      samplePostFields: transformedPosts[0] ? {
        id: transformedPosts[0].id,
        post: transformedPosts[0].post,
        title: transformedPosts[0].title,
        platform: transformedPosts[0].platform,
        nickname: transformedPosts[0].nickname,
        showDate: transformedPosts[0].showDate,
        sentiment: transformedPosts[0].sentiment,
        relvance: transformedPosts[0].relvance,
      } : null,
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