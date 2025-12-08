const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://courseforge.app',
  'https://www.courseforge.app',
  'https://manager.courseforge.app',
];

export function getCorsHeaders(origin: string | null): HeadersInit {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": "true",
  };
}

const rateLimiter = new Map<string, number[]>();

export function isRateLimited(key: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(key) || [];
  const recentRequests = requests.filter(t => now - t < windowMs);

  if (recentRequests.length >= maxRequests) {
    return true;
  }

  rateLimiter.set(key, [...recentRequests, now]);
  return false;
}

function cleanupRateLimiter() {
  const now = Date.now();
  for (const [key, requests] of rateLimiter.entries()) {
    const recentRequests = requests.filter(t => now - t < 60000);
    if (recentRequests.length === 0) {
      rateLimiter.delete(key);
    } else {
      rateLimiter.set(key, recentRequests);
    }
  }
}

setInterval(cleanupRateLimiter, 60000);

export async function verifyAuthentication(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

export async function verifyCourseOwnership(
  supabase: any,
  courseId: string,
  userId: string
): Promise<boolean> {
  const { data: course, error } = await supabase
    .from('courses')
    .select('user_id')
    .eq('id', courseId)
    .maybeSingle();

  if (error || !course) {
    return false;
  }

  return course.user_id === userId;
}

export async function verifyManagerRole(supabase: any, userId: string): Promise<boolean> {
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  return roleData?.role === 'admin' || roleData?.role === 'manager';
}

export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateCourseRequest(data: any): { valid: boolean; error?: string } {
  if (!data.courseId || typeof data.courseId !== 'string') {
    return { valid: false, error: 'Invalid or missing courseId' };
  }

  if (!validateUUID(data.courseId)) {
    return { valid: false, error: 'courseId must be a valid UUID' };
  }

  if (!data.subject || typeof data.subject !== 'string' || data.subject.length > 200) {
    return { valid: false, error: 'Invalid subject (max 200 characters)' };
  }

  if (!data.audience || typeof data.audience !== 'string' || data.audience.length > 500) {
    return { valid: false, error: 'Invalid audience (max 500 characters)' };
  }

  const validDifficulties = ['beginner', 'intermediate', 'advanced'];
  if (!data.difficulty || !validDifficulties.includes(data.difficulty)) {
    return { valid: false, error: 'Invalid difficulty level' };
  }

  const validDurations = ['30-mins', '1-hour', '2-hours', '3-hours', '4-hours'];
  if (!data.duration || !validDurations.includes(data.duration)) {
    return { valid: false, error: 'Invalid duration' };
  }

  if (data.objectives && (typeof data.objectives !== 'string' || data.objectives.length > 2000)) {
    return { valid: false, error: 'Invalid objectives (max 2000 characters)' };
  }

  if (data.uploadedFileContents) {
    if (!Array.isArray(data.uploadedFileContents)) {
      return { valid: false, error: 'uploadedFileContents must be an array' };
    }

    if (data.uploadedFileContents.length > 10) {
      return { valid: false, error: 'Maximum 10 files allowed' };
    }

    const totalSize = data.uploadedFileContents.reduce((sum: number, content: any) =>
      sum + (typeof content === 'string' ? content.length : 0), 0
    );

    if (totalSize > 500000) {
      return { valid: false, error: 'Total file content exceeds 500KB limit' };
    }
  }

  return { valid: true };
}

export async function logSecurityEvent(
  supabase: any,
  eventType: string,
  result: 'success' | 'failure',
  resourceType?: string,
  resourceId?: string,
  details?: any
) {
  try {
    await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_resource_type: resourceType || null,
      p_resource_id: resourceId || null,
      p_action: eventType,
      p_result: result,
      p_details: details || {}
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}
