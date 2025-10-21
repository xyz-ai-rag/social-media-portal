// app/api/businesses/credit-cards/getRadarChartData/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Op } from "sequelize";
import { BusinessTopicsModel, BusinessPostModel } from "@/feature/sqlORM/modelorm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const comparison_business_id = searchParams.get("comparison_business_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const language = searchParams.get("language") || 'en';
    const platform = searchParams.get("platform");

    if (!business_id || !start_date || !end_date) {
      return NextResponse.json(
        {
          error: "Missing required parameters: business_id, start_date, end_date",
        },
        { status: 400 }
      );
    }

    const startDateTime = new Date(start_date);
    const endDateTime = new Date(end_date);
    console.log("radar charts checking parameters",startDateTime,endDateTime,platform)
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json(
        { 
          error: "Invalid date format. Expected ISO 8601 format.",
          received: { start_date, end_date }
        },
        { status: 400 }
      );
    }

    console.log(
      `[Radar Chart] Query params: business_id=${business_id}, comparison=${comparison_business_id || 'none'}, dates=${startDateTime.toISOString()} to ${endDateTime.toISOString()}`
    );

    // Define category mappings
    const overallTopicsMapping = {
      'Overall Brand Image': ['Overall Brand and Card Image'],
      'Rewards and Benefits': ['Benefits', 'Rewards Structure', 'Welcome Offer'],
      'User Experience': ['User Experience', 'Customer Service'],
      'Competitor Benchmarking': ['Competitor Benchmarking'],
      'Technology & Security': ['Mobile App and Online Banking Website', 'Security and Fraud', 'Digital Wallet Integration'],
      'Others': ['Student Use', 'Card Cancellation', 'Annual Fee', 'Value Depreciation', 'Hidden Complexity', 'Bait-and-Switch']
    };

    const cardAttributesMapping = {
      'Rewards Structure': ['Rewards Structure'],
      'Benefits': ['Benefits'],
      'Welcome Offer': ['Welcome Offer']
    };

    const spendingScenariosMapping = {
      'Online': ['Spending Scenarios: Online Shopping'],
      'Overseas and Travel': ['Spending Scenario: Travel and Overseas Spending'],
      'Dining': ['Spending Scenario: Local Dining'],
      'Entertainment': ['Spending Scenario: Entertainment & Leisure'],
      'Others': [
        'Spending Scenario: Groceries and Supermarkets',
        'Spending Scenario: Transportation & Fuel',
        'Spending Scenario: Bills & Recurring Payments',
        'Spending Scenario: Health & Wellness',
        'Spending Scenario: Education'
      ]
    };

    // Helper function to get category data
    const getCategoryData = async (businessId: string, categoryMapping: any) => {
      const results = [];
      
      for (const [categoryName, topics] of Object.entries(categoryMapping)) {
        // Build where condition
        const whereCondition: any = {
          business_id: businessId,
          topic: {
            [Op.in]: topics as string[]
          }
        };

        // Get note_ids that match the date and platform criteria
        const validNoteIds = await BusinessPostModel.findAll({
          where: {
            business_id: businessId,
            platform: platform || { [Op.ne]: null },
            last_update_time: {
              [Op.between]: [startDateTime, endDateTime]
            }
          },
          attributes: ['note_id'],
          raw: true
        });

        const noteIdList = validNoteIds.map((n: any) => n.note_id);

        if (noteIdList.length > 0) {
          whereCondition.note_id = {
            [Op.in]: noteIdList
          };
        }

        const count = await BusinessTopicsModel.count({
          where: whereCondition
        });

        results.push({
          category: categoryName,
          count: count
        });
      }

      return results;
    };

    // Fetch data for primary business
    const [overallTopics, cardAttributes, spendingScenarios] = await Promise.all([
      getCategoryData(business_id, overallTopicsMapping),
      getCategoryData(business_id, cardAttributesMapping),
      getCategoryData(business_id, spendingScenariosMapping)
    ]);

    const response: any = {
      primary: {
        business_id,
        overallTopics,
        cardAttributes,
        spendingScenarios
      }
    };
    console.log("feching response of query",response.primary)
    // Fetch comparison data if requested
    if (comparison_business_id) {
      const [compOverallTopics, compCardAttributes, compSpendingScenarios] = await Promise.all([
        getCategoryData(comparison_business_id, overallTopicsMapping),
        getCategoryData(comparison_business_id, cardAttributesMapping),
        getCategoryData(comparison_business_id, spendingScenariosMapping)
      ]);

      response.comparison = {
        business_id: comparison_business_id,
        overallTopics: compOverallTopics,
        cardAttributes: compCardAttributes,
        spendingScenarios: compSpendingScenarios
      };
    }

    console.log(`[Radar Chart] Returning data for ${comparison_business_id ? '2' : '1'} businesses`);

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[Radar Chart] Error:", err);
    return NextResponse.json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}