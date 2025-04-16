import { NextRequest, NextResponse } from 'next/server';
import { ClientModel } from '@/feature/sqlORM/modelorm';
import { BusinessModel } from '@/feature/sqlORM/modelorm';
import { ClientUsersModel } from '@/feature/sqlORM/modelorm';
import { Op } from 'sequelize';

interface Business {
  business_id: string;
  business_name: string;
  search_keywords: string[];
  business_city: string;
  business_type: string;
  similar_businesses: string[];
}

export async function GET(request: NextRequest) {
  // Extract email from query parameter, e.g. /api/client-details?email=user@example.com
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    // First, query the client_users table to find the user with the given email
    const userRecord = await ClientUsersModel.findOne({
      where: { registered_email: email },
      attributes: ['client_id'],
    });

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract client_id from the user record
    const clientId = userRecord.client_id;

    // Now query the clients table using the client_id
    const clientRecord = await ClientModel.findOne({
      where: { id: clientId },
      attributes: ['id', 'client_name', 'registered_email', 'business_mapping'],
    });
    
    if (!clientRecord) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    // Extract and normalize business_mapping from the found client.
    let businessIds: string[] = [];

    // First, check if business_mapping is already an array.
    if (Array.isArray(clientRecord.business_mapping)) {
      // If it's a nested array (e.g. string[][]), flatten it.
      if (clientRecord.business_mapping.length > 0 && Array.isArray(clientRecord.business_mapping[0])) {
        businessIds = clientRecord.business_mapping.flat();
      } else {
        businessIds = clientRecord.business_mapping as string[];
      }
    } else if (clientRecord.business_mapping) {
      // If business_mapping is not an array, try parsing it if it's a JSON string.
      try {
        const parsed = JSON.parse(clientRecord.business_mapping);
        if (Array.isArray(parsed)) {
          // If the parsed result is nested, flatten it.
          if (parsed.length > 0 && Array.isArray(parsed[0])) {
            businessIds = parsed.flat();
          } else {
            businessIds = parsed;
          }
        } else {
          businessIds = [parsed];
        }
      } catch (e) {
        // Fallback: wrap the value in an array if parsing fails.
        businessIds = [clientRecord.business_mapping];
      }
    }

    let businesses: Business[] = [];
    if (businessIds.length > 0) {
      // Query the business table for businesses matching the ids in business_mapping.
      const businessRecords = await BusinessModel.findAll({
        where: {
          business_id: { [Op.in]: businessIds },
        },
        attributes: [
          'business_id',
          'business_name',
          'search_keywords',
          'business_city',
          'business_type',
          'similar_businesses'
        ],
      });
      
      // Ensure businesses is always an array of properly structured business objects
      businesses = businessRecords.map((biz: any) => {
        const business = biz.toJSON();
        
        // Ensure search_keywords is an array
        if (!Array.isArray(business.search_keywords)) {
          business.search_keywords = business.search_keywords ? [business.search_keywords] : [];
        }
        
        // Ensure similar_businesses is an array
        if (!Array.isArray(business.similar_businesses)) {
          business.similar_businesses = business.similar_businesses ? [business.similar_businesses] : [];
        }
        
        return business;
      });
    }

    const responseData = {
      id: clientRecord.id,
      client_name: clientRecord.client_name,
      registered_email: clientRecord.registered_email,
      businesses: businesses, // This is now guaranteed to be an array
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}