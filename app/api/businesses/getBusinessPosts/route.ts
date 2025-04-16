import { BusinessPostModel } from "@/feature/sqlORM/modelorm";
import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';

/**
 * API endpoint to get business posts with filtering
 * GET /api/businesses/getBusinessPosts?businessId=xxx&startDate=xxx&endDate=xxx&platform=xxx&sentiment=xxx&relevance=xxx&hasCriticism=xxx&search=xxx
 * 
 * Default behavior: Shows posts from the last 7 days, excluding today
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Required parameter
    const businessId = searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
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
    const defaultEndDate = formatDateForQuery(yesterday); // Default end date is yesterday, not today

    // Optional filter parameters with defaults
    const startDate = searchParams.get('startDate') || defaultStartDate;
    const endDateParam = searchParams.get('endDate');
    
    // If end date includes today or is after today, adjust it to yesterday
    let endDate = endDateParam || defaultEndDate;
    const endDateObj = new Date(endDate);
    endDateObj.setHours(0, 0, 0, 0);
    
    if (endDateObj >= today) {
      endDate = formatDateForQuery(yesterday);
    }
    
    const platform = searchParams.get('platform') || '';
    const sentiment = searchParams.get('sentiment') || '';
    const relevance = searchParams.get('relevance') || '';
    const hasCriticism = searchParams.get('hasCriticism') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase();

    // Build query conditions. Note the description filter preserves extra white spaces.
    const whereConditions: any = {
      business_id: businessId,
      is_relevant: true,
      description: {
        [Op.ne]: 'nan'
      }
    };

    // Apply date range filter (default: last 7 days, excluding today)
    const startDateTime = `${startDate} 0:00:00`;
    const endDateTime = `${endDate} 23:59:59`;
    
    whereConditions.last_update_time = {
      [Op.between]: [new Date(startDateTime), new Date(endDateTime)]
    };

    // Apply platform filter if provided with mapping
    if (platform) {
      let dbPlatform;
      switch (platform) {
        case 'Rednote':
          dbPlatform = 'xhs';
          break;
        case 'Weibo':
          dbPlatform = 'wb';
          break;
        case 'Douyin':
          dbPlatform = 'dy';
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
      const relevanceValue = parseInt(relevance.replace('%', ''));
      if (relevance.includes('<')) {
        whereConditions.relevance_percentage = {
          [Op.lt]: relevanceValue
        };
      } else {
        whereConditions.relevance_percentage = {
          [Op.gte]: relevanceValue
        };
      }
    }

    // Apply criticism filter if provided
    if (hasCriticism) {
      const criticismValue = hasCriticism === 'true' || hasCriticism === 'Has Criticism';
      whereConditions.has_negative_or_criticism = criticismValue;
    }

    // Apply search filter if provided
    if (search) {
      whereConditions[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { english_desc: { [Op.like]: `%${search}%` } },
        { title: { [Op.like]: `%${search}%` } },
        { english_title: { [Op.like]: `%${search}%` } },
        { tag_list: { [Op.like]: `%${search}%` } },
        { english_tag_list: { [Op.like]: `%${search}%` } },
        { nickname: { [Op.like]: `%${search}%` } }
      ];
    }

    const totalCount = await BusinessPostModel.count({
      where: whereConditions
    });

    const totalPages = Math.ceil(totalCount / pageSize);
    const adjustedPage = page > totalPages && totalPages > 0 ? totalPages : page;
    const offset = (adjustedPage - 1) * pageSize;

    const { rows } = await BusinessPostModel.findAndCountAll({
      where: whereConditions,
      attributes: [
        'business_id',
        'note_id',
        'description',
        'title',
        'english_desc',
        'english_title',
        'tag_list',
        'english_tag_list',
        'last_update_time',
        'english_sentiment',
        'nickname',
        'relevance_percentage',
        'platform',
        'has_negative_or_criticism',
        'note_url'
      ],
      order: [['last_update_time', sortOrder === 'asc' ? 'ASC' : 'DESC']],
      limit: pageSize,
      offset: offset
    });

    const posts = rows.map(post => {
      const postData = post.get({ plain: true });
      
      let displayPlatform;
      switch (postData.platform) {
        case 'xhs':
          displayPlatform = 'Rednote';
          break;
        case 'wb':
          displayPlatform = 'Weibo';
          break;
        case 'dy':
          displayPlatform = 'Douyin';
          break;
        default:
          displayPlatform = postData.platform;
      }
      
      return {
        id: postData.note_id,
        businessId: postData.business_id,
        description: postData.description,         // Original description (preserving white spaces)
        englishDesc: postData.english_desc,         // English description
        post: postData.english_desc || postData.description,
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
        url: postData.note_url
      };
    });

    return NextResponse.json({
      posts,
      pagination: {
        totalCount,
        totalPages,
        currentPage: adjustedPage,
        pageSize
      },
      appliedFilters: {
        startDate,
        endDate,
        platform,
        sentiment,
        relevance,
        hasCriticism,
        search,
        sortOrder
      }
    });
  } catch (error: any) {
    console.error("Error fetching business posts:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch business posts", details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to format date for query (YYYY-MM-DD)
function formatDateForQuery(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper function to format date for display
function formatDisplayDate(date: Date): string {
  const d = new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  
  return `${month} ${day} - ${formattedHours}:${minutes}${ampm}`;
}
