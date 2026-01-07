// Reverted to permissive CORS for development
// This was changed during security audit but broke cloud IDE environments
export function getCorsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": "true",
  };
}

const rateLimiter = new Map<string, number[]>();

export function isRateLimited(key: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimiter.get(key) || [];
  
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
  
  if (validTimestamps.length >= maxRequests) {
    return true;
  }
  
  validTimestamps.push(now);
  rateLimiter.set(key, validTimestamps);
  
  return false;
}

export async function verifyAuthentication(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '');
    
    const payload = parseJWT(token);
    if (!payload || !payload.sub) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload.sub;
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return null;
  }
}

function parseJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

export async function verifyCourseOwnership(supabase: any, courseId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('user_id')
      .eq('id', courseId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return data.user_id === userId;
  } catch (error) {
    console.error('Course ownership verification failed:', error);
    return false;
  }
}

export function validateCourseRequest(request: any): { valid: boolean; error?: string } {
  if (!request.courseId || typeof request.courseId !== 'string') {
    return { valid: false, error: 'Invalid or missing courseId' };
  }

  if (!request.subject || typeof request.subject !== 'string' || request.subject.length < 3) {
    return { valid: false, error: 'Subject must be at least 3 characters long' };
  }

  if (!request.audience || typeof request.audience !== 'string') {
    return { valid: false, error: 'Audience is required' };
  }

  if (!request.difficulty || typeof request.difficulty !== 'string') {
    return { valid: false, error: 'Difficulty level is required' };
  }

  if (!request.duration || typeof request.duration !== 'string') {
    return { valid: false, error: 'Duration is required' };
  }

  const maxSubjectLength = 200;
  if (request.subject.length > maxSubjectLength) {
    return { valid: false, error: `Subject must be ${maxSubjectLength} characters or less` };
  }

  if (request.objectives && typeof request.objectives === 'string' && request.objectives.length > 1000) {
    return { valid: false, error: 'Objectives must be 1000 characters or less' };
  }

  return { valid: true };
}

export async function logSecurityEvent(
  supabase: any,
  eventType: string,
  status: 'success' | 'failure',
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    console.log(`Security Event: ${eventType} - ${status}`, {
      resource_type: resourceType,
      resource_id: resourceId,
      metadata
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}