import { NextRequest, NextResponse } from 'next/server';
import { ClientUsersModel, ActiveSessionsModel } from '@/feature/sqlORM/modelorm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  // parse JSON body (must always send { action, email? } on every call)
  let body: { action?: string; email?: string } = {};
  try {
    body = await request.json();
  } catch {
    // fall through if empty or invalid
  }
  const { action, email } = body;
  
  // Log the action but avoid logging 'unknown' which creates confusing logs
  if (action) {
    console.log(`[Session API] ${action} request${email ? ' for ' + email : ''}`);
  }

  // 1) "check" → doesn't need email - RETURN TO ORIGINAL IMPLEMENTATION
  if (action === 'check') {
    const cookieSession = request.cookies.get('session_id')?.value;
    if (!cookieSession) {
      console.log('[Session API] No session cookie found');
      return NextResponse.json({ success: true, active: false });
    }
    
    try {
      const existing = await ActiveSessionsModel.findOne({
        where: { session_id: cookieSession },
      });
      
      // Important: If session found, update last_active
      if (existing) {
        await existing.update({ last_active: new Date() });
      }
      
      return NextResponse.json({
        success: true,
        active: !!existing,
        sessionId: cookieSession,  // not used by client here, but handy if you want
      });
    } catch (error) {
      console.error('[Session API] Database error:', error);
      // Even on error, we don't want to force logout, so return active:true
      return NextResponse.json({ success: true, active: true });
    }
  }

  // 2) All other actions require an email
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // look up user
  const userRec = await ClientUsersModel.findOne({
    where: { registered_email: email },
    attributes: ['id'],
  });
  if (!userRec) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const userId = userRec.id;

  if (action === 'register') {
    try {
      // delete old sessions
      await ActiveSessionsModel.destroy({ where: { user_id: userId } });

      // insert new
      const newSessionId = uuidv4();
      await ActiveSessionsModel.create({
        user_id: userId,
        session_id: newSessionId,
        created_at: new Date(),
        last_active: new Date(),
        user_agent: request.headers.get('user-agent') || '',
        ip_address:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          '',
      });

      // set the cookie + return success
      const res = NextResponse.json({ success: true, sessionId: newSessionId });
      res.cookies.set({
        name: 'session_id',
        value: newSessionId,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
        sameSite: 'strict',
      });
      return res;
    } catch (error) {
      console.error('[Session API] Error registering session:', error);
      return NextResponse.json({ error: 'Failed to register session' }, { status: 500 });
    }
  }

  if (action === 'delete') {
    try {
      // remove all sessions for this user
      await ActiveSessionsModel.destroy({ where: { user_id: userId } });
      const res = NextResponse.json({ success: true });
      res.cookies.delete({ name: 'session_id', path: '/' });
      return res;
    } catch (error) {
      console.error('[Session API] Error deleting session:', error);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}