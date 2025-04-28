// File: app/api/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ClientUsersModel, ActiveSessionsModel } from '@/feature/sqlORM/modelorm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, action, sessionId, browser_id } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get user record from client_users table using email
    const userRecord = await ClientUsersModel.findOne({
      where: { registered_email: email },
      attributes: ['id', 'client_id'],
    });

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use the user's ID for session operations
    const userId = userRecord.id;
    const browserIdToUse = browser_id || 'default-browser';

    // Handle different session actions
    switch (action) {
      case 'register':
        // Create a new session ID
        const newSessionId = uuidv4();
        
        console.log('Processing session for user:', userId, 'browser:', browserIdToUse);
        
        try {
          // Check if user already has a session
          const existingSession = await ActiveSessionsModel.findOne({
            where: { user_id: userId }
          });
          
          if (existingSession) {
            // Update the existing session with new session ID
            console.log('Updating existing session for user:', userId);
            await existingSession.update({
              session_id: newSessionId,
              browser_id: browserIdToUse,
              last_active: new Date(),
              user_agent: request.headers.get('user-agent') || '',
              ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
            });
          } else {
            // Create a new session
            console.log('Creating new session for user:', userId);
            await ActiveSessionsModel.create({
              user_id: userId,
              session_id: newSessionId,
              browser_id: browserIdToUse,
              created_at: new Date(),
              last_active: new Date(),
              user_agent: request.headers.get('user-agent') || '',
              ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
            });
          }
          
          return NextResponse.json({ success: true, sessionId: newSessionId });
        } catch (error: any) {
          console.error('Error registering session:', error);
          
          // If there's a constraint violation, try to handle it gracefully
          if (error.code === '23505') { // PostgreSQL unique constraint violation
            // Try to find the existing session again
            const retrySession = await ActiveSessionsModel.findOne({
              where: { user_id: userId }
            });
            
            if (retrySession) {
              // Update with a new session ID
              const retrySessionId = uuidv4();
              await retrySession.update({ 
                session_id: retrySessionId,
                browser_id: browserIdToUse 
              });
              return NextResponse.json({ success: true, sessionId: retrySessionId });
            }
          }
          
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
      case 'check':
        if (!sessionId) {
          return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }
        
        // Check if session exists and is active
        const session = await ActiveSessionsModel.findOne({
          where: {
            user_id: userId
          }
        });
        
        // Session is active only if it exists and matches the requested sessionId
        const isActive = !!session && session.session_id === sessionId;
        
        console.log('Session check:', {
          userId,
          requestedSessionId: sessionId,
          currentSessionId: session ? session.session_id : null,
          isActive
        });
        
        return NextResponse.json({ 
          active: isActive,
          success: true
        });
        
      case 'update':
        if (!sessionId) {
          return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }
        
        // Update last_active timestamp
        const updateResult = await ActiveSessionsModel.update(
          { last_active: new Date() },
          { 
            where: {
              user_id: userId,
              session_id: sessionId
            }
          }
        );
        
        return NextResponse.json({ success: updateResult[0] > 0 });
        
      case 'delete':
        // Delete the session
        await ActiveSessionsModel.destroy({
          where: {
            user_id: userId
          }
        });
        
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Session API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}