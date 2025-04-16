// /api/charts/hashtags/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';

const TopKHashtag = 6
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    
    if (!business_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: business_id, start_date, end_date" },
        { status: 400 }
      );
    }
    
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    
    // Query posts with english_tag_list for the given period
    const rows = await BusinessPostModel.findAll({
      attributes: ['english_tag_list'],
      where: {
        business_id,
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] }
      }
    });
    
    // Process all tags from all posts
    let allTags: string[] = [];
    
    rows.forEach(row => {
      const tagList = row.getDataValue("english_tag_list");
      
      // Check if tagList exists and is an array or can be converted to one
      if (tagList) {
        let tags: string[] = [];
        
        if (Array.isArray(tagList)) {
          tags = tagList;
        } else if (typeof tagList === 'string') {
          // Try to parse if it's a JSON string
          try {
            const parsed = JSON.parse(tagList);
            tags = Array.isArray(parsed) ? parsed : [];
          } catch {
            // If not JSON, split by comma (or other delimiter if needed)
            tags = tagList.split(',').map(tag => tag.trim());
          }
        }
        
        // Add valid tags to the combined list, preserving original format
        allTags = allTags.concat(
          tags.filter(tag => tag && typeof tag === 'string' && tag.trim() !== '')
              .map(tag => tag.trim())
        );
      }
    });
    
    // If no tags found, return an empty array
    if (allTags.length === 0) {
      return NextResponse.json([]);
    }
    
    // Initial counting of raw tags
    const rawCounts: Record<string, number> = {};
    allTags.forEach(tag => {
      rawCounts[tag] = (rawCounts[tag] || 0) + 1;
    });
    
    // Process the tags to handle different prefixes
    // Group tags that are the same word but with different # prefixes
    const consolidatedCounts: Record<string, { count: number, displayTag: string }> = {};
    
    Object.entries(rawCounts).forEach(([tag, count]) => {
      // Normalize the tag for comparison (lowercase, remove all # prefixes)
      let normalizedTag = tag.toLowerCase();
      while (normalizedTag.startsWith('#')) {
        normalizedTag = normalizedTag.substring(1);
      }
      
      // Skip empty tags after normalization
      if (normalizedTag === '') return;
      
      // Check if this normalized tag already exists in our consolidated counts
      if (consolidatedCounts[normalizedTag]) {
        // Add the count to the existing entry
        consolidatedCounts[normalizedTag].count += count;
        
        // If the current tag has more # prefixes, keep it as the display tag
        if ((tag.match(/^#+/) || [''])[0].length > 
            (consolidatedCounts[normalizedTag].displayTag.match(/^#+/) || [''])[0].length) {
          consolidatedCounts[normalizedTag].displayTag = tag;
        }
      } else {
        // Create a new entry
        consolidatedCounts[normalizedTag] = {
          count: count,
          displayTag: tag
        };
      }
    });
    
    // Convert consolidated counts to array and sort by frequency
    const sortedTags = Object.entries(consolidatedCounts)
      .sort(([, dataA], [, dataB]) => dataB.count - dataA.count)
      .slice(0, TopKHashtag); // Take top 10
    
    // Calculate total count after consolidation
    const totalCount = sortedTags.reduce((sum, [, data]) => sum + data.count, 0);
    
    // Prepare the final result
    const result = sortedTags.map(([normalizedTag, data]) => ({
      tag: data.displayTag, // Use the display tag with original format
      count: data.count,
      percentage: parseFloat(((data.count / totalCount) * 100).toFixed(1))
    }));
    
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}