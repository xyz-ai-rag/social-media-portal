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

  // 1) “check” → doesn’t need email
  if (action === 'check') {
    const cookieSession = request.cookies.get('session_id')?.value;
    if (!cookieSession) {
      return NextResponse.json({ success: true, active: false });
    }
    const existing = await ActiveSessionsModel.findOne({
      where: { session_id: cookieSession },
    });
    return NextResponse.json({
      success: true,
      active:  !!existing,
      sessionId: cookieSession,  // not used by client here, but handy if you want
    });
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
    // delete old sessions
    await ActiveSessionsModel.destroy({ where: { user_id: userId } });

    // insert new
    const newSessionId = uuidv4();
    await ActiveSessionsModel.create({
      user_id:    userId,
      session_id: newSessionId,
      created_at: new Date(),
      last_active:new Date(),
      user_agent: request.headers.get('user-agent') || '',
      ip_address:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        '',
    });

    // set the cookie + return success
    const res = NextResponse.json({ success: true, sessionId: newSessionId });
    res.cookies.set({
      name:     'session_id',
      value:    newSessionId,
      httpOnly: true,
      path:     '/',
      maxAge:   60 * 60 * 24 * 7, // 7 days
      sameSite: 'strict',
    });
    return res;
  }

  if (action === 'delete') {
    // remove all sessions for this user
    await ActiveSessionsModel.destroy({ where: { user_id: userId } });
    const res = NextResponse.json({ success: true });
    res.cookies.delete({ name: 'session_id', path: '/' });
    return res;
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
