import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth, authError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const _auth = await checkApiAuth(request);
  if (!_auth) return authError();
  return NextResponse.json({ message: "Hello, world!" });
}