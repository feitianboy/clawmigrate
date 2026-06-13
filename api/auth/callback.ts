import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ ok: false, error: 'No code provided' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ ok: false, error: 'GitHub OAuth not configured' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub token error:', tokenData.error);
      return res.status(400).json({ ok: false, error: tokenData.error_description || 'Failed to get access token' });
    }

    const accessToken = tokenData.access_token;

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const githubUser = await userResponse.json();

    // Get user emails from GitHub
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const emails = await emailsResponse.json();
    const primaryEmail = emails.find((e: { primary: boolean; email: string }) => e.primary)?.email || emails[0]?.email;

    // Find or create user
    const githubId = String(githubUser.id);
    let user;

    // Check if user exists with this GitHub ID
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('username', githubUser.login)
      .single();

    if (existingUser) {
      user = existingUser;
    } else {
      // Create new user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          username: githubUser.login,
          email: primaryEmail || `${githubUser.login}@github.local`,
          password_hash: '',
          role: 'user',
          phone: githubId
        })
        .select()
        .single();

      if (error || !newUser) {
        console.error('Create GitHub user error:', error);
        return res.status(500).json({ ok: false, error: 'Failed to create user' });
      }

      user = newUser;
    }

    await logActivity(user.id, 'github_login', { username: user.username }, req.headers['x-forwarded-for'] || req.ip);

    const secret = process.env.JWT_SECRET || 'default_secret';
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${token}`;

    return res.redirect(302, redirectUrl);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
