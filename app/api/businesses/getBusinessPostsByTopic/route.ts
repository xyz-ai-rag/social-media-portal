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



    } catch (error) {
      console.error('[getBusinessPostsByTopic] 查找 city_topics 失败:', error);
    }

    // Build where clause - 按 note_ids 和 business_id 查询
    let whereClause: any = {
      business_id: businessId // 确保只查询特定 business_id 的数据
    };
    
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





    // 检查数据库中是否有匹配的数据
    const sampleData = await BusinessPostModel.findOne({
      where: whereClause,
      attributes: ['note_id', 'business_id', 'description'],
      raw: true,
    });


    // Calculate pagination
    const offset = (page - 1) * pageSize;

    // 先获取所有匹配的帖子数据
    const allPosts = await BusinessPostModel.findAll({
      where: whereClause,
      attributes: [
        "note_id",
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
      raw: true,
    });

    // 去重：保留每个 note_id 的第一条记录
    const uniquePostsMap = new Map();
    allPosts.forEach(post => {
      if (!uniquePostsMap.has(post.note_id)) {
        uniquePostsMap.set(post.note_id, post);
      }
    });

    const uniquePosts = Array.from(uniquePostsMap.values());
    const totalCount = uniquePosts.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    // 计算当前页的数据
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const posts = uniquePosts.slice(startIndex, endIndex);


    
    // 调试 Business Travel 的情况
    if (topic === 'Business Travel') {
      console.log('[getBusinessPostsByTopic] Business Travel - 总帖子:', allPosts.length);
      console.log('[getBusinessPostsByTopic] Business Travel - note_ids:', allPosts.map(post => post.note_id));
      console.log('[getBusinessPostsByTopic] Business Travel - 去重后note_ids:', uniquePosts.map(post => post.note_id));
    }

    // Transform posts data - 与 getBusinessPosts 保持一致
    const transformedPosts = posts.map((post: any) => {
      const postData = post; // 已经是普通对象，不需要 .get()

      
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